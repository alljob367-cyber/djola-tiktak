# Djola TikTak — Instructions de déploiement Vercel + Supabase

## Étape 1 : Créer un projet Supabase

1. Aller sur [https://supabase.com](https://supabase.com) et créer un compte.
2. Créer un nouveau projet (région la plus proche de vos utilisateurs, ex: `eu-west-3` Paris).
3. Une fois le projet créé, aller dans **Settings > API**.
4. Noter les valeurs suivantes :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

## Étape 2 : Exécuter le schéma SQL

1. Aller dans **SQL Editor** dans le dashboard Supabase.
2. Cliquer sur **New query**.
3. Copier-coller le contenu complet du fichier `supabase/schema.sql`.
4. Cliquer sur **Run** (ou `Ctrl+Entrée`).
5. Répéter l'opération pour les migrations, DANS L'ORDRE :
   1. `supabase/subscription-migration.sql` (plans, paiements, abonnements)
   2. `supabase/auto-trial-on-signup.sql` (essai gratuit 7 jours à l'inscription)
   3. `supabase/atomic-booking-rpc.sql` (réservation atomique anti double-booking)
   4. `supabase/social-and-images-migration.sql` (réseaux sociaux + avatars)
   5. `supabase/payment-methods-migration.sql` (méthodes de paiement)
   6. `supabase/security-hardening.sql` (**OBLIGATOIRE** — durcissement RLS :
      ferme la fuite PII des politiques public_read et interdit l'écriture
      client des tables payments/subscriptions)
   7. `supabase/business-types-migration.sql` (types de business + catégories
      de services + capacité par créneau — resto, salon, santé, SaaS...)
   8. `supabase/marketing-theme-migration.sql` (bannière, thèmes, annonce,
      YouTube, codes promo)
   9. `supabase/service-forms-migration.sql` (**nouveaux formulaires par
      métier** — paramètres spécifiques des services `services.metadata` :
      format d'appel SaaS, service à domicile salon, couverts restaurant,
      niveau fitness… + réseaux sociaux supplémentaires LinkedIn / X /
      Telegram sur la page publique)
   10. `supabase/admin-role-migration.sql` (**rôle administrateur en base** —
       `profiles.role` : `user` ou `admin`. Active le panneau de contrôle
       général réservé aux admins, la gestion des utilisateurs & plans et
       la protection serveur de toutes les pages `/admin`)
6. Vérifier que toutes les tables, triggers, RLS policies sont créés sans erreur.

> ℹ️ **MIGRATION `service-forms` NON BLOQUANTE** : si vous ne l'exécutez pas
> tout de suite, l'application reste 100 % fonctionnelle — les services sont
> créés normalement, seuls les champs spécifiques au métier (et les nouveaux
> réseaux LinkedIn/X/Telegram) sont ignorés jusqu'à l'exécution de la
> migration. Exécutez-la dès que possible pour tout activer.

> ℹ️ **MIGRATION `admin-role` NON BLOQUANTE** : sans la migration 10,
> l'application fonctionne et le panneau `/admin` reste protégé — mais seul
> le mécanisme historique `ADMIN_EMAILS` (variable d'environnement) permet
> d'être administrateur, et la gestion des rôles depuis l'interface est
> désactivée. Exécutez la migration pour activer les rôles en base.

## Étape 2bis : Créer les identifiants administrateur

**Qui est administrateur ?** (l'une OU l'autre)
- le compte a `profiles.role = 'admin'` en base (migration 10) — recommandé ;
- l'e-mail du compte figure dans la variable `ADMIN_EMAILS` (Vercel).

Seul l'administrateur accède au **panneau de contrôle général** (`/admin` :
métriques globales, paiements, utilisateurs & plans) et à **tous les plans**
(aucune limite). Les autres utilisateurs ne voient que leur tableau de bord
marchand et sont redirigés s'ils tentent d'accéder à `/admin`.

**Créer le premier compte admin** (aucun admin existant) :
1. Ouvrir `https://votre-app.vercel.app/admin/setup`
2. Remplir : nom de l'entreprise, e-mail, mot de passe (8 caractères min.)
3. Si `ADMIN_SECRET` est défini dans Vercel, saisir cette clé (recommandé :
   elle verrouille la page de création)
4. Cliquer « Créer le compte administrateur » puis se connecter normalement

**Trois cas de figure selon votre configuration Vercel :**
- `ADMIN_SECRET` défini → la clé est **exigée** (le premier compte peut être
  créé avec n'importe quel e-mail) ;
- `ADMIN_EMAILS` défini (sans `ADMIN_SECRET`) → il faut créer le compte avec
  l'un des e-mails de la liste ;
- ni l'un ni l'autre et aucun admin en base → **première revendication** :
  le premier compte créé devient administrateur (fenêtre de démarrage type
  WordPress — configurez ensuite `ADMIN_SECRET` pour la fermer).

**Promouvoir un compte existant** (deux options) :
- interface : `/admin` → onglet « Utilisateurs & Plans » → bouton
  « Administrateur » sur la ligne du compte (confirmation demandée) ;
- SQL (Supabase → SQL Editor) :
  ```sql
  UPDATE public.profiles SET role = 'admin'
  WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = 'email@exemple.com');
  ```

**Recommandations de sécurité** :
- définir `ADMIN_SECRET` (chaîne aléatoire longue) pour verrouiller la
  création d'admins ;
- ne pas rétrograder le dernier administrateur (l'interface l'interdit) ;
- mot de passe admin unique, 12 caractères ou plus.

> ⚠️ **PRODUCTION EXISTANTE** : si votre base tourne déjà, exécutez
> `supabase/security-hardening.sql` immédiatement. Sans cette migration,
> n'importe quel utilisateur connecté peut modifier son propre abonnement
> via l'API REST Supabase, et les données des profils sont lisibles
> publiquement.

## Étape 3 : Configurer l'authentification

1. Dans Supabase, aller dans **Authentication > Providers**.
2. S'assurer que **Email** est activé (c'est le défaut).
3. Optionnel : configurer un SMTP personnalisé dans **Settings > Authentication**.

## Étape 4 : Déployer sur Vercel

### Option A : Via GitHub (recommandé)

1. Pousser le code sur un dépôt GitHub.
2. Aller sur [https://vercel.com](https://vercel.com) et importer le dépôt.
3. Dans les variables d'environnement de Vercel, ajouter :

```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role
ELEVENLABS_API_KEY=votre-cle-elevenlabs (optionnel)
CRON_SECRET=une-chaine-aleatoire-securisee
NEXT_PUBLIC_APP_URL=https://djola-tiktak-gamma.vercel.app

# Emails transactionnels (Resend)
RESEND_API_KEY=votre-cle-resend
RESEND_FROM_EMAIL=Djola TikTak <onboarding@resend.dev>

# Administration
ADMIN_EMAILS=admin@exemple.com (liste séparée par des virgules)
ADMIN_SECRET=une-chaine-aleatoire-securisee

# Paiement Chariow
CHARIOW_API_KEY=votre-cle-chariow
CHARIOW_WEBHOOK_SECRET=votre-secret-webhook
CHARIOW_PRODUCT_STARTER=id-produit-starter
CHARIOW_PRODUCT_PRO=id-produit-pro
CHARIOW_PRODUCT_BUSINESS=id-produit-business

# Paiement manuel Mobile Money (optionnel)
ORANGE_MONEY_PHONE=+237XXXXXXXXX
ORANGE_MONEY_NAME=Nom du bénéficiaire
MTN_MOMO_PHONE=+237XXXXXXXXX
MTN_MOMO_NAME=Nom du bénéficiaire
SUPPORT_PHONE=+237XXXXXXXXX
```

4. Déployer.

### Option B : Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Puis ajouter les variables d'environnement :

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add CRON_SECRET
vercel env add ADMIN_EMAILS
vercel env add ADMIN_SECRET
vercel env add RESEND_API_KEY
vercel env add CHARIOW_WEBHOOK_SECRET
vercel env add NEXT_PUBLIC_APP_URL
```

## Étape 5 : Configurer les tâches planifiées (cron)

Deux mécanismes complémentaires sont en place :

### 5a. Vercel Cron — expiration des abonnements (quotidien)

Le fichier `vercel.json` configure le cron quotidien :

```json
{
  "crons": [
    {
      "path": "/api/cron/expire",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Vercel appelle ce endpoint en **GET** avec le header
`Authorization: Bearer ${CRON_SECRET}` — la route accepte les deux
formats (GET/POST, header `CRON_SECRET` ou `Authorization: Bearer`).

### 5b. GitHub Actions — rappels de rendez-vous (2×/jour)

Le workflow `.github/workflows/reminders.yml` appelle
`/api/cron/reminders` à 08h00 et 18h00 UTC avec le header `CRON_SECRET`.

Configuration requise dans le dépôt GitHub :
1. **Settings → Secrets and variables → Actions → Secrets** :
   ajouter `CRON_SECRET` (même valeur que Vercel).
2. **Settings → Secrets and variables → Actions → Variables** :
   ajouter `VERCEL_APP_URL` = `https://djola-tiktak-gamma.vercel.app`
   (optionnel si l'URL par défaut du workflow est correcte).

Vérifier manuellement : onglet **Actions → Rappels RDV → Run workflow**.

## Étape 6 : Configurer le webhook Chariow

1. Dans le dashboard Chariow, ajouter l'URL de webhook :
   `https://djola-tiktak-gamma.vercel.app/api/webhooks/chariow`
2. Renseigner le même secret que `CHARIOW_WEBHOOK_SECRET`.
   ⚠️ Sans ce secret, TOUS les webhooks sont rejetés (protection anti-fraude).

## Étape 7 : Configurer ElevenLabs (optionnel)

1. Créer un compte sur [https://elevenlabs.io](https://elevenlabs.io).
2. Obtenir une clé API dans les paramètres.
3. Ajouter `ELEVENLABS_API_KEY` dans les variables Vercel.

## Étape 7bis : Configurer les rappels WhatsApp (Meta Cloud API)

> ℹ️ **Twilio a été retiré du projet** : WhatsApp passe exclusivement par
> la Meta Cloud API — **gratuite jusqu'à 1 000 conversations de service
> par mois**, ce qui couvre largement les rappels d'une petite activité.
> Pas de sandbox, pas de code "join", pas de frais par message.

Les rappels WhatsApp s'activent **automatiquement** dès qu'un client
a renseigné son téléphone — à condition d'avoir configuré Meta ci-dessous.
Sans configuration, les canaux passent en mode "placeholder" (aucun envoi
réel, aucune erreur).

### Configuration Meta (rappels + bot de réservation)

1. Créer un compte Meta Business : [https://business.facebook.com](https://business.facebook.com).
2. Dans Meta for Developers → créer une app → ajouter le produit **WhatsApp**.
3. API Setup → **ajouter un numéro de téléphone émetteur** (différent du
   numéro WhatsApp personnel ; il recevra un code de vérification par appel/SMS).
4. Noter le **Phone number ID** (API Setup — ⚠️ ce n'est PAS le numéro de
   téléphone, c'est un identifiant numérique long).
5. Générer un **jeton permanent** : Business Settings → Utilisateurs système →
   créer un utilisateur système → générer un jeton avec la permission
   `whatsapp_business_messaging` (jamais d'expiration).
6. Créer un template de catégorie **UTILITY** nommé `appointment_reminder`
   (corps : `Bonjour {{1}}, rappel de votre RDV chez {{2}} le {{3}} à {{4}} pour {{5}} ({{6}})`)
   et le faire approuver par Meta — nécessaire pour les rappels envoyés
   **hors fenêtre de 24 h** (si le client n'a jamais écrit au numéro).
7. Ajouter dans Vercel :
   ```
   WHATSAPP_TOKEN=votre-jeton-permanent
   WHATSAPP_PHONE_NUMBER_ID=id-du-numero
   WHATSAPP_TEMPLATE_NAME=appointment_reminder
   WHATSAPP_TEMPLATE_LANG=fr
   ```
8. Tester en local avant de déployer :
   ```
   cp .env.example .env.local   # puis remplir WHATSAPP_TOKEN et WHATSAPP_PHONE_NUMBER_ID
   node scripts/test-whatsapp.js 2376XXXXXXXX
   ```
   💡 En test, si l'erreur `131047` apparaît (fenêtre 24 h fermée) : le
   destinataire envoie "Salut" au numéro Business, puis relance le test
   dans les 24 h — ou utilise le template approuvé.

> 💡 **Erreurs fréquentes** : `131047` = fenêtre 24 h fermée (message libre
> refusé → envoyer un template approuvé) ; `131030` = numéro destinataire non
> autorisé (mode développement : l'ajouter dans WhatsApp → Destinataires) ;
> code `190` = jeton invalide/expiré (utiliser un jeton permanent).

### SMS économiques (optionnel — Africa's Talking)

Les SMS sont **optionnels** : WhatsApp + e-mail couvrent déjà les rappels.
Si tu veux vraiment des SMS, Africa's Talking est l'agrégateur africain
(tarifs locaux bien inférieurs aux tarifs Twilio ~0,32 $/SMS) :

1. Créer un compte sur [https://africastalking.com](https://africastalking.com).
2. Créer un Sender ID (ou utiliser le nom d'utilisateur `sandbox` pour tester).
3. Ajouter dans Vercel :
   ```
   AFRICASTALKING_API_KEY=votre-cle-api
   AFRICASTALKING_USERNAME=votre-username
   AFRICASTALKING_SENDER_ID=votre-sender-id
   ```

Canal WhatsApp : **Meta Cloud API uniquement**.
Canal SMS : **Africa's Talking uniquement** (désactivé si non configuré).

Variable optionnelle : `DEFAULT_COUNTRY_CODE` (par défaut `237`, Cameroun)
pour la normalisation des numéros locaux au format international.

## Étape 7ter : Personnaliser les informations de la société (pages légales + footer)

Les textes légaux (mentions légales, CGU, CGV, confidentialité, cookies) et le pied de page
utilisent les valeurs de `src/lib/company.ts`. Deux façons de les personnaliser :

**Option A (recommandée) — variables d'environnement Vercel** (Settings > Environment Variables) :

| Variable | Rôle | Exemple |
|---|---|---|
| `NEXT_PUBLIC_COMPANY_NAME` | Nom commercial | `Djola TikTak` |
| `NEXT_PUBLIC_COMPANY_LEGAL` | Dénomination + forme juridique | `Djola TikTak SARL, société immatriculée au RCCM de Douala` |
| `NEXT_PUBLIC_COMPANY_ADDRESS` | Adresse du siège | `Rue X, Akwa, Douala, Cameroun` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Email de contact | `contact@djola-tiktak.com` |
| `NEXT_PUBLIC_SUPPORT_PHONE` | Téléphone de contact | `+237 6 99 00 00 00` |

Après ajout, **redéployer** (Deployments > ... > Redeploy) car ces valeurs sont intégrées au build.

**Option B — éditer directement** les valeurs par défaut dans `src/lib/company.ts`.

> ⚠️ Vérifier l'indicatif pays : +237 = Cameroun. Le numéro apparaît automatiquement
> dans les 5 documents légaux et le footer.

## Étape 8 : Personnaliser le domaine (optionnel)

1. Dans Vercel, aller dans **Settings > Domains**.
2. Ajouter votre domaine personnalisé.
3. Mettre à jour `NEXT_PUBLIC_APP_URL` avec le nouveau domaine.

## Vérification du déploiement

Après le déploiement :

1. Visiter la page d'accueil → la landing page doit s'afficher.
2. Cliquer sur "Commencer gratuitement" → inscription fonctionnelle.
3. Se connecter → redirection vers le dashboard.
4. Créer un service, configurer les disponibilités.
5. Visiter `https://votre-domaine/votre-slug` → page publique.
6. Tester une réservation complète (vérifier l'heure affichée — elle est
   dans le fuseau horaire du professionnel).
7. Onglet GitHub **Actions** → lancer "Rappels RDV" manuellement →
   statut 200 attendu.
8. Vérifier les en-têtes de sécurité :
   `curl -sI https://votre-domaine | grep -i strict` → HSTS présent.

## Sécurité

- Ne **jamais** exposer `SUPABASE_SERVICE_ROLE_KEY` côté client.
- Ne **jamais** désactiver RLS en production.
- Utiliser un `CRON_SECRET` fort et unique.
- Utiliser un `ADMIN_SECRET` fort et unique (différent du CRON_SECRET).
- Exécuter `supabase/security-hardening.sql` (voir Étape 2).
- **Panneau de contrôle général** : `/admin` et toutes ses sous-pages sont
  protégées côté serveur (layout « guarded » + middleware) — seuls les
  administrateurs (`profiles.role = 'admin'` ou `ADMIN_EMAILS`) y accèdent ;
  les autres comptes sont redirigés vers leur tableau de bord. Les API
  `/api/admin/*` appliquent le même contrôle.
- Mettre à jour régulièrement les dépendances.

## Étape 7quater : Bot de réservation WhatsApp (optionnel, recommandé)

Permet aux clients de réserver **en conversation WhatsApp**, sans ouvrir
le site : le client envoie « RDV \<code-du-commerce\> » (ou clique le
bouton flottant « Réserver via WhatsApp » de la page publique), choisit
son service puis son créneau dans des listes interactives, confirme —
le rendez-vous apparaît dans le tableau de bord du professionnel.

### Prérequis
- Un numéro WhatsApp Business dédié à la plateforme (hors WhatsApp
  personnel), enregistré dans Meta Business.
- Les variables `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`
  (voir Étape 7bis, section Meta Cloud API).

### Configuration
1. Créez un jeton de vérification (valeur libre) :
   `openssl rand -hex 16`
2. Dans Vercel, ajoutez :
   - `WHATSAPP_VERIFY_TOKEN` = le jeton ci-dessus
   - `NEXT_PUBLIC_WHATSAPP_BOOKING_NUMBER` = numéro WhatsApp de la
     plateforme, format international sans « + » (ex : `2376XXXXXXXX`)
3. Redéployez, puis dans **Meta App Dashboard → WhatsApp → Configuration** :
   - Callback URL : `https://votre-domaine/api/whatsapp/webhook`
   - Verify token : la valeur de `WHATSAPP_VERIFY_TOKEN`
   - Cliquez « Vérifier et enregistrer », puis abonnez-vous au champ
     **messages**.

### Migrations SQL à exécuter (SQL Editor Supabase)
- `supabase/rate-limit-migration.sql` — anti-spam persistant
  (remplace le limiter en mémoire, inefficace sur Vercel).
- `supabase/whatsapp-booking-sessions-migration.sql` — sessions du bot.

### Garde-fous intégrés
- Sessions expirées après 30 min d'inactivité.
- Anti-spam : 20 messages / 5 min par numéro, 3 réservations / 24 h
  par numéro.
- Réservation atomique (même RPC `book_appointment_atomic` que le web) :
  aucun risque de double réservation.
- Fallback automatique en texte numéroté si les messages interactifs
  (listes/boutons) sont refusés par le client WhatsApp.
