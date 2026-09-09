# Replaceable services — not connected

`contracts.json` describes proposed integration operations/data boundaries. It is not a backend configuration and no listed endpoint is currently implemented. `../assets/services.js` is a null adapter: capabilities false, session null, writes rejected with SERVICE_UNAVAILABLE. No service credentials or user account records ship here.

Read `../docs/COMMUNITY_BOUNDARY.md` before implementing any adapter. Server authorization, identity, persistence, privacy and moderation cannot be simulated with localStorage.
