import React from 'react'
import { Link } from '@tanstack/react-router'
import classNames from 'classnames'

import { useCountUnreadReports } from '#communication/report/hooks'
import { useCountUnreadMail } from '#communication/mail/hooks'

const tabClass = (active: boolean) => classNames(
  'rounded-sm border px-3 py-1 text-caption uppercase tracking-wider transition',
  active
    ? 'neon-amber motion-safe-neon border-amber/50 bg-chrome text-amber'
    : 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber'
)

/** Rapports / Courrier switch on top of the inbox pages (slice 032). */
export const InboxTabs: React.FC<{ active: 'report' | 'mail' }> = ({ active }) => {
  const { data: unreadReports = 0 } = useCountUnreadReports()
  const { data: unreadMail = 0 } = useCountUnreadMail()

  return (
    <nav aria-label="Boîte de réception" className="mb-3 flex gap-1">
      <Link to="/inbox/report" className={tabClass(active === 'report')}>
        Rapports ({unreadReports})
      </Link>
      <Link to="/inbox/mail" className={tabClass(active === 'mail')}>
        Courrier ({unreadMail})
      </Link>
    </nav>
  )
}
