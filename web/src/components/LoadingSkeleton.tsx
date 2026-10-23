import { cx } from '../lib/cx'

type Variant = 'text' | 'kpi' | 'card' | 'strip'

interface LoadingSkeletonProps {
  variant?: Variant
  /** Number of lines for `text`, or of blocks for `kpi`. */
  count?: number
  className?: string
  label?: string
}

function Bone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'block rounded-full bg-[linear-gradient(90deg,var(--color-line)_0%,var(--color-paper)_50%,var(--color-line)_100%)] bg-[length:200%_100%] motion-safe:animate-shimmer',
        className,
      )}
    />
  )
}

export function LoadingSkeleton({ variant = 'text', count = 3, className, label = 'جاري التحميل' }: LoadingSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-busy className={className}>
      <span className="sr-only">{label}…</span>

      {variant === 'text' && (
        <div className="space-y-3">
          {Array.from({ length: count }, (_, i) => (
            <Bone key={i} className={cx('h-3', i === count - 1 ? 'w-2/3' : 'w-full')} />
          ))}
        </div>
      )}

      {variant === 'kpi' && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="rounded-card border border-line bg-paper p-6">
              <Bone className="h-3 w-1/2" />
              <Bone className="mt-5 h-12 w-2/3 rounded-xl" />
              <Bone className="mt-4 h-3 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {variant === 'card' && (
        <div className="rounded-card border border-line bg-paper p-6">
          <Bone className="h-3 w-1/4" />
          <Bone className="mt-3 h-5 w-1/2" />
          <Bone className="mt-6 h-40 w-full rounded-2xl" />
        </div>
      )}

      {variant === 'strip' && (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 py-3">
              <Bone className="h-2.5 w-8" />
              <Bone className="h-4 w-5" />
              <Bone className="mt-2 size-6" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
