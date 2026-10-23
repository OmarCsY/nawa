import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Card, DemoBadge, LoadingSkeleton } from '../components'
import { DEMO_API_KEY } from '../lib/demo'
import { env } from '../lib/env'

/* Swagger UI is ~1.7 MB: it is its own chunk and downloads only when someone opens this page. */
const SwaggerReference = lazy(() => import('./docs/SwaggerReference'))

const ENGINE_URL = env.engineUrl || 'https://engine.nawa.example'

const PILLARS: Array<{ title: string; body: string; icon: ReactNode }> = [
  {
    title: 'قناة واحدة اليوم (واتساب)، أي قناة غدًا',
    body: 'البوت ونسخة الويب ولوحة لتدوم كلها تستدعي النقاط نفسها. أي قناة جديدة مجرد مترجم رسائل فوق المحرك.',
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
  },
  {
    title: 'مفتاح لكل جهة',
    body: 'لتدوم ولكل شريك ولكل قناة مفتاح x-api-key خاص. تقدرون توقفون أي مفتاح بدون ما يتأثر الباقي.',
    icon: <path d="M15 7a4 4 0 1 1-3.9 4.9L4 19v-3H2v-2h3l6.1-6.1A4 4 0 0 1 15 7Z" />,
  },
  {
    title: 'بيانات مجهّلة فقط',
    body: 'معرّف الأسرة رقم عشوائي، ورقم الجوال يتحول لبصمة ولا يمر لأي نموذج لغوي، وكل المؤشرات أرقام مجمّعة.',
    icon: <path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" />,
  },
]

function CopyKey() {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(DEMO_API_KEY)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked: the key is selectable on screen */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-3xl border border-sand/30 bg-sand/10 py-1.5 ps-4 pe-2 text-sm text-sand transition-colors hover:bg-sand/20 max-sm:w-full max-sm:justify-between"
    >
      <span className="whitespace-nowrap text-sand/70">المفتاح التجريبي</span>
      <code dir="ltr" className="font-mono text-[13px] text-sand">
        {DEMO_API_KEY}
      </code>
      <span className="rounded-full bg-saffron px-3 py-1 text-xs font-bold text-ink">{copied ? 'تم النسخ ✓' : 'انسخ'}</span>
    </button>
  )
}

export function DocsPage() {
  return (
    <div className="space-y-8">
      <Card tone="plum" padded={false} className="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10">
        <svg viewBox="0 0 200 200" className="pointer-events-none absolute -end-20 -top-24 size-56 opacity-60 sm:-end-16 sm:-top-20 sm:size-72 sm:opacity-100" aria-hidden>
          <circle cx="100" cy="100" r="98" fill="var(--color-saffron)" opacity="0.1" />
          <circle cx="100" cy="100" r="68" fill="var(--color-saffron)" opacity="0.14" />
          <circle cx="100" cy="100" r="38" fill="var(--color-saffron)" opacity="0.85" />
        </svg>
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-sm font-medium text-saffron-soft">
            <span aria-hidden className="h-px w-6 bg-saffron" />
            بوابة ال API
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            محرك نَوء · جاهز للربط مع منصة لتدوم وتطبيقها
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-sand/85 sm:text-lg">
            كل وظيفة في المحرك نقطة مستقلة، موثقة بمعيار OpenAPI 3.1 وبمثال جاهز من أسرة العرض. جرّبوها من هنا بمفتاح العرض.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CopyKey />
            <a
              href="/openapi.yaml"
              download
              className="inline-flex min-h-10 items-center rounded-full border border-sand/40 px-4 text-sm font-medium text-sand transition-colors hover:bg-sand/10"
            >
              حمّل openapi.yaml
            </a>
            <DemoBadge className="border-sand/30 bg-sand/90" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-sand/70">
            <p className="flex min-w-0 items-center gap-2">
              <span>الخادم</span>
              <code dir="ltr" className="truncate rounded bg-sand/10 px-2 py-0.5 font-mono text-[12px] text-sand">
                {ENGINE_URL}
              </code>
            </p>
            <p className="flex items-center gap-4">
              <span dir="ltr">OpenAPI 3.1</span>
              <span>15 نقطة</span>
            </p>
          </div>
        </div>
      </Card>

      <ul className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <li key={p.title} className="flex gap-4 rounded-card border border-line bg-paper p-5 shadow-card">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-saffron-soft text-saffron">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {p.icon}
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold leading-snug text-ink">{p.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <section aria-label="مرجع ال API" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-bold text-ink">مرجع ال API</h2>
          <p className="text-xs text-muted">المرجع بالإنجليزية والعربية، ويُقرأ من اليسار لليمين</p>
        </div>
        {!env.engineUrl && (
          <p role="note" className="rounded-2xl border border-saffron/30 bg-saffron-soft px-4 py-3 text-sm leading-relaxed text-ink">
            هذا العرض يعمل بوضع المحاكاة، فزر «جرّب» يرسل لخادم المثال وقد لا يرد. ضعوا عنوان المحرك الحقيقي في
            <code dir="ltr" className="mx-1.5 rounded bg-paper px-1.5 py-0.5 font-mono text-xs">VITE_ENGINE_URL</code>
            ويتحول الخادم تلقائيًا.
          </p>
        )}
        <div className="overflow-hidden rounded-card border border-line bg-paper p-3 shadow-card sm:p-6">
          <Suspense fallback={<LoadingSkeleton variant="card" label="جاري تحميل مرجع ال API" />}>
            <SwaggerReference />
          </Suspense>
        </div>
      </section>
    </div>
  )
}
