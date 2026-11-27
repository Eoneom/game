import React from 'react'

interface ListGroup {
  id: string
  title: string
  items: React.ReactNode
}

interface Props {
  inProgress?: React.ReactNode
  items?: React.ReactNode
  /** Rendered instead of `items`: one titled grid per group. */
  groups?: ListGroup[]
}

const ListGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="list grid grid-cols-2 gap-2 sm:grid-cols-3">
    {children}
  </div>
)

export const List: React.FC<Props> = ({ inProgress, items, groups }) => {
  return <>
    {inProgress}
    {groups
      ? groups.map(group => (
        <section key={group.id} className="space-y-2">
          <h3 className="m-0 mt-3 text-caption uppercase tracking-wider text-label">{group.title}</h3>
          <ListGrid>{group.items}</ListGrid>
        </section>
      ))
      : <ListGrid>{items}</ListGrid>}
  </>
}
