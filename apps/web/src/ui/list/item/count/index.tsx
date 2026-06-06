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
}

export const ListItemCount: React.FC<Props> = ({ count, ...props }) => {
  return <ListItem {...props}>
    <p className="m-0 text-xs text-amber-dim">× {count}</p>
  </ListItem>
}
