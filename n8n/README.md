# Deployed Noo workflows — sanitized exports

- `engine.json`: `Noo Engine v1`, workflow `x5wO5L3IYIH0nGJB`.
- `delivery.json`: `Noo Delivery v1`, workflow `EM8Y5zcNkfeWC3sl`. Runs every 15 minutes and after inbound replies.
- `whatsapp-adapter.json`: original `No'o`, workflow `sMFbVytUVFS7buud`, keeping the `/webhook/noo-whatsapp` header authentication and direct-chat filters.

Supabase target: Omar's `xjegeggcsemvytfnvzez`. These exports contain no reference to Aseed's former database. Credentials are references to existing n8n credentials; WAHA header secrets are replaced with `REDACTED_USE_EXISTING_WAHA_SECRET`. Never deploy the redaction literal as a real key. Remap credentials/subworkflow IDs when importing into a different n8n instance.

The engine and delivery workflows use Riyadh time and do not save successful, failed, or manual execution payloads. The outbox records delivery only after WAHA acknowledgement. Unknown outcomes are not blindly resent. Proactive delivery observes consent, stop, quiet hours, and a two-message weekly cap.

Canonical API contract and verified limitations are in `../docs/engine/`. No frontend code is changed by this handoff.
