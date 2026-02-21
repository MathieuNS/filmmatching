# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Django)
```bash
# Activate virtual environment (required before any backend command)
source venv/Scripts/activate  # Windows/Git Bash

# Run dev server (default port 8000)
python backend/manage.py runserver

# Migrations
python backend/manage.py makemigrations
python backend/manage.py migrate

# Install dependencies
pip install -r backend/requirement.txt

# Run tests
python backend/manage.py test api
```

### Frontend (React + Vite)
```bash
cd frontend

# Dev server (default port 5173)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Install dependencies
npm install
```

## Product vision

FilmMatching solves the "cold dinner" problem: couples or friends scroll through streaming catalogs without agreeing on what to watch. FilmMatching works like Tinder for movies/series:

1. **Swipe** — Films are presented one by one. The user can **like**, **dislike**, or mark **already seen**.
2. **Connect** — Users link their accounts with one or more friends/partners.
3. **Match** — When two connected users both like the same film, it's a match.
4. **Pick** — On a friend's profile, users see the full list of mutual likes. If they're still undecided, a **random pick** button selects one for them.

The core loop: swipe individually at any time → open the shared list when it's movie night → pick or randomize.

## Architecture

This is a **Django REST Framework + React** fullstack app for matching users with films/series.

### Backend (`backend/`)

- **`backend/settings.py`** — JWT auth via `djangorestframework-simplejwt` (access: 30min, refresh: 1 day). Database is SQLite for dev. `CORS_ALLOW_ALL_ORIGINS = True` for local dev.
- **`backend/urls.py`** — API routes: `api/users/create/`, `api/token/`, `api/token/refresh/`
- **`api/models.py`** — Three models: `Films` (title, img, release_year, director, main_actors, synopsis, type Film/Serie), `Tag` (M2M on Films), `Plateform` (M2M on Films)
- **`api/views.py`** — `CreateUserView` (public), `FilmListCreateView` (authenticated)
- **`api/serializers.py`** — `UserSerializer` uses `create_user()` to hash passwords; `FilmsSerializer` exposes all fields

The backend uses Django's built-in `User` model — no custom user model.

### Frontend (`frontend/src/`)

- **`api.js`** — Axios instance with `VITE_API_URL` as base URL. The request interceptor automatically attaches the JWT access token from `localStorage` to every request header.
- **`constants.js`** — Token keys: `ACCESS_TOKEN = 'access'`, `REFRESH_TOKEN = 'refresh'`
- **`App.jsx`** — Router with three routes: `/home` (protected), `/login`, `/create-login`
- **`components/ProtectedRoute.jsx`** — Checks JWT validity via `jwtDecode`, auto-refreshes via `api/token/refresh/` if expired, redirects to `/login` if unauthenticated
- **`pages/`** — One file per page, each exports a default component
- **`styles/Forms.css`** — Shared CSS classes (`form-container`, `form-input`, `form-button`) used across all form pages

### Auth flow

1. User creates account → `POST api/users/create/` (no auth required)
2. User logs in → `POST api/token/` → stores `access` and `refresh` in `localStorage`
3. Every API call → interceptor in `api.js` injects `Authorization: Bearer <access>`
4. On protected routes, `ProtectedRoute` checks expiry and refreshes token silently if needed

### Environment variables

The frontend requires a `.env` file at `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

The backend requires a `.env` file at the root or `backend/`:
```
SECRET_KEY=your-django-secret-key
```

## Visual identity

Every frontend page and component MUST follow this design system strictly. The full specification is in `.claude/agents/frontend-designer.md`.

### Fonts
- **Display** (titles, buttons, logo): `'Outfit', sans-serif` — weights 300–900
- **Body** (text, descriptions, UI): `'Sora', sans-serif` — weights 300–700

### Colors (dark theme only)

Base:
- `--noir-cinema: #0D0D0F` — main background
- `--noir-carte: #16161A` — cards, modals
- `--gris-sombre: #1E1E24` — inputs
- `--gris-moyen: #2A2A32` — borders
- `--gris-texte: #8B8B9E` — secondary text
- `--blanc-doux: #F0EEF2` — primary text

Semantic accents:
- `--corail-vif: #FF4D6A` — like, primary CTA
- `--ambre-dore: #FFAA2B` — already seen, badges
- `--violet-nuit: #7B5CFF` — profiles, social links
- `--vert-match: #2EE0A1` — match confirmed, success

Gradients: Passion (`#FF4D6A → #FFAA2B`), Connexion (`#7B5CFF → #FF4D6A`), Match (`#2EE0A1 → #7B5CFF`)

### UI tokens
- Cards: `border-radius: 20px`, `border: 1px solid rgba(255,255,255,0.04)`
- Buttons: `border-radius: 14px`, glow via `box-shadow: 0 4px 24px <accent-glow>`
- Tags/pills: `border-radius: 100px`
- Transitions: `all 0.25s ease`

## Coding guidelines

The developer is a **beginner learning to code** through this project. Every interaction is a learning opportunity:

- **Explain what you do and why** — before writing or modifying code, describe the approach in plain language (in French). Explain the "why", not just the "what".
- **Add docstrings** to every Python function, class, and method (Google-style docstrings in French).
- **Add JSDoc comments** to every React component and JavaScript function (in French).
- **Add inline comments** on non-obvious lines to explain what they do and why.
- **Use simple language** — avoid jargon without defining it first. If a concept is new (e.g., "serializer", "hook", "middleware"), explain it briefly when first encountered.
