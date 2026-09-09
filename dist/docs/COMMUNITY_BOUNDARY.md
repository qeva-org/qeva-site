# Account, team and release boundary

## Current implementation

There is no account backend. The account/team page says so, contains no fabricated sign-in form, and links to useful local work. `assets/services.js` returns false capabilities and a null session; service-dependent methods reject with `SERVICE_UNAVAILABLE`. `services/contracts.json` is a proposed versioned integration contract, not implemented HTTP endpoints. Browser-local notebook and laboratory IDs are not users, sessions or permissions.

## Durable versus replaceable

Durable: explicit knowledge revisions, context/assumptions, verification artifacts, provenance, canonical exports, protocols, released learning definitions, open kernel specifications, source code, manifests and mirrors.

Replaceable: accounts, session tokens, roles, progress sync, bookmarks, drafts, team membership, notifications, comments, discussions, moderation, collection curation, review queues and live presence. Export service records in their own format. No rebuild of the permanent core may require querying live service tables.

Learning state is replaceable service evidence, even though a person may preserve their exported notebook. A community sandbox is a service object even when its portable specification has been retained. Only a separately admitted exact revision is a released archive record.

## Service data and authorization

Future accounts require real identity verification, secure session handling, transactional persistence, rate limits, account recovery, consent, export/deletion and backups. Server-side authorization is mandatory; never accept client-supplied membership, owner or verification fields as authority. Derive the acting account from the authenticated session. Team roles proposed here are owner, maintainer, member, reviewer and viewer. Reviewer permits workflow review, not automatic proof status. Prevent removal of the last owner without an explicit succession/deletion procedure.

Teams can own shared lab revisions, concept-map annotations, challenge sets, expeditions, review queues, discussions and contribution history. These stay separate from immutable knowledge. Use stable service IDs, version/ETag conditional writes, idempotency keys on write operations, pagination and structured errors. Lab payloads must pass the portable parser/interpreter limits server-side as well as client-side. Treat publishing as untrusted content; apply access control, abuse reporting, moderation and visibility controls. User-supplied HTML/code must never be executed in the trusted origin.

## Contribution pipeline

Personal sandbox → shared sandbox → team experiment → community review → candidate knowledge object → verification → separately authorized QEVA release → permanent archive.

Transition evidence must name exact input revisions, scope, reviewers, objections, rights and artifacts. A candidate must declare context, assumptions, dependencies, provenance and an accurate verification label. Reviews do not imply machine checking. Popularity, team membership and positive votes never promote content automatically. A release maintainer uses the durable release process, verifies links and artifacts, creates a new exact revision and preserves any correction/supersession relationship. Admission and content review are distinct permissions.

A proof service, if added, would report a pinned checker/version, exact formal statement, artifact digest, dependencies and reproducible result. It cannot silently promote a human-language conjecture because an experiment agrees. No such verifier runs in this release.

## Next implementation step

First ship a real adapter for identity plus private progress/draft synchronization, with authorization tests, export/deletion, conflict resolution and backend-loss drills. Then implement teams/roles and shared immutable lab revisions. Add public publishing only after moderation and untrusted-content isolation. Introduce candidate/review workflows last, with a separately controlled release key or approval process. Keep the null adapter and static offline mode as supported configurations.
