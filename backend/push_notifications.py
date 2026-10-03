"""Durable organization notifications and Web Push delivery, independent of SSE."""
import asyncio
import base64
import hashlib
import ipaddress
import json
import logging
import os
import socket
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

import requests
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from pywebpush import WebPushException, webpush

logger = logging.getLogger(__name__)
ORG_EVENTS = {'org_application', 'org_approved', 'org_rejected', 'org_invite'}


class PushKeys(BaseModel):
    p256dh: str = Field(max_length=100)
    auth: str = Field(max_length=30)

    @field_validator('p256dh', 'auth')
    @classmethod
    def validate_key(cls, value, info):
        try:
            raw = base64.b64decode(value + '=' * (-len(value) % 4), altchars=b'-_', validate=True)
            if info.field_name == 'auth':
                if len(raw) != 16:
                    raise ValueError('Invalid auth key')
            else:
                ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), raw)
        except Exception as exc:
            raise ValueError('Invalid push encryption key') from exc
        return value


class Endpoint(BaseModel):
    endpoint: str = Field(min_length=10, max_length=2048)


class Subscription(Endpoint):
    keys: PushKeys


class InboxEvent(BaseModel):
    id: str
    type: str
    title: str
    message: str
    link: str
    org_id: str | None = None
    timestamp: str
    read: bool


async def validate_endpoint(endpoint):
    """Accept only browser push providers, never arbitrary outbound URLs."""
    try:
        url = urlsplit(endpoint)
        host = url.hostname or ''
        allowed = os.environ['PUSH_ENDPOINT_SUFFIXES'].split(',')
        if (url.scheme != 'https' or url.username or url.password or url.fragment
                or url.port not in (None, 443)
                or not any(host == h or host.endswith('.' + h) for h in allowed)):
            raise ValueError()
        addresses = await asyncio.to_thread(socket.getaddrinfo, host, 443, type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
            raise ValueError()
    except (ValueError, OSError) as exc:
        raise HTTPException(400, 'Invalid or unsupported push endpoint') from exc


class NoRedirectSession(requests.Session):
    def request(self, method, url, **kwargs):
        kwargs['allow_redirects'] = False
        return super().request(method, url, **kwargs)


class PushNotifications:
    def __init__(self, db):
        self.db = db
        self.private_key = os.environ['VAPID_PRIVATE_KEY']
        self.public_key = os.environ['VAPID_PUBLIC_KEY']
        self.subject = os.environ['VAPID_SUBJECT']

    async def initialize(self):
        await self.db.push_subscriptions.create_index('endpoint', unique=True)
        await self.db.push_subscriptions.create_index('expires_at', expireAfterSeconds=0)
        await self.db.push_events.create_index('id', unique=True)
        await self.db.push_events.create_index([('target_user_id', 1), ('timestamp', -1)])
        await self.db.push_events.create_index('expires_at', expireAfterSeconds=0)
        await self.db.push_events.create_index([('state', 1), ('next_attempt', 1)])

    async def enqueue(self, event, only_endpoint=None):
        now = datetime.now(timezone.utc)
        notification = {k: event[k] for k in ('type', 'title', 'message', 'org_id', 'target_user_id') if k in event}
        notification.update(id=str(uuid.uuid4()), timestamp=now.isoformat(), read=False,
                            link='/admin' if event['type'] == 'org_application' else '/orgs')
        await self.db.push_events.insert_one({**notification, 'state': 'pending', 'attempts': 0,
            'delivered': [], 'only_endpoint': only_endpoint, 'next_attempt': now,
            'expires_at': now + timedelta(days=30)})
        return notification

    def _send(self, sub, event):
        payload = {'id': event['id'], 'userId': event['target_user_id'], 'title': event['title'], 'body': event['message'],
                   'url': event['link'], 'tag': event['id']}
        with NoRedirectSession() as session:
            return webpush(subscription_info={'endpoint': sub['endpoint'], 'keys': sub['keys']},
                data=json.dumps(payload), vapid_private_key=self.private_key,
                vapid_claims={'sub': self.subject}, ttl=86400, timeout=10, requests_session=session)

    async def deliver(self, event):
        now = datetime.now(timezone.utc)
        query = {'user_id': event['target_user_id'], 'expires_at': {'$gt': now}}
        if event.get('only_endpoint'):
            query['endpoint'] = event['only_endpoint']
        subscriptions = await self.db.push_subscriptions.find(query, {'_id': 0}).to_list(10)
        retry = False
        for sub in subscriptions:
            digest = hashlib.sha256(sub['endpoint'].encode()).hexdigest()
            if digest in event.get('delivered', []):
                continue
            try:
                await validate_endpoint(sub['endpoint'])
                response = await asyncio.to_thread(self._send, sub, event)
                if not 200 <= response.status_code < 300:
                    raise WebPushException('Push rejected', response=response)
                await self.db.push_events.update_one({'id': event['id']}, {'$addToSet': {'delivered': digest}})
            except WebPushException as exc:
                status = getattr(exc.response, 'status_code', None)
                if status in (404, 410):
                    await self.db.push_subscriptions.delete_one({'endpoint': sub['endpoint'], 'user_id': sub['user_id']})
                else:
                    retry = True
                    logger.warning('Push provider rejected delivery (%s)', status)
            except Exception as exc:  # noqa: BLE001 -- isolate provider failures from approvals
                retry = True
                logger.warning('Push delivery failed (%s)', type(exc).__name__)
        attempts = event.get('attempts', 0) + 1
        await self.db.push_events.update_one({'id': event['id']}, {'$set': {
            'attempts': attempts, 'state': ('pending' if attempts < 6 else 'failed') if retry else 'sent',
            'next_attempt': now + timedelta(seconds=min(30 * 2 ** attempts, 3600))}})

    async def run(self):
        while True:
            try:
                now = datetime.now(timezone.utc)
                # A lease recovers queued deliveries after restarts and prevents worker races.
                event = await self.db.push_events.find_one_and_update(
                    {'state': {'$in': ['pending', 'sending']}, 'next_attempt': {'$lte': now}, 'expires_at': {'$gt': now}},
                    {'$set': {'state': 'sending', 'next_attempt': now + timedelta(minutes=5)}},
                    projection={'_id': 0}, return_document=ReturnDocument.AFTER)
                if event:
                    await self.deliver(event)
                    continue
            except Exception as exc:  # noqa: BLE001 -- durable worker must survive transient failures
                logger.warning('Push queue retry (%s)', type(exc).__name__)
            await asyncio.sleep(3)


def create_push_router(service, get_current_user):
    router = APIRouter(prefix='/push', tags=['push'])
    db = service.db
    optional_user = Depends(get_current_user)

    async def require_push_user(user=optional_user):
        if not user:
            raise HTTPException(401, 'Authentication required')
        return user

    authenticated_user = Depends(require_push_user)

    @router.get('/config')
    async def config(user=authenticated_user):
        return {'public_key': service.public_key}

    @router.post('/subscriptions')
    async def subscribe(body: Subscription, user=authenticated_user):
        await validate_endpoint(body.endpoint)
        existing = await db.push_subscriptions.find_one({'endpoint': body.endpoint}, {'_id': 0, 'user_id': 1})
        if existing and existing['user_id'] != user['id']:
            raise HTTPException(409, 'This browser subscription belongs to another account. Disable it first.')
        if not existing and await db.push_subscriptions.count_documents({'user_id': user['id']}) >= 10:
            raise HTTPException(409, 'Device limit reached (10)')
        now = datetime.now(timezone.utc)
        try:
            await db.push_subscriptions.update_one({'endpoint': body.endpoint, 'user_id': user['id']},
                {'$set': {'keys': body.keys.model_dump(), 'updated_at': now,
                          'expires_at': now + timedelta(days=90)}}, upsert=True)
        except DuplicateKeyError as exc:
            raise HTTPException(409, 'Subscription already assigned') from exc
        return {'enabled': True}

    @router.delete('/subscriptions')
    async def unsubscribe(body: Endpoint, user=authenticated_user):
        await db.push_subscriptions.delete_one({'endpoint': body.endpoint, 'user_id': user['id']})
        return {'enabled': False}

    @router.post('/test', status_code=202)
    async def test_notification(body: Endpoint, user=authenticated_user):
        sub = await db.push_subscriptions.find_one({'endpoint': body.endpoint, 'user_id': user['id']}, {'_id': 0})
        if not sub:
            raise HTTPException(404, 'Enable notifications on this device first')
        now = datetime.now(timezone.utc)
        claimed = await db.push_subscriptions.update_one({'endpoint': body.endpoint, 'user_id': user['id'],
            '$or': [{'last_test_at': {'$lt': now - timedelta(seconds=30)}}, {'last_test_at': {'$exists': False}}]},
            {'$set': {'last_test_at': now}})
        if not claimed.modified_count:
            raise HTTPException(429, 'Wait 30 seconds before sending another test')
        await service.enqueue({'type': 'push_test', 'target_user_id': user['id'],
            'title': 'SC Group Finder', 'message': 'Background notifications are connected.'}, body.endpoint)
        return {'message': 'Test queued'}

    @router.get('/inbox', response_model=list[InboxEvent])
    async def inbox(user=authenticated_user):
        return await db.push_events.find({'target_user_id': user['id'], 'type': {'$in': list(ORG_EVENTS)},
            'expires_at': {'$gt': datetime.now(timezone.utc)}}, {'_id': 0}).sort('timestamp', -1).to_list(50)

    @router.put('/inbox/{event_id}/read')
    async def mark_read(event_id: str, user=authenticated_user):
        query = {'target_user_id': user['id']}
        if event_id != 'all':
            query['id'] = event_id
        await db.push_events.update_many(query, {'$set': {'read': True}})
        return {'read': True}

    return router