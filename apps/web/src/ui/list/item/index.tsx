import React from 'react'
import classNames from 'classnames'

interface Props {
  active: boolean
  name: string
  onSelect: () => void
  children?: React.ReactNode
  image?: {
    src: string
    alt: string
  }
  badge?: string
  busy?: boolean
}

export const ListItem: React.FC<Props> = ({
  active,
  name,
  onSelect,
  children,
  image,
  badge,
  busy,
}) => {
  return (
    <article
      className={classNames(
        'item flex cursor-pointer flex-col overflow-hidden rounded-sm border transition hover:-translate-y-px',
        active
          ? 'border-amber/60 bg-chrome text-amber'
          : busy
            ? 'border-amber/40 bg-chrome-2/80 text-amber-dim hover:border-amber/60'
            : 'border-rust/40 bg-chrome-2/80 text-amber-dim hover:border-rust',
        active && 'neon-amber motion-safe-neon'
      )}
      onClick={() => onSelect()}
    >
      {image ? (
        <div className="relative aspect-square w-full overflow-hidden border-b border-rust/50 bg-chrome">
          <img
            src={image.src}
            alt={image.alt}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {badge ? (
            <span className="absolute right-1.5 top-1.5 rounded-sm border border-amber/50 bg-chrome/90 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wider text-amber">
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-2">
        {!image && badge ? (
          <span className="self-start rounded-sm border border-amber/50 bg-copper/30 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wider text-amber">
            {badge}
          </span>
        ) : null}
        <h3 className="m-0 line-clamp-2 text-sm leading-snug text-amber">{name}</h3>
        {children}
      </div>
    </article>
  )
}
