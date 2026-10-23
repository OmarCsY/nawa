import { cx } from '../lib/cx'

/** "نَوء" set large, with the three risk dots as its signature mark. */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <span className={cx('font-bold leading-none text-plum', compact ? 'text-2xl' : 'text-3xl')}>نَوء</span>
      <span aria-hidden className="flex items-center gap-[3px] pt-1.5">
        <span className="size-1.5 rounded-full bg-risk-low ring-1 ring-inset ring-muted/30" />
        <span className="size-1.5 rounded-full bg-risk-mid" />
        <span className="size-1.5 rounded-full bg-risk-high" />
      </span>
    </span>
  )
}
