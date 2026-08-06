# Filet de sécurité pour le déploiement des migrations Supabase — Design

**Statut :** Design validé en dialogue avec la fondatrice (2026-08-05).

## Contexte

Le 2026-08-05, la migration `ordre_visite` (chantier de réorganisation de
tournée) a cassé `/ma-journee` en production : la colonne qu'elle ajoute
n'avait jamais été appliquée à la base réelle. L'hypothèse initiale — aucune
automatisation de déploiement des migrations n'existe — s'est révélée
incomplète après investigation en direct avec la fondatrice sur le tableau
de bord Supabase.

**Root cause réel :** Supabase Branching *est* configuré et lié au dépôt
GitHub (`dimsxm-cell/soinely-app`, branche `main` = branche de production),
et déploie normalement les migrations à chaque push. Mais son registre
interne (`supabase_migrations.schema_migrations`, ce qui détermine "quelles
migrations sont déjà appliquées") était désynchronisé du schéma réel depuis
le 2026-07-25 : le pipeline tentait de rejouer la toute première migration
du projet (`20260716000000_patients.sql`) et échouait immédiatement sur
`relation "patients" already exists`, sans jamais atteindre les 22
migrations suivantes — dont `ordre_visite`. Le désaccord venait très
probablement de corrections passées faites directement via l'éditeur SQL du
tableau de bord (comme celle faite plus tôt ce jour pour `ordre_visite`),
qui modifient le schéma sans jamais mettre à jour ce registre.

**Déjà fait, avant ce chantier :** le registre a été réparé en direct via
`supabase migration repair --status applied <22 versions>` (confirmé par
`supabase migration list` : les 28 migrations sont désormais alignées
Local/Remote). Le pipeline Supabase Branching devrait donc à nouveau
fonctionner tout seul sur le prochain push — mais rien ne vérifie qu'il
continue de fonctionner, et rien n'aurait signalé le désaccord initial avant
qu'il ne casse une page en production, deux semaines plus tard.

## Décision actée

Un filet de sécurité indépendant, pas un remplacement du mécanisme de
déploiement existant : la CI vérifie après chaque push sur `main` que le
registre distant Supabase correspond aux fichiers de migration locaux, et
fait échouer la build bruyamment si ce n'est pas le cas — pour qu'un
désaccord soit visible en quelques minutes, pas en plusieurs semaines.

La CI n'applique elle-même aucune migration : Supabase Branching reste le
seul acteur qui écrit sur le schéma de production. Faire écrire les deux en
parallèle risquerait une course entre deux processus modifiant la même base
au même moment.

## Architecture

### Nouveau job dans `.github/workflows/ci.yml`

Ajouté après le job `build-and-test` existant, dépendant de son succès
(`needs: build-and-test`), déclenché uniquement sur un push vers `main`
(jamais sur une pull request — une PR n'a pas encore de code en
production, vérifier son état de migration contre la prod n'aurait pas de
sens) :

```yaml
  verifie-migrations-supabase:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Verifie que les migrations locales sont appliquees en production
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: |
          npx supabase link --project-ref jeqrajpqbquewevjmond
          RESULTAT=$(npx supabase migration list --linked --output-format json)
          DESYNC=$(echo "$RESULTAT" | jq -r '[.migrations[] | select(.local != .remote)] | .[].local')
          if [ -n "$DESYNC" ]; then
            echo "::error::Migration(s) non appliquee(s) en production : $DESYNC"
            echo "Voir docs/superpowers/specs/2026-08-05-migrations-deploiement-design.md pour la procedure de reparation (supabase migration repair)."
            exit 1
          fi
          echo "Toutes les migrations sont synchronisees avec la production."
```

`jq` est préinstallé sur les runners `ubuntu-latest` de GitHub Actions —
aucune installation supplémentaire nécessaire.

Le ref du projet (`jeqrajpqbquewevjmond`) n'est pas une donnée sensible
(déjà visible publiquement dans `NEXT_PUBLIC_SUPABASE_URL`) : il reste en
clair dans le fichier, seul le jeton d'accès (`SUPABASE_ACCESS_TOKEN`) est
un secret GitHub — déjà généré et ajouté par la fondatrice.

### Format JSON vérifié en direct

`supabase migration list --linked --output-format json` rend
`{"migrations":[{"local":"20260714000000","remote":"20260714000000","time":"..."},...]}`
— vérifié sur le projet réel pendant ce chantier. Une migration non
appliquée en production a `local` et `remote` qui diffèrent (`remote` vide
dans l'affichage tableau équivalent) ; comparer les deux champs est donc un
test fiable, plus robuste qu'analyser le tableau texte.

## Cas limites

- **Nouveau désaccord détecté** : la build échoue avec un message listant
  précisément les versions non appliquées, et pointe vers ce document pour
  la procédure de réparation (`supabase migration repair`, déjà éprouvée
  ce jour).
- **Déclenché sur une pull request** : le job ne s'exécute pas du tout
  (`if: github.event_name == 'push'`) — pas de jeton exposé inutilement,
  pas de vérification qui n'aurait pas de sens avant que le code ne soit
  fusionné.
- **Jeton Supabase expiré ou révoqué** : le job échoue à l'étape
  `supabase link`, avant même la vérification — échec visible, pas silencieux.

## Tests

Pas de test automatisé unitaire : c'est un changement de configuration CI,
pas de code applicatif. La vérification se fait par exécution réelle : le
prochain push sur `main` (celui qui committera ce changement) déclenchera
le nouveau job, qu'on observera dans l'onglet Actions de GitHub — à la fois
pour confirmer que le job lui-même fonctionne, et pour confirmer enfin que
Supabase Branching redéploie proprement depuis la réparation du registre.

## Vérification manuelle

Après avoir poussé ce changement, ouvrir l'onglet **Actions** du dépôt
GitHub, confirmer que le job `verifie-migrations-supabase` se déclenche et
passe au vert. Ouvrir ensuite le tableau de bord Supabase
(`/project/jeqrajpqbquewevjmond/branches`) et confirmer que la branche
`main` affiche un nouveau run réussi (horodatage à jour, plus de triangle
d'avertissement).

## Alternatives écartées

- **Faire appliquer les migrations par la CI elle-même** (`supabase db
  push` au lieu d'une simple vérification) : écarté — Supabase Branching
  le fait déjà nativement sur push ; ajouter un second acteur qui écrit sur
  le même schéma risquerait une course entre les deux pipelines.
- **Bloquer la fusion de la pull request** plutôt que vérifier après coup
  sur `main` : écarté — avant fusion, le code n'est pas encore en
  production, donc rien à comparer à l'état réel de la base.
- **Alerte manuelle uniquement** (créer une issue GitHub, envoyer un
  message) au lieu de faire échouer la build : écarté par la fondatrice
  plus tôt dans la conception — un échec de build rouge, déjà surveillé,
  est plus difficile à ignorer qu'une notification de plus.

## Hors scope

- Ajout d'un environnement de staging distinct de production (aucun
  n'existe aujourd'hui, la fondatrice l'a confirmé).
- Rollback automatique d'une migration qui casse la production après
  déploiement — ce chantier détecte un désaccord, il ne gère pas l'échec
  d'une migration elle-même une fois appliquée.
