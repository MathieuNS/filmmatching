# 🎬 FilmMatching Mobile — Feuille de route

Suivi de la transformation du **site web** (`frontend/`, React + Vite) en **application mobile** (`mobile_app/`, React Native + Expo).

> **Principe** : le backend Django ne change pas. L'app mobile est un **nouveau client** qui appelle les mêmes endpoints. On reconstruit l'interface écran par écran.
>
> Pour cocher une case : remplace `[ ]` par `[x]`.

---

## 📊 Avancement global

- [x] Landing page (écran de démo, déjà portée)
    - [x] Font (Outfit / Sora)
    - [x] logo du site
    - [x] landing page scrollable alors que ça devrait être full screen (corrigé : `ScrollView` → `SafeAreaView` plein écran centré)
- [x] Couleurs / dégradés centralisés (`constants/colors.js`)
- [x] Phase 0 — Fondations techniques
- [x] Phase 1 — Système de thème
- [x] Phase 2 — API + authentification
- [x] Phase 3 — Navigation
- [x] Phase 4 — Écrans d'authentification (périmètre simplifié : 4 écrans)
- [ ] Phase 5 — Le swipe (cœur de l'app)
- [ ] Phase 6 — Social : amis & matchs
- [ ] Phase 7 — Catalogue & détails
- [ ] Phase 8 — Compte & pages statiques/légales
- [ ] Phase 9 — Finitions & distribution

---

## 🧱 Décisions arrêtées

| Sujet | Choix |
|---|---|
| Gestion de l'état | **Redux Toolkit** |
| Navigation principale | **Menu burger** (comme le web, pas de barre d'onglets) |
| Stockage des tokens | **expo-secure-store** (chiffré) |
| Stockage des filtres | **AsyncStorage** |
| Thème (couleurs/polices) | Centralisé dans `constants/` |

### Correspondances web → mobile

| Brique web | Équivalent mobile |
|---|---|
| `react-router-dom` | React Navigation (stack) |
| `localStorage` (tokens) | expo-secure-store |
| `localStorage` (filtres) | AsyncStorage |
| état dispersé dans les pages | Redux Toolkit (store central) |
| fichiers `.css` | `StyleSheet` + `constants/` |
| polices Google Fonts | @expo-google-fonts (Outfit + Sora) |
| swipe souris/tactile | gesture-handler + reanimated |
| modales / bottom sheets CSS | Modal RN / @gorhom/bottom-sheet |
| `<img>`, SVG | expo-image, react-native-svg |
| liens d'email (`/reset/:token`) | deep linking (expo-linking) |

---

## Phase 0 — Fondations techniques
*Installer la "plomberie" commune à toute l'app.*

- [x] Installer les libs cœur : `@reduxjs/toolkit`, `react-redux`, `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-safe-area-context`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `axios`, `jwt-decode`
- [x] Créer `mobile_app/.env` avec `EXPO_PUBLIC_API_URL` (+ note IP locale pour téléphone physique) — `.env.example` versionné, `.env` ignoré par git
- [x] Mettre en place la structure de dossiers : `constants/`, `api/`, `store/`, `navigation/`, `screens/`, `components/`

## Phase 1 — Système de thème (design system)
*Que tous les écrans piochent dans une seule source de style.*

- [x] `constants/colors.js` (couleurs + dégradés)
- [x] `constants/fonts.js` + chargement des polices **Outfit / Sora** au démarrage (dans `App.js`)
- [x] `constants/spacing.js` (rayons, marges, ombres récurrentes)
- [x] Composants réutilisables : `GradientText`, `Button`, `Card`, `Pill/Badge`, `Input` (dans `components/`, + baril `components/index.js`)

## Phase 2 — API + authentification
*Se connecter et rester connecté de façon sécurisée.*

- [x] `api/storage.js` : wrapper autour de `expo-secure-store` (remplace `localStorage` pour les tokens)
- [x] `api/client.js` : axios + intercepteur (injecte le token + rafraîchit automatiquement sur 401, avec file d'attente anti-boucle)
- [x] `store/` : configuration Redux Toolkit + `authSlice` (`bootstrapAuth` / `login` / `logout` / `sessionExpired`) ; `<Provider>` branché dans `App.js`

## Phase 3 — Navigation
*Circuler entre les écrans.*

- [x] **AuthStack** (non connecté) : landing → login / inscription / mots de passe (écrans non encore construits = `_Placeholder`)
- [x] **AppStack** (connecté) : tous les écrans dans une pile, header partagé `AppHeader` (logo + menu)
- [x] Composant **`HamburgerMenu`** porté du web (menu déroulant en `Modal`, badge demandes, déconnexion via `dispatch(logout())`)
- [x] `RootNavigator` qui choisit AuthStack ou AppStack selon `authSlice` (remplace `ProtectedRoute`) ; `LoadingScreen` pendant `bootstrapAuth`
- [x] Brancher les boutons de la landing page (routes `Login` / `CreateLogin`)

## Phase 4 — Écrans d'authentification

- [x] `login` (`POST /api/token/`) — via `dispatch(login())`, bascule auto AppStack
- [x] `create_login` (`POST /api/users/create/`) — 2 cases à cocher, → `CheckEmail`
- [x] `forgot_password` (`POST /api/users/forgot-password/`)
- [x] `check_email`
- [x] Composants partagés `AuthLayout` + `Checkbox` ; correctif `authSlice` (login ne déclenche plus le LoadingScreen)
- [~] `reset_password` / `activate_account` : **gérés par le site web** (les liens email pointent vers `FRONTEND_URL`). Non construits dans l'app — restent en `_Placeholder`.
- [~] **Deep linking** : reporté (inutile tant que les emails ouvrent le site). À revoir en phase 9 avec des Universal Links si besoin.

## Phase 5 — Le swipe (cœur de l'app) — `home`
*La pièce la plus technique.*

- [ ] Carte de film swipable au doigt (gesture-handler + reanimated) : like / dislike / déjà vu
- [ ] Chargement du deck + filtres (`/api/genres/`, `/api/platforms/`) + recherche (`/api/films/search/`)
- [ ] Envoi des swipes (`POST /api/swipes/`) + animation "It's a Match !"
- [ ] Persistance des filtres en AsyncStorage

## Phase 6 — Social : amis & matchs

- [ ] `Friends` : liste, recherche, demandes (`/api/friends/...`, `/api/friends/pending-count/`)
- [ ] `match_list` : matchs à deux et en groupe (`/api/friends/.../matches/`, `group-matches/`), "déjà vu", pick aléatoire
- [ ] Composants `FriendRatingsBadge` / `FriendRatingsSection` / `FriendRatingsSheet`

## Phase 7 — Catalogue & détails

- [ ] `films_list` : mes likes / seen / dislikes (`/api/swipes/list/`), filtres, common-likes
- [ ] `a_l_affiche` (`/api/films/now-playing/`)
- [ ] Carte `Film`
- [ ] Modale détail (`FilmDetailModal`)
- [ ] Bottom sheet de filtres (`FilterBottomSheet`)
- [ ] `CommentModal`, `StarRating`, `RatingPrompt`

## Phase 8 — Compte & pages statiques/légales

- [ ] `user_account` : profil, avatar, mise à jour, suppression (`/api/users/me/...`)
- [ ] `contact` (`POST /api/contact/`)
- [ ] `donation`
- [ ] `rgpd`
- [ ] `mentions_legales`
- [ ] `unsubscribe`
- [ ] `notfound`
- [ ] Footer `TmdbAttribution` adapté

## Phase 9 — Finitions & distribution

- [ ] Icônes SVG (logos FilmMatching / TMDB) via `react-native-svg`
- [ ] Splash screen, icône d'app, gestion du clavier, zones sûres (encoches)
- [ ] Tests sur Android **et** iOS
- [ ] Build & publication avec **EAS Build**

---

*Dernière mise à jour : 2026-06-01 (Phase 4 — Auth : login / create_login / forgot_password / check_email ; reset/activate délégués au site web)*
