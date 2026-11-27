import { FactionCode } from '@eoneom/api-client'

interface FactionTranslation {
  name: string
  /** Signup card copy (slices 036 / 037 / 039), for playable factions. */
  lore?: string
  playstyle?: string
}

export const FactionTranslations: Record<FactionCode, FactionTranslation> = {
  [FactionCode.THE_CONFEDERATION]: {
    name: 'La confédération',
    lore: 'Héritiers de l\'ordre d\'avant l\'effondrement, les citoyens de la Confédération rebâtissent ville après ville avec ce que les ruines leur laissent.',
    playstyle: 'Logistique supérieure : +10 % de transport, +5 % de vitesse hors combat',
  },
  [FactionCode.THE_TECHNOLOGICAL_SINGULARITY]: {
    name: 'Singularité technologique'
  },
  [FactionCode.THE_ASH_LITURGY]: {
    name: 'Liturgie des cendres'
  },
  [FactionCode.THE_SYMBIOSIS]: {
    name: 'La Symbiose',
    lore: 'Fusionnés au mycélium qui ronge les ruines, les colons de la Symbiose ne meurent jamais tout à fait : ils repoussent. Armées nombreuses, champignons abondants, plastique rare.',
    playstyle: 'Armées nombreuses, +10 % champignons, −10 % plastique',
  },
  [FactionCode.THE_BASTION_ORDER]: {
    name: 'L\'Ordre du Bastion',
    lore: 'Derniers héritiers d\'une armée d\'avant l\'effondrement, les soldats de l\'Ordre ne cèdent jamais un mur. Troupes lourdes et lentes, garnisons inébranlables, artillerie redoutée.',
    playstyle: 'Troupes lourdes, +15 % de vie en défense de ses villes',
  },
}
