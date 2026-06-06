import React from 'react'

interface Props {
  inProgress?: React.ReactNode
  items: React.ReactNode
}

export const List: React.FC<Props> = ({ inProgress, items }) => {
  return <>
    {inProgress}
    <div className="list grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items}
    </div>
  </>
}
