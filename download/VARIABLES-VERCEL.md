# Variables d'environnement Djola TikTak

Copie-colle ces variables dans **Vercel > ton projet > Settings > Environment Variables**.

---

## 1. NEXT_PUBLIC_SUPABASE_URL

```
https://nfelepjqazglpqjpvctg.supabase.co
```

> URL de ton projet Supabase (trouvée dans Settings > URL)

---

## 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWxlcGpxYXpnbHBxanB2Y3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NTAzOTUsImV4cCI6MjEwMzIyNjM5NX0.yWqLde3tosdX-Dz5wzCy4DaHYAwYXJCBUGcYAMESbAg
```

> Clé publique Supabase (Settings > API > Project API keys > anon public)

---

## 3. SUPABASE_SERVICE_ROLE_KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWxlcGpxYXpnbHBxanB2Y3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY1MDM5NSwiZXhwIjoyMTAzMjI2Mzk1fQ.kgBrnKVvezKKhkTQWgBKuEsJ3g_n24MHs4MuXTN8FLo
```

> Clé secrète Supabase (Settings > API > Project API keys > service_role secret)

---

## 4. CRON_SECRET

```
djola-tiktak-cron-secret-2026
```

> Secret pour sécuriser le endpoint cron de rappels. Change-le si tu veux.

---

## 5. NEXT_PUBLIC_APP_URL

```
https://djola-tiktak.vercel.app
```

> URL de ton app Vercel. Remplace par ta vraie URL après le premier déploiement.

---

## Instructions Vercel

1. Va sur [vercel.com](https://vercel.com) > ton projet **djola-tiktak**
2. Clique **Settings** (en haut)
3. Clique **Environment Variables** (menu gauche)
4. Ajoute chaque variable ci-dessus :
   - **Name** = le nom de la variable (ex: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value** = la valeur copiée ci-dessus
   - **Environment** = coche **Production**, **Preview**, **Development**
5. Clique **Save** pour chaque variable
6. Va dans **Deployments** > clique les 3 points > **Redeploy**

> Tous les champs sont en copier-coller direct. Rien à modifier sauf `NEXT_PUBLIC_APP_URL` après le premier déploiement.