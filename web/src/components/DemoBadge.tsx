import { cx } from '../lib/cx'

/** Required on every screen that shows numbers (docs/nawa_idea.md §14). */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      role="note"
      className={cx(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-saffron/30 bg-saffron-soft px-3 py-1 text-xs font-medium text-ink',
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-saffron" />
      بيانات تجريبية لعرض النموذج
    </span>
  )
}
