import { lazy, Suspense, useState } from 'react'
import { Card, DemoBadge, LoadingSkeleton } from '../components'
import { env } from '../lib/env'
import { startDocsSession } from '../lib/docsSession'
const SwaggerReference = lazy(() => import('./docs/SwaggerReference'))
export function DocsPage() {
  const [status, setStatus] = useState('ابدأ أسرة توثيق تجريبية مستقلة قبل استخدام «جرّب».')
  const [busy, setBusy] = useState(false)
  return <div className="space-y-8">
    <Card tone="plum" className="space-y-5"><p className="text-saffron-soft">بوابة API نَوء</p><h1 className="text-3xl font-bold">محرك واحد للويب وواتساب</h1><p>العقد المنشور يطابق روابط الإنتاج. الطلب الأول ينشئ جلسة محدودة الصلاحية، والتغييرات تمر بالمحرك مع تأكيد المسودات. لا يوجد مفتاح خادمي في المتصفح.</p><code dir="ltr" className="block break-all text-xs">{env.engineUrl}</code><div className="flex flex-wrap gap-3"><a className="rounded-full border px-4 py-2" href="/openapi.yaml" download>حمّل OpenAPI</a><a className="rounded-full border px-4 py-2" href="/engine-contract.schema.json" download>مخطط الرسائل</a><DemoBadge /></div></Card>
    <Card className="space-y-3"><h2 className="text-xl font-bold">تجربة آمنة على بيانات الديمو</h2><p>زر البدء ينشئ أسرة اصطناعية، ويوافق على تجربة الديمو ويسجل 4 أفراد في بريدة. جلسة التوثيق منفصلة عن محادثتك، ولا تُرسل معرّفات أسر حقيقية من الأمثلة.</p><button className="rounded-full bg-plum px-5 py-3 text-sand disabled:opacity-60" disabled={busy} onClick={async () => { setBusy(true); try { await startDocsSession(); setStatus('جلسة التوثيق جاهزة. استخدم جرّب، أو ابدأ أسرة جديدة لإعادة الضبط.') } catch { setStatus('تعذّر إنشاء جلسة التوثيق. حاول مرة أخرى.') } finally { setBusy(false) } }}>{busy ? 'جاري إنشاء الجلسة…' : 'ابدأ جلسة توثيق تجريبية'}</button><p role="status" className="text-sm">{status}</p></Card>
    <div className="grid gap-4 md:grid-cols-3"><Card title="النص والإجراءات">يُرسل request_id ثابت عند إعادة المحاولة، وsession في جسم الطلب. أفعال الأزرار تستخدم id وtarget_id وversion.</Card><Card title="الصوت">WebM/Opus وOgg/Opus وMP4/M4A AAC-LC وPCM WAV. الحد 90 ثانية و10 ميجابايت؛ يُرفع audio وmetadata عبر FormData.</Card><Card title="الخصوصية والحدود">المؤشرات مجمعة. النشرة الخاصة تحتاج جلسة، وh_show مثال عام مقصود. بيانات الديمو لا تثبت أثرًا ميدانيًا أو اعتمادًا من لتدوم.</Card></div>
    <section aria-label="مرجع API"><Suspense fallback={<LoadingSkeleton variant="card" />}><SwaggerReference /></Suspense></section>
  </div>
}
