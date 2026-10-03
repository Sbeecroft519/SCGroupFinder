# Star Citizen Group Finder — Org Affiliation, Ratings Reliability, Region Memory, Multicrew Polish

A focused round of fixes to the job board: players can show which approved org they fly with, ratings stop falling through the cracks, the region prompt remembers its answer, and posting a multicrew job becomes a clear step-by-step flow.

## Who it's for

Star Citizen players posting and taking jobs — solo contractors, medical responders, and crews — plus org leaders who want their org visible and their member count accurate, and admins who approve orgs.

## Core features and experience

**1. Org affiliation on your profile**
- A player can pick one approved org to display as their affiliation. Only orgs that appear in Approved Orgs are selectable; pending or rejected orgs are not offered.
- Affiliation is optional and can be changed or cleared at any time. Setting it is self-service — no approval step, no invite required.
- Once set, the org tag appears next to the player's name wherever they show up: job cards, crew manifests, applicant lists, and their public profile.
- Each approved org tile shows a live member count = number of players currently displaying that org. The count moves up and down as players set or clear their affiliation, with no manual admin action.
- Org tiles stay clickable through to the public org profile, which also lists the displayed members.

**2. Ratings that actually get recorded**
- When a job completes, both sides owe a rating. The rating stays owed until it's given — closing the tab, logging out, or coming back a week later does not lose it.
- A persistent "Ratings pending" surface shows every rating a player still owes, with the job name, the other party, and when it closed. It's reachable from the main nav and badged with a count.
- The player is nudged on return: the pending list is surfaced on next login and included in the existing notification stream, so one side forgetting doesn't stall the other.
- A rating left unfilled for 14 days expires and is marked "not rated" rather than blocking the job forever. Ratings already given still count toward the other party's score.
- Each side's rating is visible to the other only once both have submitted or the window has expired — so nobody rates in retaliation.
- Existing completed jobs with missing ratings are pulled into the pending list on launch, so the backlog gets cleaned up rather than ignored.

**3. Region asked once**
- The region choice is remembered against the player's account, not the browser session. Once chosen, it is never asked again on refresh.
- Region is editable on demand from settings, and the prompt only reappears if the player has genuinely never chosen one.
- Players not logged in get their choice remembered locally so a refresh doesn't re-prompt them either.

**4. Multicrew posting that reads clearly**
- Posting a multicrew job becomes a short guided flow instead of one long form: job basics → crew roles and seats → pay split → review and post. Progress is visible and the player can step back without losing input.
- Crew seats are defined as named roles with a count each (e.g. 2× Turret, 1× Engineer), so the manifest reads like a crew list rather than a number.
- Pay is stated once and shown split per seat as the player edits, so there's no guessing what a seat is worth.
- Applicants apply to a specific role, and the poster accepts into that seat. A filled manifest shows who sits where at a glance.
- Job cards on the board show seats filled vs total and which roles are still open, so a crew job is scannable from the list.
- Switching a draft between solo and multicrew keeps everything that still applies rather than resetting the form.

## User flow

1. A player opens their profile settings, picks their org from the approved list, and saves. Their tag appears across the board and the org's tile count goes up by one.
2. A crew lead posts a multicrew job: fills basics, defines three roles, sets the payout, reviews the per-seat split, and posts. The board shows "0/3 seats filled — Turret, Engineer open".
3. Players apply to named roles. The lead accepts into seats; the manifest fills in.
4. The job completes. Both the lead and each crew member get a pending rating.
5. The lead rates everyone that night. One crew member doesn't. Three days later that member logs in, sees a badge on Ratings Pending, and clears it — both ratings then become visible. If they never return, the rating expires after 14 days and the lead's score is unaffected.
6. Neither player is asked for their region again.

## UI/UX feel

Keeps the current look and dark palette — this round changes structure, not style. Org tags read as small, quiet badges, never louder than the player's name. The pending-ratings surface behaves like a short task list: counted, dismissible one item at a time, no modal walls. The multicrew flow is a stepper with the review step showing exactly what will be posted.

## Implementation phases

**Phase 1 — MVP (built now)**
All four items above: self-service org affiliation with live member counts, persistent pending ratings with return nudges and a 14-day expiry, account-level region memory, and the stepped multicrew posting flow with named role seats and per-seat pay.

**Phase 2 — later**
- Org leaders can verify or reject displayed affiliations, so the tag carries weight.
- Rating detail: per-role tags (good pilot, good gunner), written feedback, and rating history on the public profile.
- Saved crew templates so a lead can repost a known crew setup in one click.

**Phase 3 — later**
- Org-vs-org reputation and leaderboards driven by member ratings.
- Recurring/scheduled multicrew ops with recurring manifests.
- Push reminders specifically for pending ratings on mobile.

## Assumptions

- A player displays at most one org at a time.
- Affiliation is self-declared and needs no approval in this round; the org cannot remove a member's tag yet.
- Member count on an org tile counts displayed affiliations only — it is not a separate roster and does not include invited-but-not-displaying players.
- Only orgs with approved status are selectable; if an org is later unapproved, affiliations pointing at it are hidden and the tag disappears.
- Ratings window is 14 days, then the rating expires as "not rated" rather than being auto-scored or defaulted to a value.
- Ratings stay mutually hidden until both submit or the window expires.
- Pending-rating nudges use the existing in-app notification stream; no new email.
- Region memory is per account for logged-in players and per browser for guests.
- The multicrew stepper replaces the current multicrew form; the solo posting form keeps its existing single-screen layout.
- Crew roles are free-text names with a seat count, not a fixed preset list.
- Pay split is shown evenly per seat by default; uneven per-seat pay is out of scope this round.
- Nothing already working — Discord OAuth, webhooks, push notifications, org approval — is changed.
