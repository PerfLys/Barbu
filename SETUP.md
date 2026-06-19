# Application Barbu — Guide de déploiement

## Prérequis
- Node.js 18+
- Compte Supabase
- Compte Vercel (connecté à GitHub)

---

## 1. Base de données Supabase

1. Ouvre [app.supabase.com](https://app.supabase.com) → ton projet
2. Va dans **SQL Editor** → **New query**
3. Colle le contenu de `supabase-schema.sql` et exécute
4. Récupère tes clés dans **Project Settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Variables d'environnement locales

```bash
cp .env.local.example .env.local
# Remplis avec tes clés Supabase
```

---

## 3. Installation et développement local

```bash
npm install
npm run dev
# Ouvre http://localhost:3000
```

---

## 4. Déploiement sur Vercel

1. Push ce dossier sur GitHub
2. Ouvre [vercel.com](https://vercel.com) → **New Project** → importe le repo
3. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique **Deploy**

---

## 5. Configuration Supabase Auth (optionnel)

Dans Supabase → **Authentication → URL Configuration** :
- **Site URL** : `https://ton-app.vercel.app`
- **Redirect URLs** : `https://ton-app.vercel.app/auth/callback`

---

## Structure des scores

| Contrat | Scoring |
|---------|---------|
| Le Barbu | +80 au preneur du Roi de Cœur |
| Pas de Cœurs | +10 par cœur ramassé |
| Pas de Dames | +20 par dame ramassée |
| Pas de Plis | +10 par pli remporté |
| Pas de Dernier | +80 au preneur du dernier pli |
| La Salade | Cumul de tous les contrats ci-dessus |
| La Réussite | 1er à finir : −200 · 2ème : −100 |

**Celui qui a le moins de points à la fin gagne.**
