"""Self-service org affiliation: lookup helpers and contract enrichment."""
from typing import Iterable, List, Optional


async def org_affiliation_for(db, user: Optional[dict]) -> Optional[dict]:
    oid = (user or {}).get('org_affiliation_id')
    if not oid:
        return None
    org = await db.organizations.find_one(
        {'id': oid, 'approval_status': 'approved'},
        {'_id': 0, 'id': 1, 'name': 1, 'tag': 1, 'logo_url': 1},
    )
    if not org:
        return None
    return {
        'org_id': org['id'],
        'org_name': org.get('name'),
        'org_tag': org.get('tag'),
        'logo_url': org.get('logo_url'),
    }


async def org_tag_map(db, user_ids: Iterable[Optional[str]]) -> dict:
    """user_id -> {org_id, tag, name} for users displaying an approved org."""
    ids = [i for i in {u for u in user_ids if u}]
    if not ids:
        return {}
    users = await db.users.find(
        {'id': {'$in': ids}, 'org_affiliation_id': {'$nin': [None, '']}},
        {'_id': 0, 'id': 1, 'org_affiliation_id': 1},
    ).to_list(len(ids))
    org_ids = list({u['org_affiliation_id'] for u in users if u.get('org_affiliation_id')})
    if not org_ids:
        return {}
    orgs = await db.organizations.find(
        {'id': {'$in': org_ids}, 'approval_status': 'approved'},
        {'_id': 0, 'id': 1, 'tag': 1, 'name': 1},
    ).to_list(len(org_ids))
    by_org = {o['id']: o for o in orgs}
    out = {}
    for u in users:
        org = by_org.get(u.get('org_affiliation_id'))
        if org:
            out[u['id']] = {'org_id': org['id'], 'tag': org.get('tag'), 'name': org.get('name')}
    return out


def _collect_ids(contract: dict) -> List[str]:
    ids = [contract.get('poster_id')]
    ids.append((contract.get('accepted_by') or {}).get('id'))
    for p in (contract.get('accepted_participants') or []):
        ids.append(p.get('id'))
    for s in (contract.get('manifest') or []):
        ids.append((s.get('accepted_by') or {}).get('id'))
        ids.append((s.get('filled_by') or {}).get('user_id'))
        ids.append(s.get('applicant_id'))
        for b in (s.get('bids') or []):
            ids.append(b.get('user_id'))
    return [i for i in ids if i]


async def enrich_org_tags(db, contracts) -> None:
    """Attach org_tag/org_id onto posters, participants, crew seats and seat bids."""
    if isinstance(contracts, dict):
        contracts = [contracts]
    contracts = [c for c in contracts if isinstance(c, dict)]
    if not contracts:
        return
    all_ids: List[str] = []
    for c in contracts:
        all_ids.extend(_collect_ids(c))
    tags = await org_tag_map(db, all_ids)
    if not tags:
        return

    def stamp(target: Optional[dict], uid: Optional[str]) -> None:
        t = tags.get(uid) if uid else None
        if target is not None and t:
            target['org_tag'] = t['tag']
            target['org_id'] = t['org_id']

    for c in contracts:
        t = tags.get(c.get('poster_id'))
        if t:
            c['poster'] = {**(c.get('poster') or {}), 'org_tag': t['tag'], 'org_id': t['org_id']}
        stamp(c.get('accepted_by'), (c.get('accepted_by') or {}).get('id'))
        for p in (c.get('accepted_participants') or []):
            stamp(p, p.get('id'))
        for s in (c.get('manifest') or []):
            stamp(s.get('accepted_by'), (s.get('accepted_by') or {}).get('id'))
            stamp(s.get('filled_by'), (s.get('filled_by') or {}).get('user_id'))
            for b in (s.get('bids') or []):
                stamp(b, b.get('user_id'))


async def displayed_member_counts(db, org_ids: List[str]) -> dict:
    if not org_ids:
        return {}
    rows = await db.users.aggregate([
        {'$match': {'org_affiliation_id': {'$in': org_ids}}},
        {'$group': {'_id': '$org_affiliation_id', 'n': {'$sum': 1}}},
    ]).to_list(len(org_ids) + 1)
    return {r['_id']: r['n'] for r in rows}


async def displayed_members(db, org_id: str, limit: int = 200) -> List[dict]:
    rows = await db.users.find(
        {'org_affiliation_id': org_id},
        {'_id': 0, 'id': 1, 'rsi_handle': 1, 'reputation': 1, 'avatar_preset': 1,
         'avatar_url': 1, 'contracts_completed': 1},
    ).sort('rsi_handle', 1).to_list(limit)
    return rows
