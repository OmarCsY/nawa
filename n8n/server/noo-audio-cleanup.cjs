'use strict';
// n8n 2.21 external hook. No secrets, requests, or audio contents are logged.
const fs = require('node:fs/promises');
const path = require('node:path');
const ROOT = '/home/node/.n8n/storage/workflows';
const IDS = new Set(['x5wO5L3IYIH0nGJB', 'sMFbVytUVFS7buud']);
const TTL_MS = 60 * 60 * 1000;
function executionPath(workflowId, executionId) {
  if (!IDS.has(workflowId) || !/^\d+$/.test(String(executionId))) return null;
  return path.join(ROOT, workflowId, 'executions', String(executionId), 'binary_data');
}
async function remove(workflowId, executionId) {
  const target = executionPath(workflowId, executionId);
  if (!target) return;
  // Fixed workflow allowlist + numeric execution IDs prevent path traversal.
  await fs.rm(target, { recursive: true, force: true });
}
async function sweep(now = Date.now()) {
  for (const id of IDS) {
    const base = path.join(ROOT, id, 'executions');
    const entries = await fs.readdir(base, { withFileTypes: true }).catch(e => {
      if (e.code === 'ENOENT') return [];
      throw e;
    });
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
      const target = executionPath(id, entry.name);
      const stat = await fs.stat(target).catch(e => {
        if (e.code === 'ENOENT') return null;
        throw e;
      });
      if (stat && now - stat.mtimeMs > TTL_MS) await remove(id, entry.name);
    }
  }
}
function report() { console.error('[noo-audio-cleanup] cleanup failed; retry at next sweep'); }
let timer;
async function start() {
  await sweep().catch(report);
  timer ??= setInterval(() => { sweep().catch(report); }, 5 * 60 * 1000);
  timer.unref();
  console.info('[noo-audio-cleanup] enabled: two Noo workflows, postExecute + 60-minute TTL');
}
module.exports = {
  n8n: { ready: [start] },
  worker: { ready: [start] },
  workflow: { postExecute: [async (_run, workflow, executionId) => {
    await remove(workflow.id, executionId).catch(report);
  }] },
};
