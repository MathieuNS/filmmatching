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
- [] Phase 4 — Écrans d'authentification (périmètre simplifié : 4 écrans)
- [x] Phase 5 — Le swipe (cœur de l'app)
- [x] Phase 6 — Social : amis & matchs
- [x] Phase 7 — Catalogue & détails
- [x] Phase 8 — Compte & pages statiques/légales
- [ ] Phase 9 — Finitions & distribution
- [ ] Phase 10 — Sécurité (prod) — app **et** web

---

## 🧱 Décisions arrêtées

| Sujet | Choix |
|---|---|
| Gestion de l'état | **Redux Toolkit** |
| Navigation principale | **Menu burger** (comme le web, pas de barre d'onglets) |
| Stockage des tokens | **expo-secure-store** (chiffré) |
| Stockage des filtres | **AsyncStorage** |
| Thème (couleurs/polices) | Centralisé dans `constants/` |
| Geste de swipe (Phase 5) | **PanResponder + Animated** (intégrés RN, zéro install). On s'est écarté de "gesture-handler + reanimated" : pour une seule carte, la différence de fluidité est invisible et le code reste calqué sur le web. Migration possible plus tard si besoin de perf. |
| Bande-annonce / plateformes (Phase 5) | **Modales complètes** comme le web : lecteur YouTube via **`react-native-youtube-iframe`** (l'iframe faite main via `react-native-webview` donnait l'erreur YouTube 150/152 "vidéo indisponible" ; la lib dédiée gère l'origine correctement) + modale "Où regarder" (`Linking` pour ouvrir les liens). |
| Avatars (Phase 6) | SVG **statiques** portés en chaînes JS + rendus via **`SvgXml`** (`react-native-svg`, déjà installé) — pas de `react-native-svg-transformer` (éviterait de toucher `metro.config.js`/babel). Fallback **avatar-lettre** si le nom est inconnu. |
| `FilmDetailModal` (Phase 6, option A) | **Avancé de la Phase 7 à la Phase 6** car mutualisé entre `match_list` (P6) et `films_list`/`a_l_affiche` (P7). Entraîne un `StarRating` **interactif** et une **variante « détail »** de `FilmCard` (hauteur bornée + scroll, vs `flex:1` plein écran du swipe). |

### Correspondances web → mobile

| Brique web | Équivalent mobile |
|---|---|
| `react-router-dom` | React Navigation (stack) |
| `localStorage` (tokens) | expo-secure-store |
| `localStorage` (filtres) | AsyncStorage |
| état dispersé dans les pages | Redux Toolkit (store central) |
| fichiers `.css` | `StyleSheet` + `constants/` |
| polices Google Fonts | @expo-google-fonts (Outfit + Sora) |
| swipe souris/tactile | **PanResponder + Animated** (intégrés RN — cf. décisions, on n'a pas pris gesture-handler/reanimated) |
| modales / bottom sheets CSS | **`Modal` RN** (utilisé en Phase 5 pour recherche/filtres/match/trailer ; `@gorhom/bottom-sheet` non nécessaire pour l'instant) |
| lecteur YouTube (`<iframe>`) | **`react-native-youtube-iframe`** |
| `<img>`, SVG | `Image` RN (distant via `{ uri }`), react-native-svg pour les SVG |
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
- [x] impossible de s'identifier, le user n'est pas reconnu

## Phase 5 — Le swipe (cœur de l'app) — `home`
*La pièce la plus technique.*

- [x] Carte de film swipable au doigt (**PanResponder + Animated**, cf. décisions) : like / dislike / déjà vu — `screens/home.js` + `components/FilmCard.js`
- [x] Chargement du deck + filtres (`/api/genres/`, `/api/platforms/`) + recherche (`/api/films/search/`) — `api/films.js`, `components/FilterSheet.js`, `components/SearchOverlay.js`
- [x] Envoi des swipes (`POST /api/swipes/`) + animation "It's a Match !" — `components/MatchOverlay.js`
- [x] Persistance des filtres en AsyncStorage — `api/filtersStorage.js`
- [x] Modales bande-annonce (`react-native-youtube-iframe`) + "Où regarder" (`Linking`) dans `FilmCard`
- [x] Carte `Home` branchée dans `AppStack` (remplace le `_Placeholder`)
- [x] Loupe + bouton Filtres déplacés **dans le header partagé** (comme le web) : `AppHeader` accepte une prop `rightActions`, et `Home` les injecte via `navigation.setOptions` (uniquement pour cet écran) → plus de hauteur pour la carte
- [x] "voir plus" sur le synopsis (3 lignes) et les acteurs (1 ligne) via `onTextLayout` ; "voir plus" sur les **plateformes** via mesure de hauteur (composant `ExpandablePills` dans `FilmCard`)
- [x] Correctif anti-répétition : on **attend** la confirmation du `POST /api/swipes/` avant de pré-charger le film suivant (sinon le backend re-proposait le film à peine swipé)

### Reste à faire / dette assumée (Phase 5)
- [x] **Avatars réels dans l'animation de match** (Phase 6) : SVG embarqués (`assets/avatars/avatarsData.js`) + `utils/avatars.js` + `components/Avatar.js` (`SvgXml`, fallback lettre). Branché dans `MatchOverlay` et partout où on affiche des amis.
- [x] **Notes des amis sur la carte** (Phase 6) : `FilmCard` affiche désormais `FriendRatingsSection` (étoiles `StarRating` + bottom sheet `FriendRatingsSheet` interactif) au lieu du résumé texte.
- [ ] **"voir plus" sur les genres** : pas encore branché (on affiche tous les genres). Le composant `ExpandablePills` est réutilisable — il suffit d'envelopper la rangée de genres comme pour les plateformes.
- [ ] **Cas limite swipe ultra-rapide** : si on enchaîne les swipes plus vite que le réseau ne répond, l'écran "Tu as tout vu !" peut apparaître à tort le temps que le film suivant se pré-charge (même limite que le web). À durcir si gênant (recharger un film à la volée si le pré-chargé manque).
- [ ] **Vidéos à intégration désactivée** : certaines bandes-annonces dont le propriétaire a désactivé l'embed YouTube ne joueront pas en intégré (restriction côté contenu, pas un bug).

## Phase 6 — Social : amis & matchs

> **Périmètre — option A retenue** : on **avance `FilmDetailModal` (+ `RatingPrompt`) en Phase 6**.
> Raison : la modale détail est mutualisée entre `match_list` (Phase 6) et `films_list`/`a_l_affiche` (Phase 7).
> Conséquence : on porte aussi un `StarRating` **interactif** (pas seulement read-only) et on ajoute une
> **variante « détail »** à `FilmCard` (hauteur bornée + scroll), car aujourd'hui il est taillé pour
> remplir l'écran de swipe (`flex:1`, overlay `position:absolute`).
>
> Endpoints (déjà confirmés dans le code web) :
> `GET /api/users/me/`, `GET /api/friends/`, `GET /api/users/search/?q=`, `POST /api/friends/ {receiver}`,
> `PATCH /api/friends/<id>/accept/`, `DELETE /api/friends/<id>/delete/`, `GET /api/friends/pending-count/`,
> `GET /api/friends/<id>/matches/`, `GET /api/friends/group-matches/?ids=`, `GET /api/friends/<id>/seen/` (403 `{error:"private"}`),
> `POST /api/swipes/ {film,status,rating?}`.

### Brique 0 — Préalables transverses (à faire en premier)
- [x] **Avatars** : copier les 5 SVG (`frontend/src/assets/avatars/*.svg`, statiques) côté mobile.
    - [x] `assets/avatars/avatarsData.js` (chaînes SVG) + rendu via `SvgXml` (`react-native-svg`, déjà installé)
    - [x] `utils/avatars.js` (`getAvatarXml`, renvoie la chaîne SVG + défaut `avatar-popcorn.svg`)
    - [x] `components/Avatar.js` : `<Avatar name size fallbackLabel />` avec **fallback avatar-lettre** (pastille dégradée)
- [x] **`components/StarRating.js`** — **interactif** (requis par `RatingPrompt`) + mode `readOnly` (prop `showScore`).
      Demi-étoiles : zones tap gauche/droite (`locationX`) ; affichage via étoile pleine clipée (`overflow:hidden`) par-dessus l'étoile vide (2 `<Svg><Path/></Svg>`).
- [x] **`components/CommentModal.js`** (`Modal` RN) — lecture seule (commentaire d'un ami) + mode édition (`TextInput multiline`).

### Brique 1 — API
- [x] `api/friends.js` : centralise tous les appels (`fetchMe`, `fetchFriendships`, `searchUsers`,
      `sendFriendRequest`, `acceptFriend`, `deleteFriend`, `fetchMatches`, `fetchGroupMatches`, `fetchFriendSeen`,
      `addToWatchlist`, `markAsSeen`). Réutilise `fetchFilterOptions` de `api/films.js`.

### Brique 2 — Écran `screens/Friends.js` (port de `Friends.jsx`)
- [x] Tri client en 3 listes : demandes reçues / envoyées / amis confirmés (helpers `getFriendName`/`getFriendAvatar`)
- [x] Ajout d'ami : `TextInput` + autocomplétion **debounce 300ms** + suggestions + feedback succès/erreur
- [x] Actions accept / decline / cancel / remove avec **mises à jour optimistes** du state local
- [x] Mode « Soirée cinéma » : `selectMode` + `selectedIds` (Set) + barre flottante « Voir les matchs (n) » (≥ 2)
- [x] Navigation : ami → `navigate("MatchList", { friendshipId })` ; groupe → `navigate("MatchList", { groupIds })`

### Brique 3 — Notes des amis + branchements
- [x] `components/FriendRatingsSheet.js` (bottom sheet `Modal`, **pas de `createPortal`**) : hero moyenne, récap `getCountLine`, liste avatar+étoiles | "Vu, sans note" + 💬 → `CommentModal`
- [x] `components/FriendRatingsSection.js` : ligne compacte sur la carte → ouvre le Sheet
- [x] Brancher dans `FilmCard.js` : remplacer le **résumé texte** Phase 5 par `<FriendRatingsSection />` (tap ≠ swipe : le PanResponder ne capture qu'au-delà de 8px de mouvement)
- [x] `MatchOverlay.js` : remplacer l'avatar-lettre par `<Avatar />` (lève la dette Phase 5)
- [x] `components/FriendRatingsBadge.js` (réutilise le Sheet ; point d'usage = onglets `/liste` en Phase 7)

### Brique 4 — `FilmDetailModal` + `RatingPrompt` (avancés, option A)
- [x] Ajouter une **variante « détail »** à `FilmCard` (prop `variant="detail"`, `aspectRatio` 2:3) pour l'afficher en modale `ScrollView`
- [x] `components/RatingPrompt.js` : `StarRating` interactif + label émotionnel (`getFeedbackLabel`) + Valider / Sans note
- [x] `components/FilmDetailModal.js` (`Modal` RN) : fiche film + (contexte filmothèque) note ami read-only, badge « mon statut », boutons « Ajouter à ma watchlist » / « Déjà vu aussi » (→ `RatingPrompt`), section « Aussi aimé par »

### Brique 5 — Écran `screens/match_list.js` (port de `match_list.jsx`)
- [x] Mode déduit des params : `route.params.friendshipId` (1v1) vs `route.params.groupIds` (groupe)
- [x] Onglets 1v1 « À voir ensemble » / « Sa filmothèque » ; bandeau avatars en mode groupe
- [x] Filtres client (`filterFilms` + réutilisation de `FilterSheet`) + badge nombre de filtres
- [x] Choix aléatoire 🎲 + **modale inline autonome** (« Ce soir vous regardez… » / Fermer / Relancer)
- [x] Grilles en `FlatList` (`numColumns=3`), ouverture `FilmDetailModal` au tap
- [x] Onglet filmothèque : `fetchFriendSeen`, gestion **403 privée** 🔒, note ami (étoiles read-only), badge statut, 💬 → `CommentModal`, actions watchlist / déjà vu

### Brique 6 — Navigation & finitions
- [x] `AppStack.js` : remplacer les `Placeholder` de `Friends` et `MatchList` par les vrais écrans
- [x] Bouton **retour** : approche plus simple que prévu — `AppHeader` lit la prop `back` (fournie par React Navigation) et affiche une flèche ← qui appelle `navigation.goBack()`, automatiquement sur tous les écrans poussés (pas besoin de setOptions par écran)
- [ ] *(optionnel, non fait)* déplacer `pendingCount` dans un slice Redux pour rafraîchir le badge après accept/decline
- [x] Cases cochées + dettes Phase 5 levées (avatars réels, notes amis interactives) + date bumpée

## Phase 7 — Catalogue & détails

> **Beaucoup de briques étaient déjà faites en Phase 6** (option A) : `FilmDetailModal`,
> `FilterSheet`, `CommentModal`, `StarRating`, `FriendRatingsBadge`, `Avatar`, `MatchOverlay`,
> `filtersStorage`. La Phase 7 a surtout consisté à monter les 2 écrans grille et à les câbler.

### API
- [x] `api/films.js` : `fetchSwipesList(status)` (`/api/swipes/list/?status=`),
      `updateSwipe(id, payload)` (PATCH `/api/swipes/<id>/`, sert statut/note/commentaire),
      `fetchNowPlaying()` (`/api/films/now-playing/`)
- [x] `api/friends.js` : `fetchCommonLikes()` (`/api/friends/common-likes/`)

### `films_list` : "Ma liste"
- [x] 3 onglets like / seen / dislike (chargement parallèle `Promise.all`), compteurs
- [x] Grille `FlatList numColumns=3` (réutilise le patron de `match_list`)
- [x] Onglet "À voir" : avatars amis empilés (max 3 + « +N ») + `FriendRatingsBadge`
- [x] Onglet "Pas intéressé" : `FriendRatingsBadge`
- [x] Onglet "Déjà vu" : `StarRating` **interactif** (note perso) + pastille 💬 commentaire,
      **tri par note** décroissante avec **gel 2 s** après une modif de note
- [x] Menu contextuel ⋯ (en `Modal`) : changement de statut + (seen) commentaire
- [x] Recherche locale + suggestions d'autocomplétion (5 max), vidée au changement d'onglet
- [x] Filtres via `FilterSheet` + `filtersStorage` (**même clé que Home → partagés**), badge
- [x] `FilmDetailModal` au tap (passe `friends` = amis ayant aussi liké) + `CommentModal` (édition)

### `a_l_affiche` : "À l'affiche"
- [x] `fetchNowPlaying` + compteur + grille `FlatList numColumns=3`, badge statut en coin
- [x] `FilmDetailModal` en **contexte « affiche »** (3 boutons swipe directs + état actif) —
      décision plan : on a **étendu `FilmDetailModal`** (props `onSwipe` / `userStatus`) au lieu de
      dupliquer une modale immersive
- [x] Animation match réutilisant `MatchOverlay`

### Navigation
- [x] `AppStack.js` : `FilmList` et `AlAffiche` branchés (remplacent les `Placeholder`) ;
      le `HamburgerMenu` pointait déjà sur ces routes

### Reste / dette assumée (Phase 7)
- [ ] "voir plus" sur les genres (dette commune avec Phase 5, composant `ExpandablePills` dispo)
- [ ] À TESTER sur appareil/émulateur (notamment : tap étoiles vs ouverture fiche sur petite carte,
      suggestions de recherche avec le clavier ouvert)

## Phase 8 — Compte & pages statiques/légales

> **Décisions du plan** : `unsubscribe` et `notfound` **ignorés** sur mobile
> (pas de route 404 native ; le lien de désinscription email ouvre le SITE web,
> cf. [[project_mobile_auth_email_links]] ; et le toggle « Notifications email »
> de Mon Compte permet déjà de se désinscrire dans l'app). Accès aux pages
> légales via un **footer `TmdbAttribution`** (comme le web), pas via le menu.

### API & composants partagés
- [x] `api/account.js` : `updateProfile` (PATCH `/me/update/`), `updateAvatar`
      (PATCH `/me/avatar/`), `deleteAccount` (DELETE `/me/delete/`), `sendContact`
      (POST `/api/contact/`). Réutilise `fetchMe` de `api/friends.js`.
- [x] `components/TmdbAttribution.js` : footer (mention TMDB + liens RGPD /
      Mentions / Contact / Soutenir) — **point d'entrée vers les pages légales**.
- [x] `components/StaticScreenHeader.js` : en-tête « ← + titre » pour les pages
      sans `AppHeader` (légales + donation + contact).
- [x] Toggles via le `Switch` natif RN (thématisé), pas de composant maison.

### Écrans
- [x] `user_account` : avatar + **sélecteur d'avatar** (grille `AVATARS`), édition
      pseudo/email/mot de passe (+ confirmation conditionnelle), 2 toggles
      (notifications email, partage filmothèque), sauvegarde des **seuls champs
      modifiés** (+ erreurs DRF + message succès 3 s), suppression de compte
      (modale → `deleteAccount` → `dispatch(logout())`). Garde l'`AppHeader`.
- [x] `contact` : formulaire (nom/email/sujet/message) → POST, succès/erreur,
      lien `mailto:` (`Linking`). `KeyboardAvoidingView`.
- [x] `donation` : contenu + 2 cartes « raisons » + bouton **Tipeee** (`Linking`).
- [x] `rgpd` : 12 sections (rendues depuis un tableau de données).
- [x] `mentions_legales` : 7 sections.
- [~] `unsubscribe` / `notfound` : **non construits** (cf. décisions) — restent en `_Placeholder`.

### Navigation
- [x] `AppStack` : `UserAccount` (garde l'`AppHeader`) ; `Donation`, `RGPD`,
      `MentionsLegales`, `Contact` branchés avec `headerShown:false` (en-tête propre).
      Import `_Placeholder` retiré (plus utilisé).
- [x] `AuthStack` : `RGPD`, `MentionsLegales`, `Contact` branchés + **ajout route
      `Donation`** (accessibles déconnecté).
- [x] Footer ajouté sur la **landing** (remplace l'ancien bloc TMDB texte) et **Mon Compte**.

### Reste / dette assumée (Phase 8)
- [ ] Logo SVG TMDB dans le footer (prévu Phase 9 — icônes SVG) ; pour l'instant
      mention texte uniquement.
- [ ] À TESTER sur appareil/émulateur (clavier sur Contact, sélecteur d'avatar,
      suppression de compte → retour à l'AuthStack).

## Phase 9 — Finitions & distribution

> **En cours** : on traite d'abord les **finitions in-app**. La **distribution (EAS)**
> est reportée — objectif décidé : un **APK Android de test** (pas de publication
> store), cf. [[project_mobile_distribution]].
>
> **Cible = iOS *et* Android** (l'app doit marcher sur les deux). **MAIS** le développeur
> ne possède qu'un **appareil Android** (téléphone physique + émulateur) : **tous les
> tests réels se font sur Android**, aucun appareil/simulateur iOS disponible (pas de
> Mac / pas de compte Apple pour l'instant). Donc : on écrit du **code cross-platform**
> et on suit les API iOS+Android d'Expo même si seul Android est vérifiable ; quand une
> brique dépend de **code natif spécifique** (ex. `expo-blur`, chemins Android/iOS
> distincts), on code le chemin iOS correctement mais il reste **non vérifié sur iOS**.
> La **distribution** démarre côté **Android** ; iOS plus tard (compte Apple requis).

### Finitions in-app
- [x] **Logo TMDB en SVG** dans le footer (`assets/logos/tmdbLogo.js` + `SvgXml`
      dans `TmdbAttribution`) — lève la dette Phase 8. (Classe CSS `.cls-1` du SVG
      d'origine convertie en `fill="url(#tmdb-gradient)"` car `SvgXml` n'interprète
      pas le `<style>` interne.) Logo **FilmMatching** laissé en PNG (icône + wordmark
      en `GradientText`), suffisant.
- [x] **Splash screen** configuré dans `app.json` (plugin `expo-splash-screen` :
      image `splash-icon.png`, `imageWidth 200`, `resizeMode contain`, fond `#0D0D0F`).
- [x] **Nom d'app** = « FilmMatching » + `userInterfaceStyle: dark` (`app.json`).
- [x] **Clavier** : déjà géré (`AuthLayout` pour l'auth, `KeyboardAvoidingView` sur
      contact & compte) — rien à ajouter.
- [x] **Zones sûres** : haut géré partout (`AppHeader`/`StaticScreenHeader`/`SafeAreaView`) ;
      ajout du `insets.bottom` sur l'écran plein écran « Mon Compte ».
- [~] **Icône d'app** : laissée telle quelle (`icon.png` + adaptive icons fournis par
      l'utilisateur). À rebrander seulement s'il fournit de nouveaux visuels.

### Distribution (reportée — voir [[project_mobile_distribution]])
- [ ] `eas.json` + champs `app.json` (`android.package`, `extra.eas.projectId`)
- [ ] Compte Expo + `eas-cli` (côté utilisateur)
- [ ] `eas build -p android --profile preview` → APK installable
- [ ] Tests sur Android (sur appareil réel via l'APK)
- [ ] iOS / stores : plus tard (nécessite compte Apple)

## Phase 10 — Sécurité (prod) — app & web

*Objectif : s'assurer que le backend, le site web et l'app mobile sont sûrs **en
production**. Beaucoup de garde-fous existent déjà côté Django : cette phase est
surtout un **audit de vérification** (les bons réglages sont-ils ACTIFS en prod ?)
+ quelques ajouts manquants. Légende : `[~]` = déjà présent dans le code, **à
confirmer en prod** ; `[ ]` = à ajouter/faire.*

### Premiers pas (rapides, à lancer en premier)
*Deux outils rapides et sans risque qui donnent tout de suite une liste priorisée :*
- [ ] **`python manage.py check --deploy`** — contrôle de la **configuration** Django
      pour la prod (DEBUG, HSTS, cookies sécurisés, ALLOWED_HOSTS…). À lancer avec
      `DEBUG=False`, donc sur le VPS : `docker compose exec backend python manage.py check --deploy`.
      Ça ne corrige rien : ça liste les réglages à durcir (objectif : 0 alerte).
- [ ] **`/security-review`** (commande Claude Code) — revue du **code** à la recherche
      de failles (injections, IDOR/accès aux données d'autrui, secrets en dur, logs
      sensibles…). À lancer sur les changements de la branche ; renvoie un rapport priorisé.

### A. Backend / API (Django)
- [~] `DEBUG=False` en prod (lu depuis `.env`) — **vérifier** que `.env.production`
      le force bien (une page d'erreur Django en prod fuite du code/des secrets).
- [~] `ALLOWED_HOSTS` restreint au(x) domaine(s) réel(s) (pas `*`) en prod.
- [~] `SECRET_KEY` unique, longue, **hors du dépôt** (dans `.env`), différente du dev.
- [~] CORS restreint (`CORS_ALLOWED_ORIGINS` = domaines connus) — pas `ALLOW_ALL` en prod.
- [~] Redirection HTTPS + cookies `Secure` (`SECURE_SSL_REDIRECT`, `SESSION/CSRF_COOKIE_SECURE`)
      + `SECURE_PROXY_SSL_HEADER` (Nginx) — **vérifier** que c'est actif (DEBUG=False).
- [ ] **HSTS** : ajouter `SECURE_HSTS_SECONDS` (+ `INCLUDE_SUBDOMAINS`, `PRELOAD`) une
      fois le HTTPS stable (force le navigateur à toujours utiliser HTTPS).
- [ ] **Rate limiting / anti-brute-force** sur les endpoints sensibles (login,
      création de compte, mot de passe oublié, contact) — throttling DRF
      (`DEFAULT_THROTTLE_CLASSES/RATES`) pour limiter les tentatives.
- [ ] **Validation des mots de passe** (`AUTH_PASSWORD_VALIDATORS`) active (longueur
      mini, pas trop commun).
- [ ] Vérifier les **permissions par endpoint** (chaque vue sensible en
      `IsAuthenticated`) et qu'on ne peut pas lire/modifier les données d'autrui
      (IDOR) : swipes, amitiés, filmothèque privée, `me/...`.
- [ ] **Durée des tokens JWT** revue (access court ; refresh raisonnable) + envisager
      la rotation/blacklist des refresh tokens à la déconnexion.
- [ ] `python manage.py check --deploy` → 0 alerte (cf. « Premiers pas »).
- [ ] Throttle/`maxLength` sur les champs libres (contact, commentaires) — déjà
      `maxLength 2000` côté commentaire à confirmer côté backend.

### B. Frontend web
- [ ] Build de prod **sans source maps** exposées / sans `console.log` sensibles.
- [ ] Aucune **clé secrète** dans le bundle (seules des URLs publiques) — vérifier le `.env`.
- [ ] En-têtes de sécurité servis par Nginx : `Content-Security-Policy` (au moins
      basique), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
- [ ] Stockage des tokens : conscience que `localStorage` est exposé au XSS — garder
      le front sain (pas d'injection HTML non échappée).

### C. App mobile
- [~] Tokens stockés dans `expo-secure-store` (chiffré) — OK (cf. Phase 2).
- [ ] **HTTPS obligatoire** : l'app ne parle qu'à `https://…` (pas de cleartext HTTP) ;
      garder `usesCleartextTraffic` désactivé sur Android (défaut).
- [ ] Pas de **secret embarqué** dans l'app (`EXPO_PUBLIC_*` est public par nature —
      n'y mettre que des valeurs non sensibles).
- [ ] Vérifier qu'aucune donnée sensible n'est **loggée** (`console.log` de tokens, etc.).
- [ ] (Plus tard, build store) envisager le **certificate pinning** si besoin élevé.

### D. Infra / déploiement
- [ ] **Certificat HTTPS** valide et renouvelé automatiquement (Let's Encrypt) ;
      note TLS correcte (test SSL Labs).
- [ ] Nginx : versions à jour, pas de listing de répertoire, taille de requête limitée.
- [ ] **Base de données** : non exposée publiquement (port fermé), accès par mot de
      passe fort ; **sauvegardes** régulières testées.
- [ ] Secrets (`.env.production`) hors dépôt, droits de fichier restreints sur le VPS.
- [ ] OS/Docker à jour ; SSH durci (clé, pas de root password) ; pare-feu (ports 80/443 seulement).

### E. Dépendances & process
- [ ] **Audit des dépendances** : `pip` (ex. `pip-audit`) côté backend, `npm audit`
      côté web et mobile — corriger les vulnérabilités hautes/critiques.
- [ ] Lancer `/security-review` sur les changements (cf. « Premiers pas »).
- [ ] Plan de **réaction** : que faire en cas de fuite (rotation `SECRET_KEY`/tokens,
      invalidation des sessions).

## Divers

- [x] dans home.js, retiré la ligne sous le header
- [x] s'assurrer que le designe de la landing page est identique au web
- [x] la fleche back du header doit toujours pointer sur home.js
- [x] supprimer la fleche back de home.js
- [] notifications

---

*Dernière mise à jour : 2026-06-04 (Précision **cible de plateformes** : l'app vise **iOS ET Android**, mais le développeur n'a qu'un **appareil Android** pour tester (téléphone + émulateur) — donc code cross-platform, mais vérification réelle sur Android uniquement. Note ajoutée dans `CLAUDE.md` (section Mobile app) et en tête de Phase 9.)*

*Mise à jour précédente : 2026-06-03 (Landing page — suite des ajustements : éléments **adaptés à la taille de l'écran** (cartes calculées en fraction de `SCREEN_HEIGHT`, répartition `space-between` + tailles agrandies) et **typo française** (espaces insécables avant `? !`). NB : un essai de remplacement des **emojis par des icônes SVG** a été **annulé** à la demande de l'utilisateur — on garde les emojis 🎬 🤝 ⚡ 👁 (le composant `components/Icon.js` créé pour l'occasion a été supprimé). À TESTER sur appareil/émulateur.)*

*Mise à jour précédente : 2026-06-03 (Landing page — ajustements visuels : **lueur violette douce sous la carte** du dessus (iOS via `shadow*` ; pas d'`elevation` Android pour éviter l'ombre dure) + **feedback d'appui** sur le bouton CTA (`Pressable` `pressed` → scale + lueur atténuée). NB : le **halo lumineux radial** du web a été tenté via `react-native-svg` puis **abandonné** — le dégradé radial « bande » (anneaux visibles) sur Android faute de dithering. À TESTER sur appareil/émulateur.)*

*Mise à jour précédente : 2026-06-02 (Ajout de la **Phase 10 — Sécurité (prod)** : checklist d'audit + ajouts pour sécuriser backend Django, web et app mobile en production. Le backend a déjà une bonne base — la phase est surtout une vérification que les bons réglages sont actifs en prod, + ajouts manquants (HSTS, rate-limiting, audit des dépendances).)*

*Mise à jour précédente : 2026-06-02 (Phase 9 — FINITIONS in-app faites. Logo TMDB en SVG dans le footer (`assets/logos/tmdbLogo.js`), splash screen configuré + nom d'app « FilmMatching » + thème sombre (`app.json`), `insets.bottom` ajouté sur « Mon Compte ». Clavier & safe-area haut déjà couverts. DISTRIBUTION (EAS / APK Android) reportée à la demande de l'utilisateur. Icônes d'app laissées telles quelles.)*

*Mise à jour précédente : 2026-06-02 (Phase 8 IMPLÉMENTÉE — Compte & pages statiques/légales. Nouveaux écrans : `screens/user_account.js`, `screens/contact.js`, `screens/donation.js`, `screens/rgpd.js`, `screens/mentions_legales.js`. Nouveaux fichiers : `api/account.js`, `components/TmdbAttribution.js`, `components/StaticScreenHeader.js`. Modifs : `AppStack` (UserAccount + pages statiques branchées, import Placeholder retiré), `AuthStack` (RGPD/Mentions/Contact + route Donation), `landing_page` (footer TmdbAttribution). Décisions : `unsubscribe`/`notfound` ignorés (web), accès légales via footer. À TESTER sur appareil/émulateur.)*

*Mise à jour précédente : 2026-06-02 (Phase 7 IMPLÉMENTÉE — Catalogue & détails. Nouveaux écrans : `screens/films_list.js` ("Ma liste", 3 onglets + grille + menu ⋯ + recherche + filtres partagés), `screens/a_l_affiche.js` ("À l'affiche", grille + contexte swipe + MatchOverlay). Ajouts API : `fetchSwipesList`, `updateSwipe`, `fetchNowPlaying` (api/films.js), `fetchCommonLikes` (api/friends.js). `FilmDetailModal` étendu avec un contexte "affiche" (props `onSwipe`/`userStatus` → 3 boutons de swipe). `AppStack` : FilmList + AlAffiche branchés. À TESTER sur appareil/émulateur.)*

*Mise à jour précédente : 2026-06-02 (Phase 6 IMPLÉMENTÉE — Social : amis & matchs. Nouveaux fichiers : `assets/avatars/avatarsData.js`, `utils/avatars.js`, `components/Avatar.js`, `components/StarRating.js`, `components/CommentModal.js`, `components/FriendRatingsSheet.js`, `components/FriendRatingsSection.js`, `components/FriendRatingsBadge.js`, `components/RatingPrompt.js`, `components/FilmDetailModal.js`, `api/friends.js`, `screens/Friends.js`, `screens/match_list.js`. Modifs : `FilmCard` (variante "detail" + section notes amis), `MatchOverlay` (vrais avatars), `AppHeader` (bouton retour via prop `back`), `AppStack` (Friends + MatchList branchés). Dettes Phase 5 levées : avatars réels, notes amis sur la carte. Reste optionnel : pendingCount dans Redux pour rafraîchir le badge. À TESTER sur appareil/émulateur.)*
