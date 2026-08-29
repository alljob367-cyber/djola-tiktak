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
6. Vérifier que toutes les tables, triggers, RLS policies sont créés sans erreur.

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
- Mettre à jour régulièrement les dépendances.
