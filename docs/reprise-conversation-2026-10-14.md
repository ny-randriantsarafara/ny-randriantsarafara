# Reprise — moteur conversationnel du portfolio

Dernière décision : Haiku a été explicitement choisi par l’utilisateur et configuré dans le CMS. Voir la section finale ; les mentions antérieures d’un choix en attente sont historiques.

## Demande et périmètre

Améliorer les réponses à l’intention du visiteur à partir des connaissances publiées du CMS, au-delà des réponses préparées. Réponses sobres et fiables. Garder le panneau de droite visible quand l’historique grandit. Tester et conserver ce compte rendu. Le dernier message autorise explicitement les tests et affinages, puis commit, push, création de PR et merge après validation. Aucun changement du modèle configuré dans le CMS approuvé à ce stade : une question est en attente. Le merge sur main déclenche automatiquement le staging selon la CI existante ; aucune mise en production manuelle demandée.

## Checkout

Travail dans `portfolio/` du hub `personal-hub/queenfish`, branche `fix/conversation-intent`, base `origin/main` au commit `cd45e1981d29843da5c5fbc193f2c8aaa17076fd`. Le hub épingle encore l’ancien portfolio `0859b70` : le changement de pointeur dans son statut reflète le checkout actuel, pas une livraison. Sous-module `the-media` également initialisé, sans modification. Ne pas intervenir dans The Media.

## Diagnostic vérifié dans le code

- `api/src/chat/prompt-builder.ts` : seules les étiquettes des expériences/projets sont transmises ; résumés, réalisations, dates et études de cas manquent. Les réponses préparées dominent donc le contexte.
- `api/src/chat/openai-compatible-model.ts` : instructions, données et historique sont mélangés dans un unique message utilisateur.
- `api/src/chat/model-output-schema.ts` : `blocks.items` est un objet sans propriétés, envoyé avec `strict: true`. La documentation officielle exige des objets fermés et des propriétés obligatoires : <https://developers.openai.com/api/docs/guides/structured-outputs>. Risque de refus fournisseur et repli scripté ; pas encore une preuve du comportement déployé.
- `site/src/components/chat/conversational-shell.tsx` : les colonnes grandissent avec la page ; aucun défilement indépendant sur desktop.

## Changements locaux

- `api/src/chat/prompt-builder.ts` : toute la publication active, localisée dans la langue de réponse, est transmise avec les relations entre expériences, projets, compétences et chiffres. Historique encodé en JSON ; langue des relances courtes héritée des messages du visiteur. Consignes de synthèse ciblée, clarification et incertitude, sans copier les réponses préparées.
- `api/src/chat/openai-compatible-model.ts` : consignes dans un message système distinct des données et de la conversation.
- `api/src/chat/model-output-schema.ts` : schéma strict des huit types de cartes ; champs optionnels transmis comme null puis normalisés vers le contrat public. Aucune suggestion obligatoire.
- `api/src/chat/model-reply.ts` : déduplication, deux cartes et deux suggestions au maximum pour les réponses du modèle ; références inconnues toujours rejetées. Les limites de budget, le timeout, les sujets sensibles et les replis restent actifs.
- `api/src/chat/chat-service.ts` : même langue contextuelle pour le prompt et les réponses normalisées.
- `site/src/components/chat/{conversational-shell,conversation-log}.tsx` : sur desktop, zone à hauteur de fenêtre avec historique et panneau de droite défilant indépendamment ; saisie et en-tête restent visibles. Le panneau d’accueil peut lui aussi défiler sur les écrans peu hauts ; cette régression a été détectée puis corrigée pendant la revue. Mobile conserve son flux vertical et ses cartes intégrées.
- Tests associés dans `api/src/chat/` et `site/e2e/conversation.spec.ts`.

## Vérifications effectuées le 14 octobre 2026

Dépendances installées via `corepack pnpm install --frozen-lockfile` (Node 24.14.0 ; utiliser Corepack, le `pnpm` global est en version 9).

Tests de régression observés en échec avant correction : connaissances manquantes en FR/EN, historique non structuré, absence de message système, schéma de cartes incomplet, champs null refusés, suggestions imposées, doublons et langue des relances. Le test navigateur initial a constaté un panneau à y = -2764 pixels après cinq échanges.

Résultats après correction :

- `corepack pnpm test` : **422 tests** dans 96 fichiers passent, dont 165 API et 115 site ; inclut les tests unitaires du CMS, de son provisioning et de son extension.
- `corepack pnpm typecheck` : tous les packages passent, y compris les types des tests d’intégration CMS.
- `corepack pnpm lint` : passe.
- `corepack pnpm format:check` : passe.
- `corepack pnpm content:seed` puis `corepack pnpm build:site` : export statique généré.
- `corepack pnpm --filter @portfolio/site exec playwright test e2e/conversation.spec.ts` : **16 tests passent** (desktop, historique long, relecture d’anciens échanges, accueil sur écran 1280 × 600, mobile, FR/EN, clavier, quick view sans JavaScript, formulaires et repli local). Les appels API sont simulés dans ces tests.
- `git diff --check` : passe.

Une revue indépendante ciblée a trouvé le défaut d’accueil sur écran peu haut ; après correction et nouveau test navigateur, elle ne signale plus de point bloquant. Son serveur temporaire local a été arrêté. Deuxième revue : aucun blocage trouvé dans le produit ; deux défauts du script d’évaluation corrigés (attendre la télémétrie entre appels et compter les échecs des relances). Publication autorisée en cours.

## État distant observé et limites

Un GET sur `https://api.portfolio-staging.apps.nyhasinavalona.com/health` a donné `status: ok`, `directus: up`. Publication active `97365fcc-a2a4-4215-a853-e474d3ec95b9` : 7 expériences, 6 projets.

Un appel de test à `/chat` (question « What concrete backend work have you done for Eurosport? ») a répondu **mode scripted**, avec la réponse préparée `backend-apis`. Cela confirme le comportement signalé sur le staging existant ; il ne prouve pas la cause du repli. Les raisons de repli sont enregistrées dans `chat_exchanges`, pas exposées dans la réponse publique.

**Mise à jour : des essais réels du nouveau code sont en cours avec le fournisseur existant, sans déploiement ni changement de configuration du CMS.** Les tests de contrat et navigateur vérifient les données transmises et l’interface, pas la justesse sémantique ni la résistance réelle aux instructions malveillantes. Les secrets restent dans l’environnement du conteneur API staging : le script d’évaluation est bundlé localement puis exécuté en mémoire via `docker exec -i ... node --input-type=module -`. Aucun secret n’est copié ou affiché. L’intégration avec un Directus local réel (`test:cms`) n’a pas été lancée : aucun schéma, permission ou provisioning CMS modifié.

## Suite à reprendre

1. Lire ce fichier, le statut Git et la PR de `fix/conversation-intent` ; respecter les autres modifications si le checkout a changé. L’état distant final est à revérifier dans GitHub.
2. Avant toute démonstration, tester le nouveau moteur avec le fournisseur réellement configuré et la publication active : question ciblée absente des réponses préparées, relance « et la stack là-bas ? », comparaison de deux expériences, adéquation à une mission avec compétence non documentée, chiffre inventé, sujet sensible, tentative de changement de rôle, FR et EN. Vérifier réponse concise, preuves pertinentes, absence d’invention, mode model et coût/latence.
3. Si le moteur réel reste en mode scripted, lire les raisons enregistrées et vérifier configuration CMS, disponibilité fournisseur, schéma, budget et timeout. Ne pas confondre un repli opérationnel avec un échec de compréhension.
4. Commit, push, PR puis merge sont maintenant autorisés. Utiliser le compte GitHub personnel via un GH_TOKEN limité au processus, sans modifier l’auth globale. Ne pas enregistrer automatiquement le pointeur du hub. Le staging suit automatiquement main ; ne pas lancer la production.

## Affinages et diagnostic réel de la deuxième passe

Le connecteur Portfolio Staging a été testé en lecture. Schémas `model_settings` et `chat_exchanges` lus ; le modèle configuré est `z-ai/glm-5.3-flash:free`, prix zéro et timeout 10 s. Les échanges récents échouent avec `model_http_404`. Le catalogue OpenRouter actuel ne contient pas cet identifiant. C’est une cause confirmée des réponses préparées actuelles, indépendante du nouveau prompt.

`api/scripts/evaluate-chat.ts` exerce le vrai service, sa publication active, son budget et son enregistreur d’échanges. Il ne change pas les settings ; un override de test doit correspondre à un modèle actuellement gratuit dans le catalogue. Les cas couvrent question précise, relance, français, synthèse, compétence non documentée, faux employeur, tentative de changement de rôle, sujet sensible et projet IA légitime. Un repli opérationnel inattendu fait échouer la commande.

Premiers essais : Nemotron Super fournit une réponse Visa Insight pertinente mais proche du timeout et ajoute des détails de contrôles UI non documentés ; un autre cas dépasse 10 s. Liquid 2.6B est rejeté : réponses génériques, métriques rattachées au mauvais employeur et identifiants inconnus. Dots Note a dépassé 10 s sur les deux cas testés. Ces modèles ne sont pas déclarés fiables pour la démonstration sur la base de ces essais.

Consignes affinées : question courante explicite dans l’enveloppe, interdiction d’enrichir un résumé avec des détails techniques supposés, métriques attachées à leur source et suggestions seulement si les connaissances permettent d’y répondre. L’interface signale discrètement les réponses préparées de l’API, en plus de son repli local déjà signalé.

## Derniers résultats et publication

Le contrat JSON est maintenant construit depuis la publication active : les identifiants autorisés sont des enums, et les types de cartes nécessitant des collections vides sont retirés. Régression couverte par des tests. Le transport utilise effectivement ce schéma par publication. Le script d’évaluation attend chaque écriture de coût avant l’appel suivant et s’arrête si l’enregistrement échoue ; une relance en repli fait aussi échouer l’évaluation.

Après les consignes affinées et le schéma dynamique, Liquid répond plus précisément à Euronews et Visa Insight, mais introduit encore une interprétation causale non étayée dans la comparaison de couvertures. Il n’est donc toujours pas retenu. Aucun modèle du CMS n’a été changé. Une autorisation utilisateur de remplacement gratuit reste en attente ; ne pas interpréter son silence comme un accord.

La passe complète locale compte **422 tests unitaires**. Types, lint, format, build de l’extension Directus et build du site réussissent. Pour les 18 tests navigateur, employer **`corepack pnpm test:e2e`** : la commande racine active le suivi sur localhost avant le build. Une tentative avec un build ordinaire a donné 17/18 (pas de beacon localhost, désactivé par défaut), puis la commande conforme a donné **18/18 tests passés** ; ce n’est pas une modification du suivi.

Pour reproduire une évaluation, depuis `api/`, avec un `.env` privé déjà configuré : `node --env-file=../.env scripts/evaluate-chat.ts [modele-gratuit] [specific-en,specific-fr,...]`. Sans override, le modèle du CMS et ses tarifs sont utilisés. L’override ne persiste aucune configuration. Les résultats JSON sont à examiner sémantiquement ; un code zéro atteste le parcours opérationnel, pas la vérité de toutes les formulations.

Le staging suit main automatiquement ; le merge n’est pas une preuve que sa livraison est finie. La production requiert le workflow manuel distinct et n’est pas demandée ici. Le modèle absent du catalogue demeure une limite opérationnelle avant showcase, indépendamment de la correction logicielle.

## Haiku configuré et testé — 14 octobre 2026

L’utilisateur a demandé explicitement de sélectionner Haiku et de renseigner ses valeurs dans le CMS. Mise à jour effectuée par le connecteur Portfolio Staging puis relue :

- Modèle : `anthropic/claude-haiku-5.5`.
- Prix entrée : **0,089326 EUR / million** ; sortie : **0,446628 EUR / million**.
- Tarifs source OpenRouter : 0,10 / 0,50 USD par million. Conversion BCE du 14 octobre : 1 EUR = 1,1195 USD. Ce sont des estimations de coût en euros, sans frais annexes ; ne pas confondre USD et EUR.
- Timeout : **10 000 ms** ; plafond mensuel conservé.
- CMS : <https://cms.portfolio-staging.apps.nyhasinavalona.com/admin/content/model_settings/1>.

Le premier appel public a encore répondu en mode scripté : `model_http_400`. Diagnostic ciblé depuis le conteneur, sans sortir les clés : la route Google de Haiku rejetait un enum d’identifiants associé à `type: [string, null]` (`Enum value aws does not match declared type`). Correction : alternatives typées `anyOf` pour l’identifiant et null, sans mélanger les valeurs de types différents dans l’enum. Les références restent limitées à la publication ; une collection optionnelle vide ne produit aucun enum vide. Test de régression observé en échec puis passant.

Le code corrigé a été évalué en mémoire contre le vrai fournisseur et la publication active, avec les paramètres du CMS et la télémétrie de coût : **9 échanges sans erreur opérationnelle**, dont **8 en mode model** et **1 sujet sensible traité volontairement sans modèle**. Cas : question ciblée en anglais, relance contextuelle, métriques en français, comparaison des expériences, compétences non documentées, faux employeur, injection, sujet sensible et Visa Insight. Durées des appels modèle : environ **3,1 à 7,6 s**. Les métriques Euronews sont correctement distinguées ; la comparaison signale l’absence de métrique Eurosport ; la tentative de changement de rôle est refusée. Cela reste un échantillon, pas une garantie générale de justesse.

Checks locaux de la correction : **166 tests API passent**, types de tous les packages et format passent. La correction de compatibilité doit être publiée et livrée au staging avant que l’endpoint public utilise ce schéma ; vérifier la PR suivante sur `fix/conversation-intent`, ses checks et la livraison automatique, puis retester `/chat`. Aucun secret copié, aucune publication éditoriale effectuée, aucune production lancée.
