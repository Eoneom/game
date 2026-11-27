import React from 'react'

import { LayoutPage } from '#ui/layout/page'
import { useMyAlliance } from '#alliance/hooks'
import { NoAlliance } from '#alliance/no-alliance'
import { MyAlliance } from '#alliance/my-alliance'

/** Alliance page (slice 033). */
export const AlliancePage: React.FC = () => {
  const { data, isPending } = useMyAlliance()

  let content: React.ReactNode = <p className="m-0 text-sm text-label">Chargement…</p>
  if (!isPending && data) {
    content = data.alliance
      ? <MyAlliance alliance={data.alliance} viewerId={data.viewer_player_id} />
      : <NoAlliance cooldownUntil={data.cooldown_until} />
  }

  return (
    <LayoutPage>
      {content}
    </LayoutPage>
  )
}
