#!/bin/bash

# Script to configure Vercel environment variables
# Run this script from your local machine where you're logged into Vercel CLI

# ── Local dev override ─────────────────────────────────────────────────────────
# Force l'URL de base pour le callback OAuth Zoho en développement local
if [ "${NODE_ENV}" != "production" ]; then
    export NEXT_PUBLIC_APP_URL="http://localhost:3000"
    echo "🌐 Mode Développement : Callback Zoho → http://localhost:3000/api/auth/oauth/zoho/callback"
fi
# ──────────────────────────────────────────────────────────────────────────────

echo "🚀 Configuration des variables d'environnement Vercel"
echo "======================================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI n'est pas installé."
    echo "📦 Installation..."
    npm install -g vercel
fi

# Check if user is logged in
echo "🔐 Vérification de l'authentification..."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Vous n'êtes pas connecté à Vercel."
    echo "🔑 Connexion en cours..."
    vercel login
fi

echo ""
echo "📋 Configuration des variables d'environnement..."
echo ""

# DATABASE_URL
echo "1️⃣  Configuration de DATABASE_URL..."
echo "postgresql://neondb_owner:npg_cRzIrOmJwo38@ep-calm-lab-agkv7stu-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require" | \
  vercel env add DATABASE_URL production preview development

# NEXTAUTH_SECRET
echo ""
echo "2️⃣  Configuration de NEXTAUTH_SECRET..."
SECRET=$(openssl rand -base64 32)
echo "   Clé générée: $SECRET"
echo "$SECRET" | vercel env add NEXTAUTH_SECRET production preview development

# NEXTAUTH_URL (Production only)
echo ""
echo "3️⃣  Configuration de NEXTAUTH_URL..."
echo "⚠️  Entrez votre URL Vercel (ex: https://neosaas-website.vercel.app)"
read -p "   URL: " NEXTAUTH_URL
echo "$NEXTAUTH_URL" | vercel env add NEXTAUTH_URL production

# ADMIN_SECRET_KEY
echo ""
echo "4️⃣  Configuration de ADMIN_SECRET_KEY..."
echo "change-this-in-production" | vercel env add ADMIN_SECRET_KEY production preview development

# NEXT_PUBLIC_APP_URL — canonical URL used for OAuth callbacks
echo ""
echo "5️⃣  Configuration de NEXT_PUBLIC_APP_URL..."
if [ "$NODE_ENV" = "production" ]; then
    APP_URL="https://neobridge.vercel.app"
else
    APP_URL="http://localhost:3000"
fi
ZOHO_CALLBACK_URL="${APP_URL}/api/auth/oauth/zoho/callback"
echo "   App URL        : $APP_URL"
echo "   Zoho Callback  : $ZOHO_CALLBACK_URL"
echo "$APP_URL" | vercel env add NEXT_PUBLIC_APP_URL production
echo "http://localhost:3000" | vercel env add NEXT_PUBLIC_APP_URL development

echo ""
echo "✅ Variables d'environnement configurées !"
echo ""
echo "📌 Prochaines étapes:"
echo "   1. Vérifiez les variables: vercel env ls"
echo "   2. Redéployez: vercel --prod"
echo "   3. Testez: https://votre-projet.vercel.app/api/debug/env"
echo ""
echo "⚠️  Zoho OAuth — vérifiez que CES DEUX URLs sont enregistrées dans api-console.zoho.com → Authorized Redirect URIs :"
echo "   https://neobridge.vercel.app/api/auth/oauth/zoho/callback"
echo "   http://localhost:3000/api/auth/oauth/zoho/callback"
echo ""
