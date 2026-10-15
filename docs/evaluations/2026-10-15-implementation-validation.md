# Validation locale du moteur CMS et des fournisseurs — 15 octobre 2026

Implémentation dans `portfolio`, branche `feat/cms-chat-optimization`, depuis `7eb2faaf65a44777556adddc1ceeae5f2997a1cc`. Aucun commit, push, déploiement, réglage CMS distant ou secret serveur installé.

## Changements livrables

- Profils privés OpenRouter, Google AI Studio et OpenAI, sélection atomique dans le CMS, mode legacy conservé et désactivation explicite. Secrets séparés par fournisseur, endpoints fixes, aucun retry ni bascule payante automatique.
- Contexte localisé compilé par publication, projection sans altération des faits conservés, contrat de preuves et cartes dérivées côté serveur. Repli opérationnel `unknown` sans carte factuelle approximative.
- Cache exact borné, désactivé par défaut, coordination des appels concurrents, contrôle de publication avant livraison. Usage et coût d'une génération comptés une fois ; consommation inconnue conservée à `null`.
- Bornes d'entrée/sortie CMS, délai modèle inchangé, budget et quota globaux conservés. Corpus synthétique indépendant du staging et runner isolé avec préflight gratuit et plafond strict.

## Vérifications effectuées

| Contrôle                                                | Résultat                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `corepack pnpm typecheck`                               | Réussi dans tous les packages                                    |
| `corepack pnpm lint`                                    | Réussi                                                           |
| `corepack pnpm format:check`                            | Réussi                                                           |
| `corepack pnpm test`                                    | Réussi, suites API/site/contenu/chat/CMS/provision/extension     |
| `corepack pnpm test:cms`                                | 74 tests réussis contre Directus/PostgreSQL locaux               |
| `corepack pnpm test:e2e`                                | Build du site et 18 tests Chromium réussis                       |
| `python3 -m unittest discover -s deploy -p 'test_*.py'` | 13 tests réussis                                                 |
| `actionlint .github/workflows/deploy.yml`               | Réussi, actionlint 1.7.12 temporaire, avec ShellCheck disponible |
| `git diff --check`                                      | Réussi                                                           |

La base locale a d'abord été provisionnée avec le code du baseline, puis mise à niveau et provisionnée une seconde fois. Un essai complémentaire a confirmé la copie unique d'un modèle legacy valide, la conservation d'un profil ensuite modifié et l'absence de sélection automatique. Les tests CMS vérifient l'édition par le propriétaire, les accès interdits à l'assistant/anonyme et la suppression du profil actif qui désactive le modèle.

La revue a corrigé deux défauts supplémentaires : chronométrage de la complétion jusqu'à réception/parsing du corps et suppression d'une réponse du cache si la publication change entre validation et livraison. Les régressions associées passent. Le test de runner démarre six processus Node ; son délai de test est distinct du timeout modèle de dix secondes.

## Validation réelle encore distincte

Les transports Google/OpenAI/OpenRouter ont été testés avec HTTP simulé, sans inférence réelle pendant l'implémentation. Cela ne valide pas les credentials ni les capacités d'un compte réel. La validation des preuves établit l'appartenance de la source et la présence de l'extrait ; elle ne démontre pas l'implication sémantique de toutes les phrases générées.

Le [rapport du corpus](implementation-cms-corpus.md) décrit le baseline isolé, les traces offline, les graines réservées et la revue humaine requise. Les timeouts injectés démontrent les invariants de repli ; ils ne mesurent ni la qualité d'un modèle ni ses p50/p95 réels. Aucun gain de fidélité ou d'économie en pourcentage n'est annoncé. L'activation du cache et le changement du fournisseur en ligne restent des opérations ultérieures.

Pour une livraison autorisée : provisionner les collections/champs/droits avant l'API, installer les clés uniquement côté serveur, conserver le mode legacy jusqu'à validation puis sélectionner explicitement le profil. Le cache reste faux par défaut. Retour arrière par `configuration_source = legacy` ou `disabled`, sans supprimer les profils ni les anciens champs.
