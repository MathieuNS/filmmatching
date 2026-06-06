# 🎬 FilmMatching Mobile — Feuille de route

Suivi du portage du **site web** (`frontend/`, React + Vite) vers l'**app mobile** (`mobile_app/`, React Native + Expo).

> **Principe** : le backend Django ne change pas. L'app mobile est un **nouveau client** des mêmes endpoints. On reconstruit l'interface écran par écran.
> Cette feuille ne liste que **les décisions arrêtées et ce qui reste à faire**. Le détail du déjà-livré est dans le code + l'historique git.
> Pour cocher : `[ ]` → `[x]`.

---

## 📊 Avancement global

Phases 0 à 8 **terminées** (fondations, thème, auth, navigation, swipe, social, catalogue, compte). Reste :

- [ ] **Phase 9 — Finitions & distribution** ← *en cours*
- [ ] **Phase 10 — Sécurité (prod)** — app & web

---

## 🧱 Décisions arrêtées

| Sujet | Choix |
|---|---|
| État | **Redux Toolkit** (store central) |
| Navigation | **Menu burger** (`HamburgerMenu`, pas de bottom tabs) + React Navigation (stack) |
| Tokens | **expo-secure-store** (chiffré) |
| Filtres | **AsyncStorage** (clé partagée Home / Ma liste) |
| Thème | Centralisé dans `constants/` (`StyleSheet`, pas de CSS) |
| Swipe | **PanResponder + Animated** (intégrés RN ; pas de gesture-handler/reanimated) |
| Bande-annonce | **`react-native-youtube-iframe`** (l'iframe maison donnait l'erreur YouTube 150/152) ; « Où regarder » via `Linking` |
| Avatars | SVG statiques en chaînes JS + `SvgXml` (`react-native-svg`) ; fallback avatar-lettre |
| `FilmDetailModal` | Mutualisé `match_list` + `films_list`/`a_l_affiche` ; entraîne `StarRating` interactif + variante « détail » de `FilmCard` |
| reset/activate password | **Gérés par le site web** (liens email → `FRONTEND_URL`) ; non construits dans l'app |
| Deep linking | **Reporté** (inutile tant que les emails ouvrent le site) |
| `unsubscribe` / `notfound` | **Ignorés** sur mobile (désinscription via toggle « Notifications email » de Mon Compte) |
| Pages légales | Accès via le **footer `TmdbAttribution`**, pas le menu |

---

## Phase 9 — Finitions & distribution

> **Cible = iOS *et* Android** (l'app doit marcher sur les deux). **MAIS** seul un **appareil Android**
> est disponible pour tester (téléphone physique + émulateur) — pas de Mac / compte Apple. Donc :
> **code cross-platform**, mais vérification réelle sur Android uniquement. Pour le code natif spécifique
> (ex. `expo-blur`), coder le chemin iOS correctement mais le considérer **non vérifié sur iOS**.
> **Distribution** : un **APK Android de test** (pas de publication store), cf. [[project_mobile_distribution]].

### Finitions in-app
- [~] **Icône d'app** : laissée telle quelle ; à rebrander seulement si nouveaux visuels.

### Distribution (reportée — cf. [[project_mobile_distribution]])
- [x] `eas.json` + champs `app.json` (`android.package`, `extra.eas.projectId`)
- [x] Compte Expo + `eas-cli` (côté utilisateur)
- [x] `eas build -p android --profile preview` → APK installable
- [ ] Tests sur Android (appareil réel via l'APK)
- [ ] iOS / stores : plus tard (nécessite compte Apple)

---

## Phase 10 — Sécurité (prod) — app & web

> Audit de **vérification en production** (beaucoup de garde-fous existent déjà côté Django) + ajouts manquants.
> Légende : `[~]` = présent dans le code, **à confirmer en prod** ; `[ ]` = à ajouter/faire.

### Premiers pas (rapides)
- [~] `python manage.py check --deploy` (avec `DEBUG=False`, sur le VPS) → lancé ; restait 3 warnings : `SECRET_KEY` faible (à régénérer dans `.env.production`), HSTS (ajouté), `static` manquant (corrigé via `.gitignore`). Objectif 0 alerte.
- [x] `/security-review` (Claude Code) → revue du code (injections, IDOR, secrets, logs sensibles) : **0 vulnérabilité** sur le diff de la branche.

### A. Backend / API (Django)
- [~] `DEBUG=False` en prod ; `ALLOWED_HOSTS` restreint (pas `*`) ; `SECRET_KEY` unique hors dépôt
- [~] CORS restreint (pas `ALLOW_ALL`) ; redirection HTTPS + cookies `Secure` + `SECURE_PROXY_SSL_HEADER`
- [~] **HSTS** (`SECURE_HSTS_SECONDS` + subdomains) ajouté dans `settings.py` à **1 jour** (prudent) ; à passer à 1 an + preload après quelques jours stables
- [x] **Rate limiting** — throttling DRF (`ScopedRateThrottle`) : login 10/min, inscription 5/h, mdp oublié 3/h, reset 10/h, contact 3/h + test `LoginThrottleTests`. UX 429 gérée côté front (web + mobile) via helper `getThrottleMessage` (« Réessaie dans X s »), `Retry-After` exposé via `CORS_EXPOSE_HEADERS`. **Vraie IP derrière Nginx** : OK — `nginx.conf` pose déjà `X-Forwarded-For` + `NUM_PROXIES=1` ajouté dans `settings.py` (non contournable). ⏳ **Reste (faible enjeu)** : cache `LocMemCache` = par worker (gunicorn `--workers 3`) → limite effective ×3 ; passer à **Redis** (cache partagé) si besoin de précision à plus grande échelle.
- [x] **Validation des mots de passe** (`AUTH_PASSWORD_VALIDATORS`) — appliquée via helper `validate_password_strength` (serializers.py) à l'**inscription** (`UserSerializer.validate`) et à la **modif de profil** (`UpdateProfileSerializer.validate`), + `validate_password` dans `ResetPasswordView`. Messages en français (`LANGUAGE_CODE='fr-fr'`). Le front (web + mobile) affiche les vraies raisons (`data.password`). Tests `PasswordValidationTests` (court / trop commun / robuste).
- [ ] **Permissions par endpoint** (`IsAuthenticated`) + anti-**IDOR** (swipes, amitiés, filmothèque privée, `me/...`)
- [x] **Tokens JWT** : access 30 min, **refresh 30 jours** + **rotation** (`ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION`, app `token_blacklist` + migration) = session glissante. Les 3 clients re-stockent le nouveau refresh à chaque rafraîchissement (web `ProtectedRoute`/`landing_page`, mobile `client.js`/`authSlice`). **Déconnexion serveur** : endpoint `POST /api/logout/` (`LogoutView`, AllowAny) qui blackliste le refresh ; web (`logoutServer` dans `App.jsx`) + mobile (`authSlice.logout`) l'appellent avant de vider le stockage local. Tests `JWTRotationTests` + `LogoutTests`. ⏳ Prod : migration + cron `flushexpiredtokens` (cf. section D).
- [ ] Throttle / `maxLength` sur champs libres (contact, commentaires)

### B. Frontend web
- [ ] Build prod sans source maps / `console.log` sensibles ; aucune clé secrète dans le bundle
- [ ] En-têtes Nginx : CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- [ ] Front sain (pas d'injection HTML non échappée — `localStorage` exposé au XSS)

### C. App mobile
- [~] Tokens dans `expo-secure-store` (OK, Phase 2)
- [ ] **HTTPS only** (pas de cleartext HTTP ; `usesCleartextTraffic` off sur Android)
- [ ] Pas de secret embarqué (`EXPO_PUBLIC_*` est public) ; aucune donnée sensible loggée
- [ ] (Plus tard) certificate pinning si besoin élevé

### D. Infra / déploiement
- [x] Certificat HTTPS valide + auto-renouvelé (Let's Encrypt) ; renouvellement réparé via `pre_hook`/`post_hook` certbot (stop/start le `frontend` Docker pour libérer le port 80), validé par `--dry-run`
- [ ] **Prod JWT rotation/blacklist** (suite de la section A) :
  - [ ] **Migration** au déploiement : `python manage.py migrate` doit créer les tables `token_blacklist` en **PostgreSQL** (la migration n'a tourné qu'en SQLite dev). À faire après `docker compose up -d --build backend`.
  - [ ] **Cron de purge** : la table `OutstandingToken` grossit à chaque rotation (1 ligne / rafraîchissement / utilisateur). Planifier `python manage.py flushexpiredtokens` (ex. hebdo) pour supprimer les jetons déjà expirés. À exécuter dans le conteneur backend (`docker compose exec backend ...`).
- [ ] Nginx à jour, pas de listing, taille de requête limitée
- [ ] BDD non exposée publiquement + sauvegardes testées
- [ ] Secrets (`.env.production`) hors dépôt, droits restreints ; OS/Docker à jour, SSH durci, pare-feu 80/443

### E. Dépendances & process
- [ ] Audit des dépendances : `pip-audit` (backend), `npm audit` (web + mobile)
- [ ] Plan de réaction en cas de fuite (rotation `SECRET_KEY`/tokens, invalidation des sessions)

---

## 🐛 Dettes & TODO des phases livrées

- [ ] **Swipe ultra-rapide** (Phase 5) : enchaîner plus vite que le réseau peut afficher « Tu as tout vu ! » à tort. À durcir si gênant.
- [ ] **Notifications** : à faire.
- [ ] *(optionnel)* `pendingCount` dans un slice Redux (rafraîchir le badge après accept/decline).
- [x] lower case lors de la connexion avec email et création du compte (mat@gmail.com = Mat@gmail.com) (app et web)
- [x] lower case sur les pseudo (web et mobile app) pour éviter d'avoir deux pseudo identiques avec des majuscule et minuscules
- [x] Filtre bouton réinitialiser devrait valider les filtres

### Limites connues (pas des bugs)
- Bandes-annonces dont l'embed YouTube est désactivé par le propriétaire : ne jouent pas en intégré (restriction côté contenu).

---

*Dernière mise à jour : 2026-06-06 (Phase 10 : `/security-review` → 0 vulné ; **rate limiting** ; **validation des mots de passe** (inscription + profil + reset, messages FR) ; **JWT rotation + refresh 30 j** (session glissante) ; **déconnexion serveur** `/api/logout/` (blacklist du refresh, web + mobile), tests OK (7). Reste section A : fix unsubscribe ; + vérifs/exécutions prod (migration token_blacklist + cron flushexpiredtokens, throttling IP derrière Nginx, LocMemCache×3).)*
