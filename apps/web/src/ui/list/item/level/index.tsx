import React from 'react'

import { ListItem } from '#ui/list/item'

interface Props {
  name: string
  level: number
  active: boolean
  onSelect: () => void
  image?: {
    src: string
    alt: string
  }
  badge?: string
  busy?: boolean
}

export const ListItemLevel: React.FC<Props> = ({ level, ...props }) => {
  return <ListItem {...props}>
    <p className="m-0 text-xs text-amber-dim">Niv. {level}</p>
  </ListItem>
}
