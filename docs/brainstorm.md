# Brainstorm — évolutions du jeu (novembre 2026)

Document de travail : décisions prises et questions encore ouvertes. Chaque thème deviendra une ou plusieurs specs `specs/026+`.

## Décisions prises

### Plasma

- Produit par l'**inducteur central** (déjà en place), stock illimité, jamais dépensé aujourd'hui.
- Devient la **ressource avancée** : technologies avancées, défenses lourdes, unités d'élite.
- **Entretien** : certaines défenses consomment du plasma (batterie plasma par combat, bouclier).
- **Pillable à 25 %** (le reste est protégé).
- **Pas** de taxe de bourse en plasma (pas de taxe du tout).
- Spec : [`026-plasma-economy`](../specs/026-plasma-economy/spec.md) — moteur seulement (aucun contenu existant ne coûte de plasma), stockage par ville, remboursement comme les autres ressources, production inchangée.

### Technologies (nouvelles branches)

| Branche | Technologies |
| --- | --- |
| Arsenal | Alliages balistiques (+% attaque), Blindage organique (+% vie), Propulsion tactique (+vitesse combat) |
| ~~Doctrine~~ | Retirée pour l'instant (*Assaut de siège* reste prévu avec les défenses, 029) |
| Fortification | Débloque les défenses, +vie des structures, *Contre-mesures* (−butin perdu) |
| Renseignement | *Espionnage* (mission éclaireur → rapport de composition, sert d'aperçu d'attaque), *Détection* (alerte attaque entrante) — spec [`030-intelligence`](../specs/030-intelligence/spec.md) : rien sans Détection, rapport selon l'écart Espionnage − Détection, échec aléatoire |
| Plasma | Confinement plasma (rendement inducteur), Armes à plasma (unité d'élite par faction) |
| Économie | Recyclage avancé, Agronomie, Compression (entrepôts) |

Écarté : *Cartographie* (attendre la refonte de la carte).

Spec : [`027-military-economy-technologies`](../specs/027-military-economy-technologies/spec.md) — Arsenal et Économie. Bonus modérés et linéaires sans plafond ; plasma pour Arsenal seulement ; production bonifiée en villes et avant-postes. Doctrines retirées pour l'instant ; *Armes à plasma* et unités d'élite → spec dédiée ; *Assaut de siège* → 029.

### Bâtiments de ville

- **Comptoir d'échange** : prérequis de la bourse ; niveau → nombre d'ordres ouverts.
- **Centre de commandement** : plafond de **mouvements simultanés** et longueur de la file de recrutement.
  - Le plafond s'applique **à tout le joueur** ; chaque centre construit dans une ville l'augmente (cumul entre villes).
  - Ordre de grandeur à équilibrer : 2 de base, +1 par niveau de centre.
  - Spec : [`028-command-center-shelter`](../specs/028-command-center-shelter/spec.md) — plafond 5 + somme des niveaux de centre ; IA soumise au plafond ; file de recrutement de 3 dès le niveau 1 ; abri = quantité fixe par niveau, pillage sur le reste.
- **Abri souterrain** : protège une part des ressources du pillage.

Écarté : tour d'observation.

### Défenses de ville

- Couche **séparée** des bâtiments (onglet « Enceinte », emplacements propres, hors des 100 de la ville).
- Défenses en **quantité** (comme des troupes), **destructibles en combat**, donc à **reconstruire**.
- Catalogue de départ : Rempart, Tourelle, Batterie plasma, Champ de mines, Bouclier énergétique.
- Le siège passe par la stratégie *Assaut de siège* (machines de guerre renforcées), sans bonus passif.
- **Uniquement en ville** (pas sur les avant-postes).
- Construction via une **file de fortification** par ville ; un bâtiment « Enceinte » fixe la capacité en points de défense.
- En combat : nouveau rôle `structure` (immobile) dans le snapshot.
  - Rempart : grosse réserve de vie, encaisse en premier.
  - Tourelle : dégâts à chaque round.
  - Champ de mines : tire au round 1 seulement, puis consommé.
  - Batterie plasma : consomme du plasma à chaque round de tir ; inactive sans plasma.
  - Bouclier : réduit les dégâts reçus tant que le générateur survit.
- Si l'attaquant gagne : les défenses restantes sont **détruites**. À revoir quand les conséquences d'une victoire (occupation ou pillage seul) seront précisées.
- Spec : [`029-city-defenses`](../specs/029-city-defenses/spec.md) — seules les défenses armées (tourelle, batterie) empêchent la victoire ; stratégie *Assaut de siège* pour tous, sans bonus passif ; seule la batterie consomme du plasma ; l'IA construit remparts et tourelles.

### Factions

- Singularité et Liturgie des cendres **restent non jouables** (factions système).
- **Créer 2 nouvelles factions jouables** en plus de la Confédération :
  - **La Symbiose** : colonie humaine fusionnée au mycélium. Unités de masse, régénération après combat, bonus champignons, défenses organiques. Style défensif et d'usure.
  - **L'Ordre du Bastion** : héritiers d'une armée d'avant l'effondrement. Défenses moins chères et plus solides, infanterie lourde, unités lentes. Style forteresse.
- Par faction : 9 unités (5 rôles civils + 4 classes de combat) avec illustrations, 1 unité d'élite plasma, 1 défense propre, 1 bonus passif.

### Alliances (nouveau concept)

- Une **Alliance** regroupe plusieurs joueurs **d'une même faction**, **sans plafond de membres**.
- Rôles chef / officier / membre ; entrée sur invitation ou candidature.
- Chat d'alliance, classement d'alliance, liste des membres et positions.
- Nouvelle action de mouvement **« renforcer »** : stationner ses troupes dans la ville d'un allié ; elles défendent avec sa garnison.
- Note glossaire : `CONTEXT.md` interdit aujourd'hui « alliance » comme synonyme de Faction ; il faudra ajouter **Alliance** comme terme distinct.

### Social

- **Classement** : score global + Militaire + Économie, classement des factions et des alliances. **Joueurs système exclus.**
- **Messagerie** : courrier simple vers n'importe quel joueur ; **chat** global, de faction et d'alliance.
- **Bourse de faction** : ordres d'échange entre joueurs de la même faction, livraison **uniquement par transporteurs** (trajet réel, interceptable).

### Vue globale de l'empire

- Tableau de toutes les villes et avant-postes : stocks, production/min, files, garnisons, mouvements, attaques entrantes.

### Sécurité (passe dédiée, plus tard)

- Mots de passe, expiration de session, jeton WS en query string, rate limiting, validation des entrées, multi-comptes (critique avec la bourse), modération du chat.

### Écarté pour l'instant

- Saisons, tutoriel, notifications, simulateur côté joueur.
- Vision partagée entre membres d'une alliance.
- Doctrines (nouvelles stratégies de combat *Flanc mobile*, *Guerre d'usure*).

## Questions ouvertes

- Conséquences d'une victoire sur une ville : occupation ou pillage seul ? (impacte le sort des défenses)
- Factions : noms des unités, bonus passifs chiffrés, défense propre et unité d'élite de chacune.
- Classement : formule de score.
- Bourse : forme des ordres, interception des convois.
