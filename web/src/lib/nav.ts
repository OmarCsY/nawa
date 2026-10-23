import { SHOWCASE_HOUSEHOLD_ID } from './demo'

/** The four places to go, in the order they appear in the top nav (desktop) and the menus (mobile). */
export interface NavEntry {
  to: string
  label: string
  /** NavLink `end`: only the exact path counts as active. */
  end: boolean
  /** Path prefix that also marks this entry active (the bulletin has one URL per household). */
  match?: string
}

export const NAV: readonly NavEntry[] = [
  { to: '/', label: 'المحادثة', end: true },
  { to: '/dashboard', label: 'لوحة لتدوم', end: false },
  { to: `/n/${SHOWCASE_HOUSEHOLD_ID}`, label: 'نشرة أسرة', end: false, match: '/n/' },
  { to: '/docs', label: 'ال API', end: false },
]

export const isActive = (entry: NavEntry, pathname: string) =>
  entry.end ? pathname === entry.to : pathname.startsWith(entry.match ?? entry.to)
