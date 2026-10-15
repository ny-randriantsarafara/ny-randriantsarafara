# API conversationnelles pour le portfolio — vérification du 15 octobre 2026

Recherche documentaire en lecture seule, sources primaires. Aucun appel d'inférence, compte, quota personnel ni configuration de production vérifié. La version Haiku réellement utilisée par le portfolio reste inconnue ; une fixture ne prouve pas la configuration de production. Les prix ci-dessous sont en USD par million de tokens, tarif standard interactif, hors taxes, outils, cache et frais de paiement.

## Tarifs et exemple comparable

Exemple calculé : **1 000 conversations d'un échange**, chacune avec 3 000 tokens d'entrée facturés et 500 tokens de sortie facturés, soit 3 M d'entrée + 0,5 M de sortie. Coût = `3 × prix entrée + 0,5 × prix sortie`. Plusieurs échanges multiplient le coût et l'historique retransmis augmente l'entrée. Ce calcul compare des volumes de tokens identiques, pas des textes identiques entre tokenizers.

| Fournisseur / identifiant API direct                             | Entrée | Sortie | 1 000 échanges | Source officielle                                                                    |
| ---------------------------------------------------------------- | -----: | -----: | -------------: | ------------------------------------------------------------------------------------ |
| Google `gemini-3.8-flash`                                        | 0,75 $ | 3,75 $ |        4,125 $ | [Tarifs Gemini](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.8-flash)      |
| Google `gemini-3.5-flash-lite`                                   | 0,30 $ | 2,50 $ |         2,15 $ | [Tarifs Gemini](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite) |
| Google `gemini-3.1-flash-lite`                                   | 0,25 $ | 1,50 $ |         1,50 $ | [Tarifs Gemini](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite) |
| Google `gemini-2.5-flash-lite`                                   | 0,10 $ | 0,40 $ |         0,50 $ | [Tarifs Gemini](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-lite) |
| Anthropic `claude-haiku-5-5`                                     | 0,10 $ | 0,50 $ |         0,55 $ | [Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview)           |
| Anthropic `claude-haiku-4-5-20251001` / alias `claude-haiku-4-5` | 1,00 $ | 5,00 $ |         5,50 $ | [Haiku 4.5, legacy](https://platform.claude.com/docs/en/models/haiku-4-5/overview)   |
| OpenAI `gpt-6-luna`                                              | 0,10 $ | 0,50 $ |         0,55 $ | [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)               |
| OpenAI `gpt-5.4-mini`                                            | 0,75 $ | 4,50 $ |         4,50 $ | [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)           |
| OpenAI `gpt-5.4-nano`, marqué deprecated                         | 0,20 $ | 1,25 $ |        1,225 $ | [GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano)           |
| OpenAI `gpt-5-nano`, marqué deprecated                           | 0,05 $ | 0,40 $ |         0,35 $ | [GPT-5 nano](https://developers.openai.com/api/docs/models/gpt-5-nano)               |
| xAI `grok-4.3`                                                   | 1,25 $ | 2,50 $ |         5,00 $ | [Grok 4.3](https://docs.x.ai/developers/models/grok-4.3)                             |
| xAI `grok-4.7`                                                   | 2,00 $ | 6,00 $ |         9,00 $ | [Catalogue xAI](https://docs.x.ai/developers/models)                                 |

**Gemini 3.8 Flash est bien un nom officiel actuel.** Son prix indiqué est promotionnel jusqu'au 31 décembre 2026 ; au 1er janvier 2027 : **1,50 $ / 7,50 $**, soit 8,25 $ pour cet exemple. Les sorties Gemini incluent les tokens de thinking. La page tarifaire est datée du 14 octobre 2026. [Tarifs Gemini](https://ai.google.dev/gemini-api/docs/pricing)

Haiku 5.5 applique ces prix jusqu'à 100 000 tokens d'entrée par requête ; au-delà : 0,50 $ / 2,50 $. Son tokenizer compte environ 30 % de tokens supplémentaires à texte égal par rapport à Haiku 4.5. Cache : lecture 0,01 $, écriture 5 min 0,125 $, 1 h 0,20 $ au tarif court. Thinking adaptatif, effort par défaut `medium`. [Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview)

GPT-6 Luna : cache lecture 0,01 $, écriture 0,125 $ ; au-delà de 272k tokens d'entrée, entrée/cache ×2 et sortie ×1,5 pour la requête complète. Effort `none` disponible ; défaut `medium`. Free tier non pris en charge. [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)

Les tokens de raisonnement OpenAI, même invisibles, sont facturés en sortie ; l'exemple ne vaut donc pas pour 500 tokens visibles auxquels s'ajouterait du raisonnement. [Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)

Grok 4.3 : cache 0,20 $ ; prix supérieurs au-delà de 200k tokens ; raisonnement configurable avec `none`. Aucun free tier API permanent n'a été établi par les sources actuelles consultées. La promotion à 25 $/mois concernait explicitement la bêta terminant fin 2024 et ne permet pas de conclure à une gratuité actuelle. [Grok 4.3](https://docs.x.ai/developers/models/grok-4.3), [annonce historique xAI](https://x.ai/news/api)

## Gratuité : Google AI Studio, Gemini API et France

Les quatre modèles Gemini du tableau affichent un free tier d'entrée/sortie. AI Studio annonce lui aussi un usage gratuit dans les régions disponibles. Cela ne signifie pas une capacité illimitée ni un accès gratuit transférable à OpenRouter. [Tarifs Gemini](https://ai.google.dev/gemini-api/docs/pricing)

**Pour un portfolio accessible à des utilisateurs en France/EEE, prévoir Gemini API avec facturation active.** Les conditions Google imposent les « Paid Services » aux API Clients mis à disposition d'utilisateurs EEE, Suisse ou Royaume-Uni. Pour Gemini API, cela exige un projet Cloud associé à un compte de facturation actif. La France fait partie des régions disponibles. [Conditions Gemini, effectives le 23 mars 2026](https://ai.google.dev/gemini-api/terms), [régions](https://ai.google.dev/gemini-api/docs/available-regions)

Données : règle générale du gratuit, Google utilise prompts/réponses pour améliorer ses produits ; règle Paid, il ne les utilise pas à cette fin. **Exception régionale : pour un utilisateur situé dans l'EEE/Suisse/Royaume-Uni, les règles de données Paid s'appliquent également à AI Studio et au quota non payé.** Des journaux de sécurité temporaires subsistent ; cela ne promet ni absence de traitement ni résidence UE. [Conditions Gemini](https://ai.google.dev/gemini-api/terms)

Quotas Gemini : RPM, TPM d'entrée et RPD, par projet et non par clé ; les RPD se réinitialisent à minuit heure Pacifique. Les valeurs actives dépendent du modèle, tier et compte et doivent être lues dans AI Studio ; la documentation ne publie pas de valeur universelle actuelle pour le free tier de Flash 3.8. Ne pas réutiliser un ancien tableau ou le quota d'un autre compte. Capacité annoncée non garantie. [Limites Gemini, datées du 13 octobre 2026](https://ai.google.dev/gemini-api/docs/rate-limits)

Anthropic décrit de petits crédits de test pour nouveaux utilisateurs, pas un quota gratuit permanent. Les abonnements Max/Team incluent désormais des crédits API réclamables (100 $ Max 5x, 200 $ Max 20x ; Team pool plafonné à 500 $), utilisables uniquement sur Claude Platform, pas via OpenRouter ; expiration par cycle. Ce bénéfice suppose un abonnement éligible. [Tarifs Claude](https://platform.claude.com/docs/en/about-claude/pricing), [crédits Max/Team](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers)

## OpenRouter : prix, recharges, modèles gratuits

OpenRouter facture l'inférence au tarif fournisseur annoncé, sans majoration par requête. La recharge Standard porte **5,5 % de frais** (Business 8 %), hors taxes applicables. Le fichier de constantes officiel précise **minimum Stripe 0,80 $**, crypto 5 %. Ainsi une recharge de 10 $ de crédits via Stripe coûte théoriquement 10,80 $ avant taxes ; le minimum rend le pourcentage effectif supérieur à 5,5 % pour les petites recharges. Le montant réel reste à contrôler au checkout. [Pricing OpenRouter](https://openrouter.ai/pricing), [constantes officielles](https://github.com/OpenRouterTeam/docs/blob/main/snippets/exports/constants.mdx)

Exemple Haiku 5.5 ou GPT-6 Luna : 0,55 $ d'inférence / 1 000 échanges ; coût économique avec frais de recharge Standard proportionnels 0,58025 $, si la recharge dépasse le minimum de frais. Ce n'est pas une recharge de 0,55 $.

Le catalogue API public confirme actuellement `anthropic/claude-haiku-5.5` à 0,10 $ / 0,50 $, `anthropic/claude-haiku-4.5` à 1 $ / 5 $, `google/gemini-3.8-flash` à 0,75 $ / 3,75 $, `openai/gpt-6-luna` à 0,10 $ / 0,50 $ et `x-ai/grok-4.3` à 1,25 $ / 2,50 $. Les capacités `response_format` et `structured_outputs` y sont déclarées. Catalogue consulté directement le 15 octobre 2026 ; disponibilité d'un endpoint pour un compte donné non testée. [API modèles OpenRouter](https://openrouter.ai/api/v1/models)

Gratuit OpenRouter : variantes explicitement cataloguées `:free`, et routeur `openrouter/free`, qui choisit un modèle gratuit ; ce routeur ne garantit donc pas une identité de modèle constante. Exemples actuellement à 0 $ entrée/sortie : `nvidia/nemotron-3.5-lightning:free`, `liquid/lfm-2.5-2.6b:free`. Ce n'est pas un crédit de gratuité applicable à Gemini ou Haiku payants. [FAQ](https://openrouter.ai/docs/faq), [catalogue](https://openrouter.ai/api/v1/models)

Limites gratuites documentées : **20 requêtes/minute**, **50/jour** sous le seuil d'achat historique de 10 crédits ; **1 000/jour** au-dessus. Le code documentaire accorde le plafond supérieur dès 9 crédits achetés pour absorber arrondis/frais. Les achats sont cumulés sur la vie du compte, pas le solde restant. Le champ `free_model_daily_requests` de `GET /api/v1/key` donne plafond et compteur réels ; exceptions documentées selon compte/endpoints. Ces plafonds sont globaux aux modèles gratuits concernés. [Limites](https://openrouter.ai/docs/api_reference/limits), [constantes officielles utilisées par cette page](https://github.com/OpenRouterTeam/docs/blob/main/snippets/exports/constants.mdx)

BYOK : OpenRouter indique actuellement 25 000 $ d'inférence au prix catalogue par mois sans frais BYOK sur Standard/Business, puis 5 % ; le fournisseur facture son inférence directement. Cela ne transforme pas l'API fournisseur en gratuit. [Pricing OpenRouter](https://openrouter.ai/pricing)

## Contraintes utiles pour le design des trois profils

Un transport Chat Completions commun est documenté : OpenRouter `https://openrouter.ai/api/v1/chat/completions` ; Google `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` ; OpenAI `https://api.openai.com/v1/chat/completions`. Google documente le SDK OpenAI avec `baseURL=https://generativelanguage.googleapis.com/v1beta/openai/`, modèle `gemini-3.8-flash` ; la couche reste en bêta. **Les réglages fournisseur doivent rester distincts.** [FAQ OpenRouter](https://openrouter.ai/docs/faq), [compatibilité Google](https://ai.google.dev/gemini-api/docs/openai), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)

Google accepte JSON structuré via `chat.completions.parse` avec `response_format` produit par `zodResponseFormat`, exemple officiel Flash 3.8. Son mapping `reasoning_effort` accepte `minimal`, `low`, `medium`, `high` pour Gemini 3 Flash ; **`none` ne désactive pas le thinking Gemini 3**. Ne pas recopier le `none` d'OpenAI. `minimal` réduit le raisonnement sans promettre zéro token. Cache Gemini via paramètres Google spécifiques. [Compatibilité Google, datée du 14 octobre 2026](https://ai.google.dev/gemini-api/docs/openai)

La voie native Google actuelle montre aussi `POST /v1beta/interactions` avec `response_format: { type: "text", mime_type: "application/json", schema: ... }` ; elle ne remplace pas implicitement les noms de paramètres de la couche compatible. Sous-ensemble de JSON Schema, schémas trop complexes parfois rejetés ; valider le résultat côté application. [Structured outputs, datée du 13 octobre 2026](https://ai.google.dev/gemini-api/docs/structured-output)

OpenAI GPT-6 Luna prend en charge Structured Outputs et Responses. Sa documentation recommande Responses pour les outils intégrés et function calling ; Chat Completions ne permet function calling qu'avec effort `none`. Pour un simple JSON conversationnel, vérifier le contrat exact utilisé et le modèle choisi ; ne pas déduire la parité de toutes les options du format de transport partagé. [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)

## Interprétation et validation restante

À prix de tokens seuls, Haiku 5.5 et GPT-6 Luna sont nettement moins chers que Flash 3.8 aujourd'hui ; une migration de Haiku 4.5 vers 5.5 change davantage le coût qu'un passage de Haiku 5.5 vers Gemini 3.8. Ce constat ne démontre aucune supériorité conversationnelle. Aucun benchmark fournisseur ne prouve ici la fidélité au CV, le français, les refus d'invention, le JSON attendu ou la latence du portfolio. Comparer les profils sur les mêmes scénarios réels, coût `usage` complet et erreurs compris, avant de choisir le défaut. La gratuité Gemini ne doit pas être le motif de mise en production du portfolio français.
