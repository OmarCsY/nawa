# Scoped audio cleanup

n8n 2.21.0 loads /home/node/.n8n/noo-audio-cleanup.cjs through EXTERNAL_HOOK_FILES. Already deployed and startup verified on the production service. No credentials are present in this file.

Only the Noo Engine and WhatsApp adapter workflow IDs are allowlisted. Completion (success or failure) removes that execution's binary_data directory. A sweep on startup and every five minutes removes interrupted execution audio older than 60 minutes. Other workflows and their files are untouched by the hook. Execution content saving is disabled on all three Noo workflows. AAC conversion creates no extra disk files.

Rollback: remove this path from EXTERNAL_HOOK_FILES and redeploy n8n. Normal n8n execution pruning remains enabled. When migrating to another n8n instance, update the workflow allowlist and fixed storage root after inspecting its storage configuration. Do not load unreviewed external hook files.
