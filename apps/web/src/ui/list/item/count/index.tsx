import React from 'react'

import { ListItem } from '#ui/list/item'

interface Props {
  active: boolean
  name: string
  count: number
  onSelect: () => void
  image?: {
    src: string
    alt: string
  }
  badge?: string
  busy?: boolean
  /** Extra line under the count. */
  detail?: string
}

export const ListItemCount: React.FC<Props> = ({ count, detail, ...props }) => {
  return <ListItem {...props}>
    <p className="m-0 text-caption text-amber-dim">× {count}</p>
    {detail && <p className="m-0 text-meta text-label">{detail}</p>}
  </ListItem>
}
