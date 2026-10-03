"""Durable pending-rating obligations.

Every completed job creates one obligation per direction. Obligations survive
logout/refresh, expire after RATING_WINDOW_DAYS as 'not rated', and keep each
side's rating hidden from the other until both have submitted (or the window
closed).
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

RATING_WINDOW_DAYS = 14


def _now():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.isoformat()


def participants_of(contract: dict) -> dict:
    """user_id -> {handle, role} for everyone who worked the job (excl. poster)."""
    out = {}
    for p in (contract.get('accepted_participants') or []):
        if p.get('id'):
            out[p['id']] = {'handle': p.get('rsi_handle') or p.get('handle'), 'role': None}
    for s in (contract.get('manifest') or []):
        ab = s.get('accepted_by') or {}
        fb = s.get('filled_by') or {}
        uid = ab.get('id') or fb.get('user_id')
        if uid:
            out[uid] = {
                'handle': ab.get('rsi_handle') or ab.get('handle') or fb.get('handle'),
                'role': s.get('role') or s.get('slot_name'),
            }
    ab = contract.get('accepted_by') or {}
    if ab.get('id'):
        out.setdefault(ab['id'], {'handle': ab.get('rsi_handle') or ab.get('handle'), 'role': None})
    out.pop(contract.get('poster_id'), None)
    return out


def _already_rated(contract: dict) -> tuple:
    """(set of ids the poster already rated, set of ids who already rated the poster)"""
    poster_id = contract.get('poster_id')
    single_id = (contract.get('accepted_by') or {}).get('id')
    poster_rated = {r.get('rated_user_id') for r in (contract.get('participant_ratings') or [])
                    if r.get('reviewer_id') == poster_id}
    if contract.get('client_review') and single_id:
        poster_rated.add(single_id)
    rated_poster = {r.get('reviewer_id') for r in (contract.get('poster_ratings') or [])}
    if contract.get('merc_review') and single_id:
        rated_poster.add(single_id)
    return {i for i in poster_rated if i}, {i for i in rated_poster if i}


async def create_obligations(db, contract: dict, notify=None, window_from_now: bool = True) -> int:
    """Idempotently create pending obligations for a completed contract."""
    if not contract or not contract.get('poster_id'):
        return 0
    people = participants_of(contract)
    if not people:
        return 0
    poster_id = contract['poster_id']
    poster_handle = (contract.get('poster') or {}).get('handle') or (contract.get('poster') or {}).get('rsi_handle')
    poster_rated, rated_poster = _already_rated(contract)
    is_multi = bool(contract.get('manifest')) or contract.get('join_mode') == 'multi'
    now = _now()
    base = now if window_from_now else now
    expires = _iso(base + timedelta(days=RATING_WINDOW_DAYS))
    closed_at = contract.get('completed_at') or contract.get('created_at') or _iso(now)
    created = 0

    rows = []
    for pid, info in people.items():
        rows.append({
            'rater_id': poster_id, 'rater_handle': poster_handle,
            'ratee_id': pid, 'ratee_handle': info.get('handle'),
            'kind': 'poster_to_player', 'slot_role': info.get('role'),
            'status': 'completed' if pid in poster_rated else 'pending',
        })
        rows.append({
            'rater_id': pid, 'rater_handle': info.get('handle'),
            'ratee_id': poster_id, 'ratee_handle': poster_handle,
            'kind': 'player_to_poster', 'slot_role': info.get('role'),
            'status': 'completed' if pid in rated_poster else 'pending',
        })

    for r in rows:
        res = await db.rating_obligations.update_one(
            {'contract_id': contract['id'], 'rater_id': r['rater_id'], 'ratee_id': r['ratee_id']},
            {'$setOnInsert': {
                'id': str(uuid.uuid4()),
                'contract_id': contract['id'],
                'contract_title': contract.get('title'),
                'contract_category': contract.get('category'),
                'is_multi': is_multi,
                'created_at': _iso(now),
                'closed_at': closed_at,
                'expires_at': expires,
                **r,
            }},
            upsert=True,
        )
        if res.upserted_id is not None:
            created += 1
            if r['status'] == 'pending' and notify:
                try:
                    await notify({
                        'type': 'rating_pending',
                        'target_user_id': r['rater_id'],
                        'title': 'Rating owed',
                        'message': f"Rate {r.get('ratee_handle') or 'your crewmate'} for \"{contract.get('title') or 'a completed job'}\"",
                        'sound': 'notification',
                    })
                except Exception:
                    pass
    return created


async def settle(db, contract_id: str, rater_id: str, ratee_id: Optional[str] = None) -> None:
    q = {'contract_id': contract_id, 'rater_id': rater_id, 'status': 'pending'}
    if ratee_id:
        q['ratee_id'] = ratee_id
    await db.rating_obligations.update_many(
        q, {'$set': {'status': 'completed', 'completed_at': _iso(_now())}}
    )


async def expire_due(db) -> int:
    res = await db.rating_obligations.update_many(
        {'status': 'pending', 'expires_at': {'$lt': _iso(_now())}},
        {'$set': {'status': 'expired', 'expired_at': _iso(_now())}},
    )
    return res.modified_count


async def pending_for(db, user_id: str) -> List[dict]:
    await expire_due(db)
    rows = await db.rating_obligations.find(
        {'rater_id': user_id, 'status': 'pending'}, {'_id': 0}
    ).sort('closed_at', -1).to_list(200)
    return rows


async def withheld_contract_ids(db, user_id: str, contract_ids: List[str]) -> set:
    """Contracts where this viewer still owes a rating -> counterpart rating hidden."""
    if not user_id or not contract_ids:
        return set()
    rows = await db.rating_obligations.find(
        {'contract_id': {'$in': contract_ids}, 'rater_id': user_id, 'status': 'pending'},
        {'_id': 0, 'contract_id': 1},
    ).to_list(len(contract_ids) * 4 + 10)
    return {r['contract_id'] for r in rows}


def redact_withheld(contract: dict, user_id: str) -> None:
    """Blank the counterpart's rating on a contract the viewer hasn't rated yet."""
    contract['ratings_withheld'] = True
    if contract.get('poster_id') == user_id:
        contract['merc_review'] = None
        contract['poster_ratings'] = []
    else:
        contract['client_review'] = None
        contract['participant_ratings'] = [
            r for r in (contract.get('participant_ratings') or [])
            if r.get('rated_user_id') != user_id
        ]


async def backfill(db, limit: int = 2000) -> int:
    """Pull historical completed jobs with missing ratings into the pending list."""
    cursor = db.contracts.find({'status': 'completed'}, {'_id': 0}).sort('created_at', -1)
    total = 0
    async for contract in cursor:
        total += await create_obligations(db, contract)
        limit -= 1
        if limit <= 0:
            break
    return total
