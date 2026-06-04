# 🎬 FilmMatching Mobile — Feuille de route

Suivi du portage du **site web** (`frontend/`, React + Vite) vers l'**app mobile** (`mobile_app/`, React Native + Expo).

> **Principe** : le backend Django ne change pas. L'app mobile est un **nouveau client** des mêmes endpoints. On reconstruit l'interface écran par écran.
> Pour cocher : `[ ]` → `[x]`. Cette feuille ne liste que **le suivi global, les décisions, et ce qui reste à faire** — le détail du déjà-livré est dans le code + l'historique git.

---

## 📊 Avancement global

- [x] Phase 0 — Fondations techniques
- [x] Phase 1 — Système de thème (`constants/`)
- [x] Phase 2 — API + authentification
- [x] Phase 3 — Navigation (AuthStack / AppStack / RootNavigator)
- [x] Phase 4 — Écrans d'auth *(périmètre simplifié : login, create, forgot, check_email)*
- [x] Phase 5 — Le swipe (cœur de l'app)
- [x] Phase 6 — Social : amis & matchs
- [x] Phase 7 — Catalogue & détails
- [x] Phase 8 — Compte & pages statiques/légales
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

### Finitions in-app — fait
- [x] Logo TMDB en SVG dans le footer ; splash screen + nom d'app + thème sombre (`app.json`)
- [x] Clavier géré (`AuthLayout`, `KeyboardAvoidingView` sur contact & compte)
- [x] Zones sûres **haut** : géré partout (`AppHeader` / `StaticScreenHeader` / `SafeAreaView`)

### Finitions in-app — à faire
- [ ] **Zones sûres BAS — audit par écran** : que rien (contenu, footer, boutons) ne passe **derrière
      les boutons système** (barre de navigation du bas) sur écran court. Constaté sur l'**Oppo Reno 2**.
      Correctif type : `insets.bottom` au `paddingBottom` **ET** rendre défilable si le contenu déborde
      (un padding seul ne corrige pas un débordement).
    - [x] `home` (3 boutons Like/Déjà vu/Pas intéressé)
    - [x] `user_account` (« Mon Compte ») — SANS scroll : `onLayout` mesure zone dispo + hauteur naturelle du contenu → `transform: scale` qui rétrécit tout le bloc juste ce qu'il faut pour tenir (+ `insets.bottom` réservé)
    - [x] `films_list` — `FlatList`, inset sur `listContent`
    - [x] `a_l_affiche` — `FlatList`, idem
    - [x] `match_list` — `FlatList`, idem
    - [x] `Friends` — `ScrollView` inset sur `scrollContent` + barre flottante « Voir les matchs » remontée (`insets.bottom`)
    - [x] `contact` / `donation` / `rgpd` / `mentions_legales` — `ScrollView`, footer TMDB en bas (`insets.bottom` au `paddingBottom`)
    - [x] `landing_page` — couvert par `SafeAreaView` (à confirmer sur l'appareil)
- [~] **Icône d'app** : laissée telle quelle ; à rebrander seulement si nouveaux visuels.

### Distribution (reportée — cf. [[project_mobile_distribution]])
- [ ] `eas.json` + champs `app.json` (`android.package`, `extra.eas.projectId`)
- [ ] Compte Expo + `eas-cli` (côté utilisateur)
- [ ] `eas build -p android --profile preview` → APK installable
- [ ] Tests sur Android (appareil réel via l'APK)
- [ ] iOS / stores : plus tard (nécessite compte Apple)

---

## Phase 10 — Sécurité (prod) — app & web

> Audit de **vérification en production** (beaucoup de garde-fous existent déjà côté Django) + ajouts manquants.
> Légende : `[~]` = présent dans le code, **à confirmer en prod** ; `[ ]` = à ajouter/faire.

### Premiers pas (rapides)
- [ ] `python manage.py check --deploy` (avec `DEBUG=False`, sur le VPS) → liste priorisée, objectif 0 alerte
- [ ] `/security-review` (Claude Code) → revue du code (injections, IDOR, secrets, logs sensibles)

### A. Backend / API (Django)
- [~] `DEBUG=False` en prod ; `ALLOWED_HOSTS` restreint (pas `*`) ; `SECRET_KEY` unique hors dépôt
- [~] CORS restreint (pas `ALLOW_ALL`) ; redirection HTTPS + cookies `Secure` + `SECURE_PROXY_SSL_HEADER`
- [ ] **HSTS** (`SECURE_HSTS_SECONDS` + subdomains/preload) une fois le HTTPS stable
- [ ] **Rate limiting** sur endpoints sensibles (login, création, mdp oublié, contact) — throttling DRF
- [ ] **Validation des mots de passe** (`AUTH_PASSWORD_VALIDATORS`)
- [ ] **Permissions par endpoint** (`IsAuthenticated`) + anti-**IDOR** (swipes, amitiés, filmothèque privée, `me/...`)
- [ ] **Tokens JWT** : durées revues + rotation/blacklist des refresh à la déconnexion
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
- [ ] Certificat HTTPS valide + auto-renouvelé (Let's Encrypt) ; note TLS correcte
- [ ] Nginx à jour, pas de listing, taille de requête limitée
- [ ] BDD non exposée publiquement + sauvegardes testées
- [ ] Secrets (`.env.production`) hors dépôt, droits restreints ; OS/Docker à jour, SSH durci, pare-feu 80/443

### E. Dépendances & process
- [ ] Audit des dépendances : `pip-audit` (backend), `npm audit` (web + mobile)
- [ ] Plan de réaction en cas de fuite (rotation `SECRET_KEY`/tokens, invalidation des sessions)

---

## 🐛 Dettes & TODO des phases livrées

- [x] **« Voir plus » sur les genres** (Phase 5/7) : non branché (on affiche tous les genres). Composant `ExpandablePills` réutilisable.
- [ ] **Swipe ultra-rapide** (Phase 5) : enchaîner plus vite que le réseau peut afficher « Tu as tout vu ! » à tort. À durcir si gênant.
- [ ] **Notifications** : à faire.
- [x] **Bande-annonce** : le tap en dehors ne ferme pas la fenêtre YouTube.
- [x] **« Voir les matchs »** : le bouton retour doit renvoyer à la liste d'amis (et non à Home).
- [ ] *(optionnel)* `pendingCount` dans un slice Redux (rafraîchir le badge après accept/decline).
- [x] **À tester sur appareil** : tap étoiles vs ouverture fiche (petites cartes), recherche clavier ouvert, sélecteur d'avatar, suppression de compte → retour AuthStack.
- [x] l'erreur d'identifiant envoie "impossible de rejoindre le serveur, vérifier la connexion" au lieu de erreur d'identifiant
- [x] le tap en dehors du popup youtube devrait fermer le popup youtube
- [ ] lower case lors de la connexion avec email
- [ ] lower case sur les pseudo (web et mobile app) pour éviter d'avoir deux pseudo identiques avec des majuscule et minuscules
- [ ] Filtre bouton réinitialiser devrait valider les filtres

### Limites connues (pas des bugs)
- Bandes-annonces dont l'embed YouTube est désactivé par le propriétaire : ne jouent pas en intégré (restriction côté contenu).

---

*Dernière mise à jour : 2026-06-04 (Refactor de la ROADMAP : condensée — phases livrées réduites à leur statut, dettes/TODO regroupées, historique des mises à jour archivé dans git. Travaux récents : connexion depuis le téléphone physique corrigée (URL API = IP LAN, pas `10.0.2.2`) ; header Home — bouton « ⚙ Filtres » en **icône seule** pour dégager le nom « FilmMatching » ; `insets.bottom` sur les boutons de `home` ; **audit zones sûres bas** ajouté (reste 8 écrans à corriger). Zones sûres bas : `contact`/`donation`/`mentions_legales` alignés sur le modèle `rgpd` (`useSafeAreaInsets` + `paddingBottom` dynamique).)*
