import { lazy } from 'react'
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom'
import { AppShell, ErrorState } from './components'
import type { PageMeta } from './lib/pageMeta'

/* Each screen is its own chunk; the dashboard's charts never load on the chat screen. */
const ChatPage = lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const NashraPage = lazy(() => import('./pages/NashraPage').then((m) => ({ default: m.NashraPage })))
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function RouteError() {
  const error = useRouteError()
  return (
    <ErrorState
      className="mx-auto max-w-xl"
      title="صار خطأ غير متوقع في هذه الصفحة"
      error={error}
      onRetry={() => window.location.reload()}
    />
  )
}

/* Tab title and share text per route; AppShell applies them (src/lib/pageMeta.ts). */
const meta = {
  chat: {
    title: 'المحادثة',
    description: 'جرّب نَوء كما يصل للأسرة على واتساب: صوتية بالي انرمى، ومناسبة، وخطة قبل الذروة بيومين.',
  },
  dashboard: {
    title: 'لوحة لتدوم',
    description: 'مؤشرات الأثر وخريطة الأسابيع الحرجة والبث الحي من نَوء، أرقام مجمّعة بلا أي بيانات لأسرة بعينها.',
  },
  nashra: {
    title: 'نشرة هدر بيتك',
    description: 'نشرة الأسبوع لبيتك: أيام الخطر وسببها وخطة من 3 خطوات، وأكثر ما ينهدر عندكم.',
  },
  docs: {
    title: 'بوابة ال API',
    description: 'محرك نَوء جاهز للربط مع منصة لتدوم وتطبيقها: 15 نقطة موثقة بمعيار OpenAPI، مع مثال جاهز لكل نقطة.',
  },
  notFound: {
    title: 'الصفحة غير موجودة',
    description: 'ما لقينا هالصفحة. ارجعوا للمحادثة وجرّبوا نَوء.',
  },
} satisfies Record<string, PageMeta>

const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <ChatPage />, handle: meta.chat },
          { path: 'dashboard', element: <DashboardPage />, handle: meta.dashboard },
          { path: 'n/:id', element: <NashraPage />, handle: meta.nashra },
          { path: 'docs', element: <DocsPage />, handle: meta.docs },
          { path: '*', element: <NotFoundPage />, handle: meta.notFound },
        ],
      },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
