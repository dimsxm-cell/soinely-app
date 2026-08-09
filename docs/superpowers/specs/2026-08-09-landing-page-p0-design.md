# Landing page — passe P0 (spec 10/10) — design

## Contexte

Deux dossiers PDF (identiques en contenu) ont été fournis :
« SOINELY — Landing Page — Dossier final UI/UX & implémentation développeur —
Version 10/10 ». Un audit complet a comparé les 16 sections de cette spec à
l'état réel de `components/marketing/`, `app/page.tsx` et `app/layout.tsx`
(publié en artefact). Résultat : 14 points déjà conformes, 11 partiels, 19
manquants.

La spec ordonne le travail restant en trois vagues (P0/P1/P2). Cette spec
couvre **uniquement les 8 items P0 restants** (les items 1 « colibri » et 2
« retirer .com » sont déjà faits — confirmé par l'audit, aucune trace de
raton laveur ni de `.com` dans le code).

## Décisions actées avec l'utilisateur

- **Vidéo produit (P0 #7)** : aucun fichier vidéo n'existe. On construit le
  vrai composant lecteur (balise `<video>`, poster, lecture au clic, piste
  de sous-titres) branché sur un espace réservé — prêt à recevoir un
  fichier réel plus tard, sans jamais prétendre qu'une vidéo existe déjà.
- **« 100 premiers IDEL testeurs » (ListeAttente.tsx)** : c'est un vrai
  plafond de bêta — le chiffre reste inchangé, aucune action requise.

## Périmètre de cette spec (P0 #3 à #10)

| # spec | Item P0 | Traité ici |
|---|---|---|
| 1 | Raton laveur → colibri | Déjà fait, hors périmètre |
| 2 | Retirer `.com` | Déjà fait, hors périmètre |
| 3 | Retirer Tarifs de la navigation | ✅ |
| 4 | Harmoniser tokens couleurs/typo/spacing | ✅ (introduction + migration des fichiers touchés par cette passe) |
| 5 | Corriger responsive mobile | ✅ (menu burger — le seul gap concret identifié par l'audit) |
| 6 | Vérifier accessibilité formulaires/navigation | ✅ (accès clavier au menu mobile ; le reste était déjà conforme) |
| 7 | Remplacer/préparer la vraie vidéo produit | ✅ (lecteur réel, sans fichier) |
| 8 | Vérifier les affirmations sécurité/conformité | ✅ (corrige le footer, ajoute une section Sécurité dédiée) |
| 9 | Optimiser Core Web Vitals | ✅ (passe d'hygiène de code — la mesure réelle reste hors de portée d'une lecture de code) |
| 10 | CTA bêta cohérent partout | ✅ (unifie le texte des CTA, ajoute les sections Bénéfices et CTA final manquantes qui portent ce CTA) |

**Explicitement hors périmètre** (nécessitent du contenu qui n'existe pas
encore, et qu'il serait risqué d'inventer) :
- Pages FAQ, Contact et Mentions légales — le footer de la spec les liste,
  mais les créer exigerait des informations légales/juridiques
  (raison sociale, SIRET…) que `app/confidentialite/page.tsx` marque déjà
  explicitement « à valider ». Un lien de footer vers une page inexistante
  serait pire que son absence.
- SEO complet (sitemap.xml, robots.txt, Open Graph, JSON-LD, canonical) —
  c'est l'item P1 #17 de la spec, pas P0. Reste un futur chantier séparé.
- Smartphone sticky au scroll (§2.3), micro-interactions avancées,
  compteur de temps gagné — tous P1, hors périmètre.

## Architecture des changements

### 1. Tokens de design (`app/globals.css`)

Ajouter au bloc `@theme` existant les tokens de la palette cible de la
spec, **sous les noms `--color-soinely-*`** pour ne pas entrer en conflit
avec `--color-brand-violet`/`--color-brand-rose` déjà utilisés par le
reste de l'application (hors landing page) :

```css
@theme {
  /* ... tokens existants inchangés ... */

  --color-soinely-purple-900: #3F1D78;
  --color-soinely-purple-800: #51258F;
  --color-soinely-purple-700: #6733A5;
  --color-soinely-purple-600: #7C4DCA;
  --color-soinely-purple-500: #9068D8;
  --color-soinely-lilac-200: #DDD0F3;
  --color-soinely-lilac-100: #F0EAF9;
  --color-soinely-lilac-050: #F8F5FC;
  --color-soinely-ink: #20182C;
  --color-soinely-text: #4E4658;
  --color-soinely-muted: #756D7D;
  --color-soinely-border: #E9E3EF;
  --color-soinely-canvas: #FCFAFD;
}
```

Pas de token `--soinely-gradient` (CSS `@theme` ne supporte pas les
valeurs `linear-gradient` comme couleur nommée) : le dégradé reste écrit
en dur (`linear-gradient(135deg,var(--color-soinely-purple-800),var(--color-soinely-purple-600))`)
dans les quelques endroits qui l'utilisent.

**Migration progressive, comme la spec l'autorise explicitement** ("si le
code actuel utilise des teintes très proches, les centraliser en
variables et migrer progressivement ; ne pas multiplier les variantes") :
seuls les fichiers modifiés par les tâches suivantes migrent leurs hex en
dur vers ces tokens. Le reste de `components/marketing/` (RangeeFonctionnalites,
JourneeAvecSoinely, EnTempsReel) n'est **pas** touché par cette passe —
ce serait un chantier de migration à part entière, hors périmètre P0.

### 2. Retirer Tarifs (`components/marketing/EnTeteMarketing.tsx`)

Supprimer l'entrée `{ href: "/abonnement", label: "Tarifs" }` du tableau
`LIENS_NAV`. Ajouter deux entrées pour pointer vers les nouvelles sections
(tâches 4 et 5) : `{ href: "#demo", label: "Démonstration" }` et
`{ href: "#securite", label: "Sécurité" }`.

Remplacer le CTA du header : `Se connecter` → `Rejoindre la bêta privée`
(même destination `/login` — la page gère déjà les deux modes Connexion/
Créer un compte via son sélecteur segmenté, donc les utilisateurs
existants ne perdent aucun accès).

### 3. Menu mobile (nouveau : `components/marketing/MenuMobileMarketing.tsx`)

Nouveau Client Component (`"use client"`) : bouton burger (hamburger ↔
croix), visible uniquement sous `lg:` (1024px), qui ouvre un panneau
plein-écran listant les mêmes liens que `LIENS_NAV` plus le CTA bêta.

- Fermeture au clic sur un lien, à la touche `Échap`, ou au clic sur le
  fond.
- `aria-expanded` sur le bouton, `aria-label="Menu"` /
  `aria-label="Fermer le menu"` selon l'état.
- Focus piégé dans le panneau tant qu'il est ouvert (basique : focus posé
  sur le premier lien à l'ouverture, restitué au bouton burger à la
  fermeture — pas de piégeage complet au Tab, hors scope pour une V1 de
  menu mobile).
- `prefers-reduced-motion` : la transition d'ouverture (translate/opacity)
  est supprimée, remplacée par un affichage instantané.

`EnTeteMarketing.tsx` reste un Server Component ; il importe et rend
`<MenuMobileMarketing liens={LIENS_NAV} />` à droite du logo, visible
uniquement sous `lg:` (le bouton « Rejoindre la bêta privée » reste
visible à toutes les tailles, comme aujourd'hui).

### 4. Lecteur vidéo réel (`components/marketing/VideoDemo.tsx`)

Remplacer la miniature statique + faux bouton play par un vrai lecteur :

- État par défaut : image poster (`video-thumb.webp`, déjà existante) +
  bouton play réel.
- Au clic : affiche une balise `<video controls>` pointant vers
  `/marketing/demo-produit.mp4` (fichier qui n'existe pas encore) et lance
  la lecture.
- Le composant devient un Client Component (`"use client"`) pour gérer cet
  état d'affichage (poster vs lecteur).
- Piste de sous-titres prête : `<track kind="subtitles" src="/marketing/demo-produit.fr.vtt" srcLang="fr" label="Français" default />`
  — le fichier `.vtt` n'existe pas non plus, mais la balise est en place.
- Le titre passe de « Découvrez SOINELY en action » à « 45 secondes pour
  découvrir une tournée avec SOINELY » (copie exacte de la spec §2.7).
- `id="demo"` sur la `<section>` pour le lien de nav du header.

**Comportement tant qu'aucun fichier vidéo n'est déployé** : le
navigateur affichera nativement ses contrôles vidéo par défaut avec une
erreur de chargement si la source 404 — c'est un état honnête (rien ne
prétend qu'une vidéo existe tant qu'elle n'a pas été déposée dans
`public/marketing/`), pas un état à masquer artificiellement.

### 5. Section Sécurité / confiance (nouveau, dans `app/page.tsx`)

Nouveau composant `components/marketing/SecuriteConfiance.tsx` : section
courte, fond clair, reprenant la formulation sûre de la spec §2.8 mot pour
mot :

> Conçu avec la confidentialité et la protection des données comme
> exigences de base.

Complétée par les 4 badges déjà existants dans `PiedDePageMarketing.tsx`
**à l'exception du badge « Conforme RGPD »** (voir tâche 6) — les 3
badges restants (« Données chiffrées », « Accès cloisonné », « Conçu par
des IDEL ») sont réutilisés ici, dans la section, pas seulement dans le
footer.

`id="securite"` sur la `<section>` pour le lien de nav du header.
Insérée dans `app/page.tsx` après `EnTempsReel` et avant `VideoDemo` (au
même niveau de séquence que les autres sections, chacune enveloppée dans
`<Reveal>`).

### 6. Corriger les affirmations non validées (`components/marketing/PiedDePageMarketing.tsx`)

- Retirer le badge « Conforme RGPD » du tableau `BADGES` (il migre en
  partie vers la nouvelle section Sécurité, sous une formulation qui ne
  prétend plus une conformité non validée — les 3 badges restants gardent
  leur formulation actuelle, déjà factuelle : « Données chiffrées »,
  « Accès cloisonné », « Conçu par des IDEL »).
- Ajouter le logo SOINELY (`LogoSoinely`) et une ligne
  `© SOINELY {new Date().getFullYear()}` en bas du footer — les deux seuls
  ajouts de §2.10 qui ne dépendent d'aucune page inexistante.

### 7. Hygiène Core Web Vitals (passe légère, plusieurs fichiers)

Pas de nouvelle mesure (impossible sans déploiement réel), mais une
vérification/correction ciblée :

- Toutes les balises `<Image>` de `components/marketing/` ont déjà des
  dimensions explicites (`width`/`height` ou `fill` + conteneur
  dimensionné) — à reconfirmer pendant l'implémentation, pas de
  changement anticipé si c'est déjà le cas.
- La vidéo de fond du hero (`Hero.tsx`, balise `<video>` native) n'a pas
  d'attribut `preload` explicite — ajouter `preload="none"` avec
  `poster="/marketing/hero-nurse.webp"` (déjà présent) pour éviter de
  télécharger la vidéo avant que le navigateur en ait besoin, cohérent
  avec la recommandation §9 de ne pas précharger autre chose que l'asset
  hero critique (ici, l'image poster suffit comme LCP candidate).

### 8. CTA cohérent partout (plusieurs fichiers)

Unifier le texte sur **« Rejoindre la bêta privée »** partout où la spec
le demande, sans toucher aux CTA qui ont un rôle différent (ex. les
boutons internes de démonstration produit dans `JourneeAvecSoinely.tsx`
ne sont pas des CTA de conversion, hors périmètre) :

- `EnTeteMarketing.tsx` : `Se connecter` → `Rejoindre la bêta privée`
  (tâche 2, déjà listé ci-dessus).
- `Hero.tsx` : CTA primaire `Essayer gratuitement` → `Rejoindre la bêta
  privée`. Ajout d'un CTA secondaire `Voir SOINELY en action`, lien
  d'ancre vers `#demo` (la nouvelle section vidéo), style bouton
  secondaire (fond blanc, bordure, texte violet — pas de dégradé, pour
  rester visuellement second par rapport au primaire). Micro-copy sous les
  CTA : remplacer les 3 badges dupliqués par la ligne unique de la spec
  `Bêta gratuite • Sans engagement` — supprime la duplication déjà notée
  par l'audit (les mêmes 3 items apparaissaient deux fois dans le fichier).
- `ListeAttente.tsx` : `Rejoindre la liste d'attente` → `Rejoindre la bêta
  privée`.
- Nouveau composant `components/marketing/CtaFinal.tsx` (spec §2.9) :
  fond violet profond (`--color-soinely-purple-900`), H2 « Vous prenez
  soin de vos patients. », accent « ELY prend soin de votre journée. »,
  texte et bouton `Rejoindre la bêta privée` exacts de la spec, micro-copy
  `Gratuit pendant la bêta • Sans engagement`. Placé juste avant
  `PiedDePageMarketing` dans `app/page.tsx`, après `ListeAttente` — les
  deux sections violettes se suivent déjà (déjà noté comme point
  d'attention par l'audit, section « à modifier » de la spec ; accepté
  comme compromis pour cette passe plutôt que de réordonner toute la
  page).
- Nouveau composant `components/marketing/Benefices.tsx` (spec §2.6) : 3
  cartes maximum — `Du temps retrouvé`, `Moins de charge mentale`,
  `L'essentiel à portée de main` — placées dans `app/page.tsx`
  **immédiatement après le Hero et avant `RangeeFonctionnalites`**,
  conformément à la règle de la spec « les bénéfices passent avant les
  listes de fonctionnalités ». `RangeeFonctionnalites` (les 6 cartes
  actuelles) n'est pas modifiée ni supprimée — elle reste la liste de
  fonctionnalités détaillée, complémentaire aux 3 bénéfices.

## Ordre des sections après cette passe (`app/page.tsx`)

```
EnTeteMarketing
Hero
Benefices          [nouveau]
RangeeFonctionnalites
JourneeAvecSoinely
EnTempsReel
SecuriteConfiance  [nouveau]
VideoDemo          [id="demo", lecteur reel]
ListeAttente
CtaFinal           [nouveau]
PiedDePageMarketing
```

## Tests

- `app/page.test.tsx` (existant) : les assertions sur les libellés de CTA
  (`/essayer gratuitement/i`, `/rejoindre la liste d'attente/i`) doivent
  être mises à jour vers `/rejoindre la bêta privée/i` — sinon elles
  échoueront après le changement de copie. Ajouter une assertion sur le
  nouveau CTA secondaire (`Voir SOINELY en action` → `href="#demo"`).
- `MenuMobileMarketing.tsx` (nouveau) : test dédié — le panneau est fermé
  par défaut, s'ouvre au clic sur le bouton burger (`aria-expanded`
  passe à `true`), se ferme à l'appui sur Échap, les liens qu'il contient
  correspondent à `LIENS_NAV` plus le CTA bêta.
- `VideoDemo.tsx` : test que le clic sur le bouton play remplace le
  poster par une balise `<video>` avec la bonne `src` et la piste de
  sous-titres.
- `PiedDePageMarketing.tsx` : test que « Conforme RGPD » n'apparaît plus
  nulle part dans le rendu, que le logo et le copyright sont présents.
- Pas de test dédié pour `Benefices.tsx`/`CtaFinal.tsx`/
  `SecuriteConfiance.tsx` au-delà d'un test de rendu basique (présence du
  texte exact de la spec) — ce sont des sections de contenu statique,
  cohérent avec le niveau de test des sections marketing existantes
  (`RangeeFonctionnalites`, `JourneeAvecSoinely`, `EnTempsReel` n'ont
  elles-mêmes aucun fichier de test dédié aujourd'hui).

## Hors périmètre (rappel)

Pages FAQ/Contact/Mentions légales, SEO complet (P1), smartphone sticky
(P1), analytics événementiel (P1 §11), formulaire bêta allégé distinct de
`/login` (question ouverte, pas encore tranchée — voir §12 de l'audit),
migration complète des tokens sur tous les fichiers marketing existants.
