import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

/**
 * A number (with its % or sign) isolated as left-to-right, so the Arabic text around it can
 * never reorder it into "%37.9" or "2.3−".
 */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={cx('numerals', className)}>
      {children}
    </bdi>
  )
}
