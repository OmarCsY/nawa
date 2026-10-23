# Engine acceptance evidence

Target: `xjegeggcsemvytfnvzez` (Omar's nawa project).
Production base: `https://automations-n8n.gkrgfu.easypanel.host/webhook/noo-engine/v1`.

- `production-health.json`: real HTTP production response naming the deployed project.
- `acceptance-http-results.json`: 13 passing real production HTTP checks, including actual Gemini transcription of a known synthetic Ogg/Opus voice fixture. Sessions/tokens are not exported. Tests created two isolated demo households, two measurements, and one event in Omar's project.
- `deployed-audit.json`: published n8n exports were checked for the target database URL and execution privacy settings.
- `acceptance-sql.sql`: SQL acceptance suite, transaction rolled back. Existing Omar showcase is preserved rather than reseeded. Covers ownership, atomic persistence, forecasts, outcome idempotency, and anonymous-access denials.
- `sql-smoke.sql`: SQL-only test with injected extraction JSON; it is **not** evidence of a real AI/audio call. Its transaction rolls back. Also checks Beta(9,1) sample mean.

Run SQL suites only on the intended project using an authorized SQL connection. They temporarily install a test trigger and roll back; do not run them simultaneously with another schema migration. The HTTP report records completed tests, not a script to replay blindly.

Additional verified production evidence:

- mp4-production-results.json: real Gemini transcription of standard M4A and fragmented MP4; both 700 grams.
- audio-validation-results.json: 91 seconds, truncated MP4, and >10 MiB all rejected.
- silence-production-results.json: silent AAC returns a clear retryable error and no measurement card.
- full-story-results.json: actual HTTP onboarding -> measurement -> event -> plan -> seven-day advance -> adherence -> M4A -> confirmed measurement + outcome -> summary/forecast. Session fields are REDACTED. A null percentage correctly reflects insufficient event comparison history.
- realtime-production-results.json: production HTTP -> live_feed INSERT received by anonymous Supabase subscription -> matching v_live row.
- whatsapp-production-results.json: real user registration and 500g bread voice confirmation after cutover; seven WAHA-acknowledged replies.
- audio-cleanup-results.json: production filesystem verification plus synthetic TTL probe; no contents or user IDs.

Full WhatsApp event/plan/outcome story was not rerun over real dates after cutover. Browser frontend and a physical iPhone remain phase-three integration checks.

Run `node docs/engine/tests/full-story.mjs` with Node22+ to create a new isolated demo family and replay the production story. It uses the included synthetic English SAPI fixture, not a private recording. Expect real writes to the demo family and real Gemini calls. Tokens are held only in memory; the local result report is sanitized. Run `node docs/engine/tests/cleanup-test.mjs` for the local cleanup guard tests without connecting to production.
