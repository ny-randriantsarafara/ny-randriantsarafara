# Évaluation des modèles gratuits OpenRouter — 15 octobre 2026

## Décision proposée

Le quota de **1 000 requêtes gratuites par jour est activé** sur le compte utilisé par le staging. Les essais n'ont augmenté aucune dépense : **39 tentatives**, **33 requêtes décomptées** par le compteur gratuit, **967 restantes**. La dépense journalière OpenRouter est identique avant et après ; les 21 réponses d'inférence complètes exposent toutes `usage.cost = 0`.

Pour des essais techniques gratuits, **Liquid** est le plus rapide des candidats testés et **Dots avec `reasoning.effort = none`** fonctionne également sur tout le parcours. Aucun des deux n'atteint une fidélité documentaire suffisante dans cet échantillon pour remplacer Haiku sur une démonstration du contenu. Un JSON accepté ne prouve pas que les faits sont exacts.

**Aucun réglage du CMS n'a été modifié.** Après les essais, le staging conserve `anthropic/claude-haiku-5.5`, effort par défaut et timeout de 10 000 ms. Aucun déploiement ni appel d'inférence à Haiku effectué pendant cette évaluation.

## Protocole et limites

- Moteur réellement présent dans le conteneur API staging, image du commit `7eb2faaf65a44777556adddc1ceeae5f2997a1cc`. Exécution de `api/scripts/evaluate-chat.ts` dans le conteneur ; secrets conservés dans son environnement.
- Publication active : `97365fcc-a2a4-4215-a853-e474d3ec95b9`. Les réponses ont été relues contre ses expériences, projets et réponses publiées, avec une deuxième lecture indépendante.
- Même prompt, schéma JSON construit à partir des identifiants publiés, validation locale, budget et enregistrement des échanges que le service. Le timeout fournisseur de 10 secondes reste actif.
- Parcours : migration Eurosport en anglais, relance contextuelle, métriques Euronews en français, comparaison Euronews/Eurosport, Rust/Kubernetes non documentés, faux employeur Google, injection, salaire sensible, Visa Insight. La relance ne part que si la première réponse modèle réussit. Le cas sensible est traité avant le modèle et n'entre pas dans les scores.
- Premier passage avec les paramètres par défaut. Deuxième passage : deux questions ciblées avec Dots `none` et Nemotron `low`. Puis les autres cas Dots `none` ; ce profil couvre donc les mêmes huit appels que Liquid, en deux exécutions. Gemma : deux questions, puis une reprise isolée après les autres essais.
- L'instrumentation temporaire vérifie l'identifiant `:free`, tous les prix annoncés à zéro et l'absence de modèle de repli ou d'outil ajouté. Pour les profils `none`/`low`, seul le paramètre de raisonnement est remplacé en mémoire dans la requête de test ; rien n'est persisté dans les settings.
- Les durées sont celles du service, incluant notamment la lecture du budget Directus. Ce ne sont ni des temps de premier token ni des mesures dans le navigateur. L'instrumentation peut observer des en-têtes HTTP 200 avant une expiration pendant la lecture du corps : le résultat final du service fait foi.

## Résultats opérationnels

« Acceptées » signifie `mode: model` avec une sortie validée par le moteur, y compris les issues `unknown`/`refused` normalisées. Cela ne constitue pas un score de vérité. Médianes sur tous les appels lancés du profil, erreurs comprises.

| Modèle                                   | Effort | Acceptées / appels | Durée médiane service | Échecs                          |
| ---------------------------------------- | ------ | -----------------: | --------------------: | ------------------------------- |
| `liquid/lfm-2.5-2.6b:free`               | Défaut |              8 / 8 |                4,94 s | Aucun échec opérationnel        |
| `dots-studio/dots-3-note-preview:free`   | Défaut |              4 / 8 |               11,89 s | 4 timeouts                      |
| `dots-studio/dots-3-note-preview:free`   | `none` |              8 / 8 |                6,75 s | Aucun échec opérationnel        |
| `nvidia/nemotron-3-super-120b-a12b:free` | Défaut |              1 / 7 |               12,52 s | 6 timeouts ; relance non lancée |
| `nvidia/nemotron-3-super-120b-a12b:free` | `low`  |              0 / 2 |               12,50 s | 2 timeouts                      |
| `google/gemma-4-31b-it:free`             | Défaut |              0 / 3 |                5,50 s | 3 HTTP 429                      |
| `google/gemma-4-26b-a4b-it:free`         | Défaut |              0 / 3 |                3,18 s | 3 HTTP 429                      |

Les reprises Gemma désignent `Google AI Studio` comme fournisseur à l'origine des erreurs, sans `Retry-After` ni cause détaillée. Le quota journalier du compte reste disponible ; la cause précise de la limitation amont n'est pas établie. Aucune conclusion sur leur qualité ou leur compatibilité JSON réelle n'est possible ici.

Les timeouts amènent parfois la durée service au-delà des 12 secondes d'attente du site. Une réponse acceptée par ce script n'est donc pas une preuve qu'elle aurait été affichée dans le navigateur.

## Qualité observée après normalisation

### Liquid

Les quatre métriques Euronews sont reprises correctement, mais le modèle affirme ensuite que la couverture TypeScript initiale est plus faible que la couverture globale : **20 % est pourtant supérieur à 5 %**. Il parle aussi de « votre période » alors qu'il doit répondre au nom du candidat.

La relance Eurosport ajoute des contrôles complets de cohérence entre les bases et attribue à cette mission une liste AWS plus large que les éléments contextualisés publiés. La double exécution est documentée ; ces contrôles complets ne le sont pas. Visa Insight devient une piste d'audit technique et une garantie de confiance, au-delà de l'espace de validation relié aux textes sources effectivement publié.

La synthèse est longue et utilise du Markdown malgré les consignes de concision et de texte simple. Plusieurs réponses omettent les cartes de preuves. Les doublons de cartes bruts sont supprimés par le moteur.

### Dots

Avec l'effort par défaut, la réponse anglaise à la migration contient des caractères chinois et affirme une double écriture simultanée ainsi qu'une capacité de rollback non documentées.

Avec `none`, les chiffres français sont corrects et les huit appels aboutissent, mais des ajouts subsistent : périmètre frontend/backend de la couverture, garantie de traçabilité/reproductibilité de chaque changement Visa Insight, validation de cohérence avant bascule. La synthèse propose aussi une question mêlant français et chinois. Les cinq réponses `answered` de ce profil renvoient toutes une carte CV, peu pertinente pour les preuves demandées.

### Nemotron et protections

L'unique réponse complète de Nemotron distingue correctement absence de preuve publiée et absence d'expérience Rust/Kubernetes. Les autres appels ne permettent pas de juger sa fidélité.

Les textes des issues `unknown`, `refused` et `sensitive` sont remplacés par les réponses prévues dans le CMS. Leur formulation sûre ne doit pas être attribuée au modèle. Aucun salaire n'a été demandé au fournisseur : le cas sensible a été intercepté par le moteur.

## Usage conseillé

Pour éviter les dépenses pendant les tests automatisés, conserver les réponses simulées et les tests déterministes ; ajouter les essais gratuits comme vérification réelle ponctuelle de connectivité, contrat, budget et repli. Les variations de disponibilité ne doivent pas rendre toute la CI dépendante d'un modèle gratuit.

Pour un staging exploratoire, Liquid est le premier candidat technique grâce à sa latence ; Dots `none` est une alternative, avec une latence plus élevée et des défauts de langue/cartes. Une telle sélection doit rester explicite et ne vaut pas validation de la fidélité du texte. Pour évaluer cette fidélité, le jeu de questions et les écarts ci-dessus doivent rester visibles.

Les 1 000 requêtes sont partagées entre modèles gratuits, avec une limite officielle de 20 par minute. Un quota disponible ne garantit pas la capacité du fournisseur. Les valeurs actives ont été relues via `GET /api/v1/key`. Sources : [limites OpenRouter](https://openrouter.ai/docs/api_reference/limits), [catalogue officiel](https://openrouter.ai/api/v1/models), [sorties structurées](https://openrouter.ai/docs/guides/features/structured-outputs), [raisonnement](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

## Traces

[Résultats détaillés JSONL](2026-10-15-free-models-results.jsonl) : profils et horodatages, sorties fournisseur sans raisonnement interne, réponses normalisées, latences, erreurs, coûts retournés et état du compte avant/après. Aucun secret n'est inclus.

Échantillon limité à une fenêtre d'essai, sans comparaison payante contemporaine, sans test de charge ni validation navigateur. Ces résultats ne garantissent pas le comportement futur des modèles ou de leurs routes gratuites.
