import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { getDocsSession } from '../../lib/docsSession'
import { newRequestId } from '../../lib/engineSession'
import './swagger-theme.css'
export default function SwaggerReference() {
  return <div dir="ltr" className="nawa-swagger"><SwaggerUI url="/openapi.yaml" docExpansion="list" defaultModelsExpandDepth={-1} displayRequestDuration filter persistAuthorization={false}
    requestInterceptor={request => {
      if (request.method?.toUpperCase() === 'POST') {
        const session = getDocsSession()
        if (!session) throw new Error('ابدأ جلسة توثيق تجريبية أولًا.')
        if (request.body instanceof FormData) {
          let metadata: Record<string, unknown> = {}
          try { metadata = JSON.parse(String(request.body.get('metadata') || '{}')) } catch { /* Use a fresh metadata object. */ }
          delete metadata.household_id
          request.body.set('metadata', JSON.stringify({ ...metadata, request_id: newRequestId(), session, type: 'voice' }))
        } else {
          let body: Record<string, unknown> = {}
          try { body = JSON.parse(String(request.body || '{}')) } catch { /* Safe empty request. */ }
          delete body.household_id
          request.body = JSON.stringify({ ...body, request_id: newRequestId(), session })
        }
      }
      return request
    }} /></div>
}
