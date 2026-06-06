import React from 'react'

interface Props {
  src: string
  alt: string
  size?: 'md' | 'lg'
  className?: string
}

export const EntityThumb: React.FC<Props> = ({ src, alt, size = 'lg', className }) => {
  const sizeClass = size === 'lg' ? 'h-32 w-32' : 'h-14 w-14'

  return (
    <div
      className={[
        'shrink-0 overflow-hidden rounded-sm border border-rust/70 bg-chrome shadow-[inset_0_0_0_1px_rgba(154,90,50,0.35)]',
        sizeClass,
        className,
      ].filter(Boolean).join(' ')}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
