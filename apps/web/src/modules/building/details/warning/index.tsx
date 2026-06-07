import React from 'react'

interface Props {
  energyUpgradeWarning: boolean
}

export const BuildingDetailsWarning: React.FC<Props> = ({ energyUpgradeWarning }) => {
  if (!energyUpgradeWarning) {
    return null
  }

  return (
    <div className="space-y-2 rounded-sm border border-danger/50 bg-danger-deep/25 p-2">
      <p className="m-0 text-sm font-semibold text-danger" role="status">
        Attention : ce niveau consommera plus d&apos;énergie que la ville n&apos;en produit. La production pourra être réduite.
      </p>
    </div>
  )
}
