# Engine acceptance evidence

Target: `xjegeggcsemvytfnvzez` (Omar's nawa project).
Production base: `https://automations-n8n.gkrgfu.easypanel.host/webhook/noo-engine/v1`.

- `production-health.json`: real HTTP production response naming the deployed project.
- `acceptance-http-results.json`: 13 passing real production HTTP checks, including actual Gemini transcription of a known synthetic Ogg/Opus voice fixture. Sessions/tokens are not exported. Tests created two isolated demo households, two measurements, and one event in Omar's project.
- `deployed-audit.json`: published n8n exports were checked for the target database URL and execution privacy settings.
- `acceptance-sql.sql`: SQL acceptance suite, transaction rolled back. Existing Omar showcase is preserved rather than reseeded. Covers ownership, atomic persistence, forecasts, outcome idempotency, and anonymous-access denials.
- `sql-smoke.sql`: SQL-only test with injected extraction JSON; it is **not** evidence of a real AI/audio call. Its transaction rolls back. Also checks Beta(9,1) sample mean.

Run SQL suites only on the intended project using an authorized SQL connection. They temporarily install a test trigger and roll back; do not run them simultaneously with another schema migration. The HTTP report records completed tests, not a script to replay blindly.

Not yet verified: mp4/m4a, production frontend adapter, browser Realtime delivery, full WhatsApp story after the database cutover, and immediate/TTL audio cleanup. Successful backend tests do not establish those features.
