# ── Dockerfile pour le frontend React ──
# Ce Dockerfile utilise un "multi-stage build" (construction en 2 étapes).
# Étape 1 : on build le projet React avec Node.js
# Étape 2 : on copie les fichiers buildés dans un serveur Nginx léger
# Résultat : une image très petite qui sert juste des fichiers HTML/CSS/JS.

# ──── ÉTAPE 1 : Build ────
# "AS build" donne un nom à cette étape pour y faire référence plus tard.
FROM node:20-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances en premier (pour le cache Docker).
COPY package.json package-lock.json ./

# Installer les dépendances Node.js.
# npm ci = "clean install", plus rapide et fiable que npm install pour la production.
RUN npm ci

# Copier tout le code source du frontend.
COPY . .

# ARG = argument de build. On passe l'URL de l'API au moment du build.
# Ça permet de configurer l'URL différemment selon l'environnement.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build le projet React → génère des fichiers statiques dans /app/dist.
RUN npm run build

# ──── ÉTAPE 2 : Serveur Nginx ────
# alpine = version ultra-légère de Linux (~5 Mo au lieu de ~100 Mo).
FROM nginx:alpine

# Copier notre configuration Nginx personnalisée.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers buildés depuis l'étape 1 dans le dossier que Nginx sert.
# --from=build = prend les fichiers depuis l'étape nommée "build".
COPY --from=build /app/dist /usr/share/nginx/html

# Exposer le port 80 (port HTTP standard).
EXPOSE 80

# Nginx se lance automatiquement avec cette image.
CMD ["nginx", "-g", "daemon off;"]
