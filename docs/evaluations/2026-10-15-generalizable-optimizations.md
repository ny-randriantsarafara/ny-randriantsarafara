# Optimisations du moteur pour un CMS évolutif

Recherche et essais du 15 octobre 2026. Aucune modification du moteur, des réglages CMS ou du déploiement. Les pistes d'implémentation ci-dessous restent à valider ; les gains non mesurés ne sont pas annoncés comme acquis.

## Conclusion

Le meilleur premier lot consiste à **préparer le contexte une fois par publication, retirer les métadonnées inutiles à l'inférence, réutiliser les réponses strictement identiques et construire les cartes à partir des preuves**. Ces règles dépendent du schéma et de la publication, pas des noms ou des chiffres du staging.

Une simple réduction du prompt n'a pas démontré une meilleure fiabilité. Les nouveaux essais ont également exposé deux limites génériques : les identifiants peuvent exister sans être pertinents pour la réponse, et le repli sur une réponse préparée peut répondre au sujet d'une autre entreprise. Ces problèmes doivent être traités avant de choisir un modèle gratuit pour la qualité du contenu.

Le périmètre généralisable est un contenu conforme au schéma du portfolio, dans les langues supportées. Une quantité illimitée de texte ou des affirmations contradictoires dans le CMS nécessitent des règles supplémentaires ; aucun modèle ne garantit simultanément coût et latence constants sur tout volume ou toute question.

## Mesures actuelles

Code inspecté : `origin/main` et conteneur API staging au commit `7eb2faaf65a44777556adddc1ceeae5f2997a1cc`. Publication mesurée : `97365fcc-a2a4-4215-a853-e474d3ec95b9`.

- Le contexte est déjà localisé en français ou anglais. Le message système est stable entre conversations d'une même langue et contient déjà un breakpoint de cache ; `session_id` est transmis. Le budget est déjà mis en cache 60 secondes et les réglages 30 secondes : ce ne sont pas de nouvelles optimisations à ajouter.
- Toute la publication est envoyée à chaque question. Les réponses préparées représentent environ 56 % des octets des connaissances localisées ; elles contiennent notamment leurs exemples de questions et leurs cartes d'affichage.
- En retirant seulement `answers[].sampleQuestions`, `answers[].blocks` et `answers[].starter`, les autres champs restent exactement identiques. La réduction est de **17,83 % des octets d'entrée en anglais**, **18,26 % en français**, schéma et consignes inclus. Aucun résumé par IA, suppression de texte factuel, de lien, de titre ou de description éditoriale dans cette projection. Les exemples restent disponibles dans le CMS et pour une éventuelle recherche locale.
- Échantillon historique des 50 derniers échanges Haiku enregistrés : médianes de **15 439 tokens d'entrée**, **562 de sortie**, **4 589,5 ms** de durée service. Ce n'est pas une comparaison contrôlée ; les coûts enregistrés sont des estimations applicatives.
- Les tarifs `cache_read_price_eur_per_million` et `cache_write_price_eur_per_million` sont encore `null`. Le calcul actuel les remplace alors par le tarif d'entrée normal. Si le fournisseur sert des hits ou facture des écritures, cette estimation ne suit pas leurs tarifs distincts. Cela n'établit ni l'absence de hits ni une économie réelle de facture.

Les détails sont dans [les mesures JSON](2026-10-15-optimization-measurements.json). Les pourcentages en octets ne sont pas des pourcentages démontrés de tokens, de facture ou de latence ; leur valeur changera avec le contenu.

## Essais hors du contenu staging

Quatre publications synthétiques valides selon `validatePublicationContent`, chacune essayée avec le prompt actuel et sa projection compacte, sur Dots gratuit avec `reasoning.effort: none`. Les données et les échanges synthétiques restent en mémoire ; aucune publication ou télémétrie synthétique n'a été écrite dans Directus. Le service, son schéma dynamique et sa normalisation sont ceux du conteneur. Le budget est simulé à « disponible » et les tarifs sont zéro : cet essai ne valide pas le budget réel.

| Cas                                  | Vérification et résultat                                                                                                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entreprises inédites                 | Aster Labs : 18 → 47 %, Beryl Studio : 6 → 81 %. Le prompt actuel attribue correctement les chiffres ; compact expire.                                                                                                                                  |
| Chiffre corrigé et historique périmé | Aster passe à 63 → 91 %, alors que l'ancien assistant dit encore 18 → 47 %. Les deux variantes donnent les nouvelles valeurs.                                                                                                                           |
| Source supprimée                     | Aster disparaît de la publication mais reste dans l'historique. Le prompt actuel retourne `unknown`. Compact expire et le repli répond avec les chiffres de Beryl : réponse hors sujet.                                                                 |
| Compétence nouvelle et distracteurs  | Ajout du projet Meridian, analyseur CSV écrit en Rust, avec douze entreprises supplémentaires. Compact décrit correctement Rust/CSV, mais cite les réponses Aster/Beryl et affiche le CV ; le prompt actuel expire et le repli répond au sujet d'Aster. |

Huit variantes exécutées : cinq réponses modèle, trois timeouts. Seule paire avec consommation retournée des deux côtés : le chiffre corrigé, **2 746 → 2 622 tokens d'entrée**, soit **−4,52 %** pour ce cas. Aucun gain général de fidélité ou de latence n'est démontré. Les durées de ce probe incluent son espacement anti-rate-limit et ne constituent pas un benchmark de production.

L'oracle initial vérifie notamment la présence des nombres, l'absence des anciennes valeurs et le projet attendu ; il ne démontre pas à lui seul l'association correcte des chiffres à chaque entreprise. Une lecture humaine indépendante a vérifié les sorties. Un futur oracle doit vérifier les associations par entité et les preuves, pas uniquement la présence de mots ou de nombres.

[Traces détaillées](2026-10-15-generalization-results.jsonl). Le champ final `attempts: 7` de l'instrumentation compte ses sept traces HTTP disponibles, pas les huit variantes exécutées ; un timeout sans réponse a échappé à cette trace. Les huit résultats `kind: case` font foi pour le nombre d'essais.

Le compteur gratuit passe de 967 à **961 requêtes restantes** ; la dépense journalière OpenRouter reste exactement inchangée. Aucun appel d'inférence payant n'a été lancé.

## Premier lot recommandé

### 1. Compiler un contexte fidèle par publication

Construire une représentation déterministe à l'activation d'une publication ou à son premier usage : textes dans la langue retenue, identifiants, relations, dates et périmètres des chiffres. Appliquer la projection conservative mesurée, sans remplacer les faits par un résumé généré ni supprimer toutes les réponses préparées : elles peuvent contenir des faits uniques.

Réutiliser contexte et schéma par `(publicationId, langue, version du contrat)` avec une mémoire bornée. Une nouvelle publication construit de nouvelles entrées ; un rollback retrouve les faits de sa publication immuable. Cette préparation réduit le travail local répété. Le gain d'inférence vient de ce qui est réellement omis du prompt, pas de la seule mémoïsation serveur.

### 2. Réutiliser les réponses strictement identiques

Cache applicatif court, borné en taille, après validation des réponses. Clé : publication, langue effective, historique complet, question, modèle/provider, paramètres de génération et versions des règles/schéma. Ne pas utiliser seulement le dernier message ni une similarité sémantique : « et là-bas ? » dépend du contexte. Appliquer les limites visiteur et la politique des sujets sensibles avant réutilisation.

Une nouvelle publication, une suppression ou un changement de politique invalide la clé. Fusionner les requêtes simultanées identiques en un seul appel. Sur un hit, aucun nouvel appel ni token d'inférence ; enregistrer ce hit et son coût additionnel nul, sans recopier le coût initial. L'infrastructure conserve son coût. Le gain global dépend du taux de répétition, encore inconnu.

OpenRouter propose également un response cache bêta, basé sur le corps de requête complet ; une clé applicative explicite facilite le contrôle de la publication et de la comptabilité. Ne pas cumuler les caches sans observabilité. [Response caching officiel](https://openrouter.ai/docs/guides/features/response-caching)

### 3. Relier réponses, preuves et cartes

Faire retourner les sources utilisées avec leur collection, identifiant, champ et extrait exact. Vérifier ces références dans la publication courante, puis construire les cartes côté serveur à partir de ces sources. Cela évite qu'une réponse sur un projet produise librement un bloc CV ou une preuve provenant d'une autre entreprise, et permet d'alléger le contrat de cartes confié au modèle.

Une référence valide et un extrait exact ne prouvent pas que toute la réponse est soutenue ou répond à la question. Pour les informations nécessitant une fidélité stricte, proposer un rendu extractif ou des valeurs structurées calculées côté serveur ; le texte naturel libre conserve un risque sémantique. Ne pas introduire de second appel « juge » sur toutes les réponses sans démontrer son bénéfice et son coût.

Les citations natives Anthropic ne sont pas compatibles avec Structured Outputs stricts ; des références applicatives sont adaptées au transport JSON commun. [Documentation citations](https://platform.claude.com/docs/en/build-with-claude/citations)

### 4. Rendre le repli prudent

Un timeout ou une erreur de fournisseur ne doit pas déclencher une réponse factuelle d'une autre entreprise sur la seule proximité de quelques mots. Lorsque les preuves de la réponse préparée ne couvrent pas la demande, retourner un message de limite ou une clarification. Le cas de suppression ci-dessus doit devenir une régression indépendante des noms d'entreprises.

Cette amélioration évite des réponses trompeuses et des retries inutiles. Elle ne transforme pas une absence de réponse en succès et ne garantit pas un meilleur taux de réponses complètes.

### 5. Mesurer le coût et piloter le raisonnement

Conserver les tokens d'entrée, lecture/écriture cache, sortie, raisonnement lorsqu'il est disponible, coût fournisseur, modèle réellement servi, hit applicatif et latence. Rapprocher les tarifs CMS des catégories réelles, notamment avant d'utiliser l'estimation pour bloquer le budget.

Haiku 5.5 facture l'entrée standard 0,10 $/million, les lectures cache 0,01 $, les écritures 5 minutes 0,125 $ et 1 heure 0,20 $ sous le seuil de long contexte. La lecture est dix fois moins chère sur les tokens concernés, pas sur la facture entière. [Tarifs officiels](https://platform.claude.com/docs/en/models/haiku-5-5/overview)

Ne pas remplacer systématiquement le TTL actuel de cinq minutes par une heure : il faut mesurer les intervalles et hits. Mesurer aussi le raisonnement désactivé/faible et un budget de sortie raisonnable par modèle, en comptant les troncatures. Masquer le raisonnement avec `exclude` ne supprime pas son calcul ; un budget trop bas peut empêcher la production du JSON. [Cache OpenRouter](https://openrouter.ai/docs/guides/best-practices/prompt-caching), [raisonnement](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)

## Quand le CMS grossit

Définir un budget de contexte par modèle, avec réserve de sortie. Tant que le contenu compact tient confortablement, conserver le contexte complet cachable : des extraits variables non cachés peuvent coûter plus cher. [Contexte complet et retrieval](https://www.anthropic.com/engineering/contextual-retrieval)

Si le volume le justifie, ajouter un index lexical local reconstruit par publication, utilisant aussi les exemples de questions retirés du prompt. Inclure les sources liées, l'inventaire des entités et le contexte des relances. Les synthèses doivent pouvoir élargir la sélection. Une source non retrouvée ne prouve jamais qu'une compétence n'est pas publiée. Comparer ensuite une recherche hybride uniquement si les paraphrases/langues montrent des omissions ; pas de base vectorielle ou de coût d'embeddings imposé d'emblée.

Les faits peuvent se répéter dans les expériences, projets et réponses préparées. Si une édition laisse des valeurs contradictoires dans la même publication, compaction et recherche ne résolvent pas le problème. Des métriques structurées liées à une source canonique, ou une demande de clarification, sont préférables à une sélection arbitraire de la valeur.

## Validation durable

Créer des corpus générés à partir du schéma, avec noms, identifiants, chiffres et relations variables. Le jeu d'évaluation doit inclure : corrections, suppressions, nouvelles compétences, permutation des lignes, distracteurs, corpus volumineux, collections vides, contradictions, changement de langue et anciens historiques. Réserver des corpus non utilisés pour ajuster les règles.

Vérifier séparément : fidélité par entité, pertinence des preuves/cartes, réponses aux absences de preuve, invalidation des caches, nombre d'appels, facture, tokens et latences p50/p95. Une baisse du coût moyen ne doit pas masquer davantage de replis ou de réponses fausses. Les tests de cache/invalidation doivent traverser le moteur public du module ; les évaluations réelles des modèles restent distinctes des tests déterministes et sont explicitement lancées sur des modèles gratuits pour les essais sans budget.

Ordre de réalisation proposé : **projection et préparation versionnée → cache exact et métriques → preuves/cartes et repli → évaluations variables → réglage du raisonnement → retrieval sous contrainte de volume**. Pas de promesse « toujours plus performant » : accepter une optimisation après mesure de son coût et de ses régressions sur plusieurs contenus.
