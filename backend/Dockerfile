# ── Dockerfile pour le backend Django ──
# Ce fichier est la "recette" pour construire le conteneur du backend.
# Docker lit ces instructions de haut en bas pour créer une image.

# 1. Image de base : on part d'un Python 3.12 léger (slim = sans extras inutiles)
#    C'est comme choisir un système d'exploitation minimal avec Python pré-installé.
FROM python:3.12-slim

# 2. Variables d'environnement pour Python dans Docker :
#    - PYTHONDONTWRITEBYTECODE=1 → Python ne crée pas de fichiers .pyc (inutiles dans Docker)
#    - PYTHONUNBUFFERED=1 → les logs s'affichent immédiatement (pas mis en mémoire tampon)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Dossier de travail dans le conteneur.
#    Toutes les commandes suivantes s'exécuteront depuis /app.
WORKDIR /app

# 4. Installer les dépendances système nécessaires à psycopg2 (driver PostgreSQL).
#    apt-get = gestionnaire de paquets Linux (comme npm mais pour le système).
#    --no-install-recommends = n'installe que le strict nécessaire.
#    rm -rf /var/lib/apt/lists/* = nettoie le cache pour réduire la taille de l'image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 5. Copier le fichier des dépendances Python en premier.
#    Astuce Docker : si requirement.txt n'a pas changé, Docker réutilise le cache
#    et ne réinstalle pas tout. Ça accélère les builds suivants.
COPY requirement.txt .

# 6. Installer les dépendances Python.
#    --no-cache-dir = ne garde pas le cache pip (réduit la taille de l'image).
RUN pip install --no-cache-dir -r requirement.txt
RUN pip install --no-cache-dir gunicorn

# 7. Copier tout le code du backend dans le conteneur.
COPY . .

# 8. Créer le dossier logs (nécessaire pour le système de logging Django).
RUN mkdir -p logs

# 9. Collecter les fichiers statiques de Django (CSS admin, etc.).
#    collectstatic rassemble tous les fichiers statiques dans STATIC_ROOT.
#    --noinput = pas de question interactive.
RUN python manage.py collectstatic --noinput

# 10. Exposer le port 8000 (informatif, indique quel port le conteneur utilise).
EXPOSE 8000

# 11. Commande de démarrage : Gunicorn sert l'application Django.
#     - bind 0.0.0.0:8000 → écoute sur toutes les interfaces réseau, port 8000
#     - workers 3 → 3 processus pour gérer les requêtes en parallèle
#     - backend.wsgi:application → le point d'entrée WSGI de Django
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "backend.wsgi:application"]
