import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { DEMO_API_KEY } from '../../lib/demo'
import { env } from '../../lib/env'
import './swagger-theme.css'

/*
 * The only module that imports Swagger UI (≈1.7 MB). DocsPage loads it with React.lazy, so no other
 * route ever downloads it. Swagger stays left-to-right inside the right-to-left page; `.nawa-swagger`
 * (swagger-theme.css) repaints it in Nawa's palette.
 */
export default function SwaggerReference() {
  return (
    <div dir="ltr" className="nawa-swagger">
      <SwaggerUI
        url="/openapi.yaml"
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        displayRequestDuration
        deepLinking={false}
        filter
        tryItOutEnabled
        persistAuthorization
        onComplete={(system) => {
          // the showcase key is already entered, so «Try it out» works on the first click
          system.preauthorizeApiKey('ApiKeyAuth', DEMO_API_KEY)
          // the spec ships with a placeholder host; point it at the engine this build talks to
          if (env.engineUrl) {
            const spec = system.specSelectors.specJson().toJS()
            spec.servers = [{ url: env.engineUrl, description: 'Nawa Engine · VITE_ENGINE_URL' }]
            system.specActions.updateJsonSpec(spec)
          }
        }}
      />
    </div>
  )
}
