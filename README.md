# 🎬 FilmMatching

**FilmMatching, c'est comme Tinder mais pour les films.** Swipez des films et séries, connectez-vous avec vos amis, et trouvez ce que vous avez envie de regarder ensemble.

> 🌐 [filmmatching.com](https://filmmatching.com) — disponible gratuitement sur navigateur et mobile

---

## Le concept

FilmMatching résout le problème du "on regarde quoi ce soir ?" :

1. **Swipe** — Les films et séries défilent un par un. Like, dislike, ou déjà vu.
2. **Connect** — Liez votre compte avec vos amis ou votre partenaire.
3. **Match** — Quand deux personnes connectées likent le même film, c'est un match.
4. **Pick** — Consultez vos matchs communs et lancez un choix aléatoire si vous hésitez encore.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 19, Vite, React Router |
| **Backend** | Django 6, Django REST Framework |
| **Auth** | JWT (SimpleJWT) |
| **Base de données** | PostgreSQL 16 |
| **Serveur web** | Nginx + Gunicorn |
| **Conteneurisation** | Docker Compose |
| **HTTPS** | Let's Encrypt |
| **Données films** | API TMDB |

## Installation locale

### Prérequis

- Python 3.10+
- Node.js 18+
- PostgreSQL (ou SQLite pour le dev)

### Backend

```bash
# Créer et activer l'environnement virtuel
python -m venv venv
source venv/Scripts/activate  # Windows/Git Bash
source venv/bin/activate      # macOS/Linux

# Installer les dépendances
pip install -r backend/requirement.txt

# Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Remplir SECRET_KEY, TMDB_ACCESS_TOKEN...

# Appliquer les migrations
python backend/manage.py migrate

# Lancer le serveur
python backend/manage.py runserver
```

### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Remplir VITE_API_URL=http://localhost:8000

# Lancer le serveur de dev
npm run dev
```

## Commandes de management

Les scripts d'import et de maintenance sont des commandes Django dans `backend/api/management/commands/` :

```bash
# Récupérer les films et séries depuis TMDB (7 derniers jours)
python backend/manage.py get_films --start-date 7d

# Récupérer tous les films depuis une date précise
python backend/manage.py get_films --start-date 1950-01-01

# Récupérer les genres de films et séries
python backend/manage.py get_genres

# Remplir les liens et logos des plateformes de streaming
python backend/manage.py fill_platform_links

# Supprimer les séries sans plateforme réelle sur TMDB
python backend/manage.py clean_series
```

### Avec Docker (sur le VPS)

```bash
docker compose exec backend python manage.py get_films --start-date 7d
docker compose exec backend python manage.py get_genres
```

## Structure du projet

```
filmmatching/
├── backend/                    # API Django REST Framework
│   ├── api/                    # Models, views, serializers
│   │   └── management/
│   │       └── commands/       # Commandes Django (get_films, get_genres...)
│   ├── backend/                # Settings, URLs, WSGI
│   ├── logs/                   # Logs applicatifs (app.log, scripts.log)
│   ├── Dockerfile
│   └── requirement.txt
├── frontend/                   # Application React + Vite
│   ├── src/
│   │   ├── components/         # Composants réutilisables (Film, HamburgerMenu...)
│   │   ├── pages/              # Pages (home, login, films_list...)
│   │   └── styles/             # Fichiers CSS
│   ├── nginx.conf              # Config Nginx (production)
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml          # Orchestration des services
```

## Soutenir le projet

FilmMatching est **100% gratuit**, développé et maintenu par une seule personne sur son temps libre. Si le projet vous plaît, vous pouvez le soutenir :

☕ **[Offrir un café sur Tipeee](https://fr.tipeee.com/filmmatching/)**

*Les données films et séries proviennent de [TMDB](https://www.themoviedb.org/). FilmMatching n'est ni approuvé ni certifié par TMDB.*
