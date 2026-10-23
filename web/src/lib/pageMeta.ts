import { useEffect } from 'react'

/** Per-route title and description, declared on the route (`handle`) and applied by AppShell. */
export interface PageMeta {
  title: string
  description: string
}

export const SITE_NAME = 'نَوء'

/** Sets the tab title and keeps the description / Open Graph / Twitter tags of index.html in step with the route. */
function setMeta(selector: string, content: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content)
}

export function usePageMeta(meta: PageMeta | undefined) {
  const title = meta ? `${SITE_NAME} · ${meta.title}` : undefined
  const description = meta?.description

  useEffect(() => {
    if (!title || !description) return
    document.title = title
    setMeta('meta[name="description"]', description)
    setMeta('meta[property="og:title"]', title)
    setMeta('meta[property="og:description"]', description)
    setMeta('meta[name="twitter:title"]', title)
    setMeta('meta[name="twitter:description"]', description)
  }, [title, description])
}
