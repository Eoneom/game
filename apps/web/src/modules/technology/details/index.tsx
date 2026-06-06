import React from 'react'
import { Technology } from '#types'
import { TechnologyTranslations } from '#technology/translations'
import { technologyImageSrc } from '#technology/image'
import { Requirement } from '#requirement/index'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { Cost } from '#cost/index'
import { TechnologyDetailsResearch } from '#technology/details/research'
import { EntityThumb } from '#ui/entity-thumb'

interface Props {
  cityId: string
  technology: Technology
}

export const TechnologyDetails: React.FC<Props> = ({ cityId, technology }) => {
  const { name, description, effect } = TechnologyTranslations[technology.code]

  return <>
    <LayoutDetailsContent>
      <div className="flex gap-4">
        <EntityThumb src={technologyImageSrc(technology.code)} alt="" />
        <div className="min-w-0 flex-1 space-y-2">
          <h2>{name}</h2>
          <p>{effect}</p>
        </div>
      </div>
      <TechnologyDetailsResearch cityId={cityId} technology={technology}/>
      <p className='description'>{description}</p>
    </LayoutDetailsContent>

    <article className="mt-4 space-y-3 border-t border-rust/50 pt-3">
      <Requirement cityId={cityId} requirements={technology.requirement} />
      <Cost cityId={cityId} {...technology.research_cost}/>
    </article>
  </>
}
