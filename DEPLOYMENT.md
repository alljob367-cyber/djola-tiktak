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
5. Vérifier que toutes les tables, triggers, RLS policies sont créés sans erreur.

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
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app
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
vercel env add ELEVENLABS_API_KEY  # optionnel
vercel env add NEXT_PUBLIC_APP_URL
```

## Étape 5 : Configurer Vercel Cron

Le fichier `vercel.json` (à créer à la racine) configure le cron :

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

Cela exécute le endpoint de rappels chaque heure.

## Étape 6 : Configurer ElevenLabs (optionnel)

1. Créer un compte sur [https://elevenlabs.io](https://elevenlabs.io).
2. Obtenir une clé API dans les paramètres.
3. Ajouter `ELEVENLABS_API_KEY` dans les variables Vercel.

## Étape 7 : Personnaliser le domaine (optionnel)

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
6. Tester une réservation complète.

## Sécurité

- Ne **jamais** exposer `SUPABASE_SERVICE_ROLE_KEY` côté client.
- Ne **jamais** désactiver RLS en production.
- Utiliser un `CRON_SECRET` fort et unique.
- Mettre à jour régulièrement les dépendances.
