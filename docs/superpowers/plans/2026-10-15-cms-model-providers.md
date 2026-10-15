# Plan d’implémentation — fournisseurs de modèle sélectionnables dans le CMS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven-development is an alternative only if delegation is explicitly selected. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Choisir OpenRouter, Google AI Studio ou OpenAI depuis le CMS, avec des configurations de modèles sauvegardées et des secrets uniquement côté serveur.

**Architecture:** Ajouter des profils éditables privés, sélectionner un seul profil actif depuis le singleton existant et router chaque requête vers un adapter explicite. Partager transport HTTP, parsing et gestion des erreurs lorsque le contrat est commun ; construire séparément les paramètres de chaque provider. Les optimisations du moteur restent indépendantes via une identité de provider/configuration.

**Tech Stack:** Stack actuelle Node 24+/TypeScript/Zod/Directus, `fetch` natif. Aucun SDK ou service supplémentaire nécessaire pour le transport JSON compatible documenté ; réexaminer cette décision si les fonctions nécessaires ne sont pas supportées par un endpoint.

**Spec:** Demande initiale de connecteurs, [recherche tarifaire](../../ai-provider-pricing-2026-10-15.md), [plan du moteur](2026-10-15-cms-chat-optimization.md). Statut : **plan proposé, non implémenté**.

**Suivi du 15 octobre :** implémentation locale et checks terminés ; détails dans le [rapport de validation](../../evaluations/2026-10-15-implementation-validation.md). Les cases ci-dessous constituent le plan d'origine ; les essais réels, la mesure des gains, l'activation et les commits/livraisons suggérés restent distincts et ne sont pas annoncés exécutés.

## Contraintes globales

- Même dépôt, base à vérifier, version Node/Corepack, standards TypeScript, périmètre Git et autorisations que le plan du moteur.
- Aucun secret, URL d’API arbitraire ou accès de publication ajouté au CMS. Aucun provider/modèle actif changé en ligne pendant le développement.
- Trois providers directs : OpenRouter, Google AI Studio et OpenAI. Anthropic/Grok restent accessibles via OpenRouter ; leur connecteur direct n’appartient pas à ce lot.
- Pas de fallback automatique vers un autre provider, surtout payant. Provider non configuré, profil incomplet ou effort incompatible : repli prudent, raison explicite.
- Sélection appliquée sous le cache existant de réglages de 30 s, sans reconstruction du site.
- Vérifier les documentations officielles au moment de l’implémentation : endpoints, capacités et noms de modèles évoluent. Aucun nom de modèle « actuel » codé en dur comme défaut universel.

## Décisions de configuration et compatibilité

Créer `model_provider_profiles` (collection privée) : `id` UUID, `name`, `provider`, puis les champs existants de modèle, prix entrée/sortie/cache, effort et timeout. Ajouter `max_input_bytes`, `max_output_tokens` et `response_cache_enabled` si le lot moteur est déjà intégré ; sinon les ajouter lors de ce lot ultérieur.

Dans `model_settings`, ajouter `configuration_source` (`legacy`, `profile`, `disabled`, défaut `legacy`) et la relation nullable `active_profile`. Le Studio affiche « Configuration actuelle », avec un sélecteur lisible de profil `name · provider · model`. Une fois le mode profil choisi, changer seulement le profil actif suffit à passer de Haiku/OpenRouter à Gemini ou à un autre modèle enregistré.

- `legacy` : conserver le comportement des variables `MODEL_API_BASE_URL`/`MODEL_API_KEY` et des anciens champs du singleton, pour OpenRouter.
- `profile` : lire exclusivement le profil actif. Relation nulle→modèle désactivé ; profil invalide/inaccessible→repli, **jamais** retour implicite au modèle legacy.
- `disabled` : aucun appel et aucun hit de réponse modèle.

La migration locale crée un profil depuis les valeurs legacy si aucun profil migré n’existe, mais ne change pas `configuration_source` ni la sélection du propriétaire. Ne pas écraser les profils existants aux provisions suivantes. Les anciens champs restent présents pour un retour arrière explicite.

## Tâche 1 — Profils privés et résolution des réglages

**Fichiers :** `cms/schema/src/records.ts`, `index.ts` si nécessaire, `cms/provision/src/schema/collections.ts`, `relations.ts`, `definitions.test.ts`, `cms/provision/src/access/policies.ts`, ses tests, nouveau `cms/provision/src/settings/ensure-model-profiles.ts` et son test ; `api/src/model-settings/model-settings.ts`, `directus-model-settings-source.ts` et leurs tests ; `cms/tests/src/model-settings.test.ts`.

**Interfaces :**

```ts
type ModelProviderId = 'openrouter' | 'google-ai-studio' | 'openai';
type ResolvedModelProfile = ModelSettings & {
  profileId: string | null;
  providerId: ModelProviderId;
  configurationFingerprint: string;
};
```

`ModelSettings` est le type existant, étendu par le lot moteur s’il est déjà intégré. L’empreinte couvre les paramètres lus et la version du contrat, sans clé API. Les branches `configured`, `disabled`, `invalid`, `unavailable` restent explicites.

- [ ] Écrire les tests de résolution legacy, profil, désactivation, relation supprimée et profil modifié. Vérifier que deux profils du même provider peuvent sauvegarder deux modèles distincts.

```ts
expect(resolveModelSettings({ configuration_source: 'profile', active_profile: null })).toEqual({
  status: 'disabled',
});
```

Pour ce test, définir d’abord le type de lecture discriminé par `configuration_source` ; ne pas contourner les champs manquants avec une assertion de type.

- [ ] Ajouter la collection, relation et champs, puis le provisioning idempotent. Réserver pour ce profil migré l’UUID `c4a040b6-e4a0-5b9a-8134-98be450983d2` dans le provisioning et ses tests ; rechercher cet ID, pas un nom éditable. Ne rien créer si la configuration legacy est désactivée ou invalide. Un second provision ne modifie jamais le profil déjà présent.
- [ ] Propriétaire : lire/créer/modifier les profils et sélectionner le profil actif. API : lire. Assistant : lire seulement, comme les réglages actuels. Anonyme : aucun accès. Ne donner aucun accès supplémentaire aux secrets.
- [ ] Lire singleton et profil lié dans une même requête relationnelle pour ne pas combiner sélection ancienne et profil nouveau. Valider à la frontière Directus, puis résoudre un snapshot immuable pour la requête.
- [ ] Vérifier l’invalidation du cache de réponses après modification de profil/effort/prix/provider et le délai de 30 s ; aucune lecture de réglage en milieu de génération.
- [ ] Lancer tests de provisioning/résolution et tests CMS locaux d’accès, migration et édition. Documenter les étapes Studio et la conservation du mode legacy.
- [ ] Commit suggéré : `feat(cms): manage saved model provider profiles`.

## Tâche 2 — Credentials et routage serveur

**Fichiers :** `api/src/environment.ts`, son test, nouveau `api/src/chat/model-provider.ts` et son test, `api/src/main.ts`, `chat-model.ts` si besoin, `.env.example`, `compose.yaml`, `deploy/compose.yml.j2`, `deploy/delivery_inputs.py`, son test, `.github/workflows/deploy.yml`, `docs/development.md`, `docs/delivery.md`.

**Interfaces :**

```ts
type ModelProviderCredentials = Partial<Record<ModelProviderId, { apiKey: string }>>;
type ModelRuntimeConfiguration = {
  credentials: ModelProviderCredentials;
  monthlyBudgetEur: number;
  dailyCallLimit: number;
  legacy: ModelProviderConfiguration | null;
};
type ModelProviderRegistry = {
  forProfile(profile: ResolvedModelProfile): ChatModel | null;
};
function createModelProviderRegistry(
  credentials: ModelProviderCredentials,
  fetchImpl: typeof fetch
): ModelProviderRegistry;
```

`ModelProviderConfiguration` désigne le type legacy actuel. Ajouter `modelRuntime: ModelRuntimeConfiguration | null` à l’environnement pendant la transition : il est nul quand aucune clé ni configuration legacy n’existe ; les budgets par défaut ne l’activent pas. Les appelants utilisent ensuite ce snapshot pour les gates globaux et le registre. Fixer les bases côté serveur : OpenRouter `https://openrouter.ai/api/v1`, Google `https://generativelanguage.googleapis.com/v1beta/openai`, OpenAI `https://api.openai.com/v1`. Conserver l’URL legacy uniquement dans le parcours legacy déjà configuré.

- [ ] Écrire les tests de provider configuré/non configuré et de sélection modifiée. Zéro appel réseau si la clé du provider sélectionné manque ; aucune clé d’un autre provider envoyée par substitution.
- [ ] Ajouter les secrets optionnels `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`. Garder `MODEL_API_KEY`/`MODEL_API_BASE_URL` pour le mode legacy ; pour un profil OpenRouter, accepter sa clé spécifique ou la clé legacy si sa base est bien celle d’OpenRouter. Refuser une ambiguïté de base.
- [ ] Découpler budgets/limites globales de la présence d’un unique provider : une instance avec seulement Gemini configuré doit utiliser les mêmes gates. Les clés des autres providers peuvent rester absentes.
- [ ] Propager les noms de secrets dans Compose, workflow et rendu de livraison, sans valeur réelle ni changement global d’authentification. Tester l’environnement avec un seul provider à la fois et avec les trois.
- [ ] Brancher le registre au snapshot de profil de chaque requête. Exposer `providerIdentity` non secret au moteur pour la clé de réponse exacte.
- [ ] Lancer `corepack pnpm --filter @portfolio/api test`, `corepack pnpm typecheck`, `python3 -m unittest discover -s deploy -p 'test_*.py'` ; ShellCheck/actionlint uniquement pour les fichiers shell/workflow réellement touchés.
- [ ] Commit suggéré : `feat(api): route model calls with provider-specific credentials`.

## Tâche 3 — Paramètres et erreurs propres à chaque provider

**Fichiers :** `api/src/chat/openai-compatible-model.ts`, son test ; nouveaux `api/src/chat/provider-parameters.ts`, `provider-parameters.test.ts` ; `model-provider.ts`, `model-settings.ts`, scripts d’évaluation.

**Interface :**

```ts
function createProviderParameters(
  providerId: ModelProviderId,
  request: ChatModelRequest
): Record<string, unknown>;
```

- [ ] Écrire les snapshots de payload à partir d’objets parsés par Zod, avec fetch simulé ; tester le modèle demandé, authentification, schéma exact, délai et plafond de sortie.

```ts
expect(openAiBody).not.toHaveProperty('session_id');
expect(openAiBody).not.toHaveProperty('reasoning');
expect(geminiBody).not.toHaveProperty('session_id');
expect(openRouterBody.session_id).toBe(request.sessionId);
```

- [ ] OpenRouter : conserver `session_id`, son breakpoint `cache_control` et son paramètre `reasoning`. Respecter les capacités/efforts du modèle choisi ; une désactivation de raisonnement ne se résume pas à masquer son affichage.
- [ ] OpenAI : message système texte sans `cache_control` Anthropic, aucun champ OpenRouter, effort au format officiel `reasoning_effort`, format JSON Schema strict ; adapter le nom du plafond de sortie au modèle réellement supporté. Vérifier les refus et troncatures sans perdre l’usage.
- [ ] Gemini : endpoint compatible officiel, système texte et JSON Schema, aucun champ OpenRouter. Mapper les efforts selon les capacités du modèle. Un modèle à raisonnement obligatoire ne doit pas recevoir une promesse « none » ; le profil est invalidé ou l’effort minimal est choisi explicitement par le propriétaire.
- [ ] Ne pas introduire de table périssable de tous les modèles dans le code. Vérifier les capacités lors de la configuration/évaluation ; conserver les erreurs explicites si une configuration devient incompatible.
- [ ] Partager timeout, HTTP, parsing, refus, usage et erreurs de sortie. Tester 400, 401, 429, 5xx, timeout, corps incomplet, JSON invalide, zéro coût gratuit et sortie non conforme ; aucune chaîne de retry ou de fallback payant.
- [ ] Lancer tests du transport, paramètres et registre ; typecheck et format. Les tests n’appellent pas les services réels.
- [ ] Commit suggéré : `feat(chat): adapt structured requests for Gemini and OpenAI`.

## Tâche 4 — Validation et livraison proposée

- [ ] Tester une base locale déjà provisionnée : ajout des profils, deuxième provision sans duplication, ancien mode inchangé, profils éditables seulement par le propriétaire, désactivation explicite et suppression du profil actif.
- [ ] Vérifier via le service un changement de profil avec les caches : aucune réponse OpenRouter réutilisée après sélection Gemini ou OpenAI ; aucun coût duplicaté sur hit/join.
- [ ] Exécuter les checks du dépôt : `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm format:check`, `corepack pnpm test`, `corepack pnpm test:cms`, `git diff --check`. Vérifier le rendu de livraison après ajout des secrets optionnels.
- [ ] Utiliser le corpus indépendant du plan moteur pour des essais réels explicitement demandés. OpenRouter gratuit seulement par défaut ; Google/OpenAI simulés tant qu’un budget réel n’est pas autorisé. Un mock vert ne prouve ni credentials ni compatibilité réelle d’un compte.
- [ ] Pour une livraison ultérieure autorisée : provisioning des collections et droits avant API, clés serveur installées avant sélection du profil, conservation du mode legacy jusqu’à validation. La sélection d’un nouveau provider dans le CMS reste une action distincte.
- [ ] Retour arrière : remettre explicitement `configuration_source = legacy`, puis restaurer l’image si nécessaire ; ne pas supprimer les profils ou les anciens champs. Le rollback d’image vide les caches mémoire.

## Ordre avec le plan moteur

Les profils/credentials peuvent être implémentés séparément du contexte compact. La preuve et la normalisation restent communes aux trois providers ; ne pas copier le moteur pour chaque fournisseur. Après intégration, une sélection CMS doit modifier de façon atomique identité, modèle, prix et paramètres utilisés dans le calcul ainsi que dans la clé de cache. Ne pas cumuler changements de provider, de modèle et de prompt dans une seule mesure comparative.
