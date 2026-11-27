import React from 'react'

interface Props {
  src: string
  alt: string
  /** `sm` 40 px (movement troop rows, slice 045), `md` 56, `xl` 80, `lg` 128. */
  size?: 'sm' | 'md' | 'xl' | 'lg'
  className?: string
}

export const EntityThumb: React.FC<Props> = ({ src, alt, size = 'lg', className }) => {
  const sizeClass = size === 'lg'
    ? 'h-32 w-32'
    : size === 'xl'
      ? 'h-20 w-20'
      : size === 'sm'
        ? 'h-10 w-10'
        : 'h-14 w-14'

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
