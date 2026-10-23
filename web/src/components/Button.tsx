import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-plum text-sand hover:bg-plum/90 active:bg-plum',
  secondary: 'border border-line bg-paper text-ink hover:border-plum/40 hover:text-plum',
  ghost: 'text-plum hover:bg-plum-soft',
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3.5 text-sm' : 'h-10 px-5 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  )
}
