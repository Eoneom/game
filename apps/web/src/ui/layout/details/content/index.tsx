import React from 'react'

interface Props {
  children: React.ReactNode
}

export const LayoutDetailsContent: React.FC<Props> = ({ children }) => {
  return (
    <article className="details-content space-y-3 text-sm text-amber-dim [&_h1]:m-0 [&_h1]:text-xl [&_h1]:text-amber [&_h2]:m-0 [&_h2]:text-base [&_h2]:text-amber [&_h3]:m-0 [&_h3]:text-sm [&_h3]:text-label [&_p]:m-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-4">
      {children}
    </article>
  )
}
