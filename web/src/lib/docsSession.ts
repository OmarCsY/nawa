import { engineRequest } from './engine'
import { newClientNonce, newRequestId, type EngineSession } from './engineSession'
let session: EngineSession | null = null
export const getDocsSession = () => session
export async function startDocsSession() {
  session = null
  for (const text of ['مرحبا', 'موافق', '4', 'بريدة']) {
    const result: { session: EngineSession } = await engineRequest<{ session: EngineSession }>('/channels/web/inbound', JSON.stringify({ request_id: newRequestId(), session, ...(!session ? { client_nonce: newClientNonce() } : {}), type: 'text', text }), true)
    session = result.session
  }
}

