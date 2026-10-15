# Corpus et baseline isolé — implémentation locale du 15 octobre 2026

Le snapshot `/tmp/portfolio-baseline-ZYPpuK` provient de `git archive 7eb2faaf65a44777556adddc1ceeae5f2997a1cc`, avant modification du moteur. Il contient uniquement les fichiers suivis de ce commit, avec liens vers les dépendances locales ; aucun secret n'a été copié. Ce répertoire temporaire ne constitue pas un artefact durable livré avec Git.

Le runner commun charge chaque moteur dans un processus Node séparé. Il reçoit la publication et la conversation JSON, appelle son `createChatService`, transmet le schéma produit par ce moteur à son propre transport et conserve la réponse publique et les échanges. Il n'impose aucun contrat JSON interne commun aux deux versions. Le cache de réponse est désactivé et chaque scénario utilise un processus neuf.

## Exécution déterministe effectuée

```sh
node api/scripts/evaluate-cms-corpus.ts --engine-dir=/tmp/portfolio-baseline-ZYPpuK --engine-sha=7eb2faaf65a44777556adddc1ceeae5f2997a1cc --variant=baseline --offline --seeds=7 --output=/tmp/cms-baseline-offline-isolated-complete.jsonl
```

Six scénarios ont terminé sans appel réseau. Le transport injecté simule un timeout. Pour une question sur `company-7-a`, le baseline fournit notamment `Coverage at company-7-b: 94%.` et une carte de cette autre entreprise. Les régressions du service exigent désormais le repli `unknown`, sans carte. Ce constat démontre le défaut de repli, pas la qualité d'une génération réelle. Le baseline n'implémente pas l'invariant de preuve du nouveau contrat ; on ne peut pas le déclarer vérifié grâce à cette trace.

## Reproduction et revue

Utiliser trois graines de développement par défaut (`7,23,61`) ; `--held-out` sélectionne les trois graines réservées (`101,137,193`). Chaque graine couvre correction, suppression, nouveau projet Rust, collections vides et contradiction publiée. L'oracle associe valeur, champ et entité ; il ne score pas une simple présence de nombres. Le texte contradictoire n'a volontairement aucun fait attendu certain.

Avec `--compare-engine-dir=/chemin/autre/moteur`, le runner alterne l'ordre des deux variantes à chaque scénario, avec exactement les mêmes entrées. Chaque tentative est écrite avant le transport et comprend les échecs sans usage. Le plafond est de 60 tentatives, et les départs réseau sont espacés de 3,2 secondes avant le chronométrage dans l'enfant. Les traces séparent attente, temps fournisseur et temps service. Le mode offline n'attend pas artificiellement entre les timeouts simulés.

La revue humaine reste requise pour les paraphrases, relations d'entreprise, langue, ambiguïtés, contradictions et pertinence des cartes. Les références internes ne figurent pas dans `ChatResponse` ; les tests unitaires de preuve et la revue du contenu complètent ces traces. Aucun score d'implication sémantique automatique n'est annoncé.

## Garde de coût et limites

Le mode réel exige une route exacte `:free`, toutes les catégories de prix explicitement nulles, une authentification et un quota gratuit de requêtes suffisant. Un solde monétaire ou `usage_daily` en dollars ne prouve pas un quota de requêtes. La garde exige le champ authentifié `free_model_daily_requests` (`used`, `limit`, `remaining`) documenté par [OpenRouter](https://openrouter.ai/docs/api/reference/limits). Elle refuse une réponse sans ce compteur, un compteur incohérent ou un nombre restant inférieur au budget demandé. Ce compteur ne doit pas être déduit de `is_free_tier`. Aucun contournement, modèle payant ou repli fournisseur n'est utilisé.

Les coûts fournisseur absents restent inconnus. Un tarif CMS nul n'est pas une preuve de facture fournisseur nulle. Aucune comparaison réelle de tokens, coût, p50/p95, timeout ou qualité modèle n'a été exécutée pendant cette implémentation ; aucun gain de performance n'est revendiqué. La mesure du cache répété et le corpus volumineux restent des validations distinctes, non couvertes par cette première trace de timeout.

## Vérifications locales complémentaires

Le lot ciblé `generalization.test.ts`, `corpus-engine.test.ts` et `evaluation-safety.test.ts` passe : 15 tests (avec la vérification du chronométrage complet). Une comparaison offline des deux moteurs a terminé sur les six mutations de la graine 7 (`/tmp/cms-paired-offline.jsonl`). Les durées de timeouts injectés ne sont pas des mesures d'inférence et ne justifient aucune conclusion de performance. L'optimisé rend `unknown` sans carte pour les erreurs opérationnelles ; le baseline peut rendre la réponse préparée d'une autre entreprise.

`--locale=fr` ajoute une question finale française en conservant l'historique périmé ; `--large` ajoute de la prose publiée pour éprouver la limite en octets sans supprimer de faits. `node api/scripts/summarize-cms-evaluation.ts /chemin/trace.jsonl` calcule les distributions et les totaux connus/inconnus séparément par variante. Le coût par réponse fidèle reste en attente de revue humaine.
