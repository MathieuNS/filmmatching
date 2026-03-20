import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import api from "../api";
import TmdbAttribution from "../components/TmdbAttribution";
// Import du fichier CSS dédié à la landing page
import "../styles/LandingPage.css";
// Import du CSS de l'animation "It's a Match !" pour la démo
import "../styles/MatchAnimation.css";

/**
 * Liste des films/séries utilisés pour la démo de swipe.
 * Ces données sont codées en dur (pas de requête API) pour que
 * la landing page charge instantanément et fonctionne même
 * si le backend est éteint.
 *
 * Chaque objet contient : titre, image (affiche TMDB), type,
 * année de sortie et réalisateur/créateur.
 */
const DEMO_FILMS = [
  {
    title: "Inception",
    img: "https://image.tmdb.org/t/p/w500/aej3LRUga5rhgkmRP6XMFw3ejbl.jpg",
    type: "Film",
    year: 2010,
    director: "Christopher Nolan",
  },
  {
    title: "Stranger Things",
    img: "https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg",
    type: "Serie",
    year: 2016,
    director: "Duffer Brothers",
  },
  {
    title: "Interstellar",
    img: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    type: "Film",
    year: 2014,
    director: "Christopher Nolan",
  },
  {
    title: "Breaking Bad",
    img: "https://image.tmdb.org/t/p/w500/4YLQj5XRrMJ7gp8eb0h6umd0iNx.jpg",
    type: "Serie",
    year: 2008,
    director: "Vince Gilligan",
  },
  {
    title: "Parasite",
    img: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    type: "Film",
    year: 2019,
    director: "Bong Joon-ho",
  },
];

/**
 * Séquence des directions de swipe.
 * On alterne entre les 3 actions possibles pour que le visiteur
 * comprenne tout ce qu'on peut faire dans l'app :
 * - "right" = like (♥ À voir)
 * - "left" = dislike (✕ Pas intéressé)
 * - "up" = déjà vu (👁 Déjà vu)
 */
const SWIPE_SEQUENCE = ["right", "left", "up", "right", "left"];

/**
 * LandingPage — Page d'accueil publique de FilmMatching.
 *
 * C'est la première page que voit un visiteur non connecté.
 * Son but : expliquer le concept en un coup d'œil et donner
 * envie de créer un compte.
 *
 * L'animation de swipe empile 2 cartes : la carte du dessous
 * (le prochain film) est toujours visible, légèrement réduite.
 * Quand la carte du dessus sort (droite/gauche/haut), on voit
 * la transition vers le film suivant de façon fluide.
 *
 * @returns {JSX.Element} La page d'accueil
 */
function LandingPage() {
  // --- Tous les hooks en haut du composant ---
  // En React, les hooks (useState, useEffect) doivent TOUJOURS être appelés
  // dans le même ordre à chaque rendu. On ne peut pas mettre un "return"
  // avant un hook, sinon React perd le fil et plante.
  // C'est pour ça qu'on déclare TOUS les useState ici, avant les conditions.

  // --- Redirection automatique si le user est déjà connecté ---
  // null = vérification en cours, true = connecté, false = pas connecté
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  // Index du film actuellement affiché (carte du dessus)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Phase de l'animation : "visible" ou "exiting"
  // - "visible" : la carte du dessus est au centre
  // - "exiting" : la carte du dessus sort de l'écran
  const [animPhase, setAnimPhase] = useState("visible");

  // Index dans la séquence de directions (SWIPE_SEQUENCE)
  const [swipeStep, setSwipeStep] = useState(0);

  // Affiche ou non l'overlay "It's a Match !" après un like
  // Stocke le film matché pour l'afficher dans l'overlay, ou null
  const [matchFilm, setMatchFilm] = useState(null);

  // --- Effect 1 : vérification du token JWT ---
  useEffect(() => {
    /**
     * Vérifie si un token JWT valide existe dans le localStorage.
     * C'est la même logique que ProtectedRoute, mais inversée :
     * - ProtectedRoute bloque les non-connectés -> redirige vers /login
     * - Ici, on redirige les connectés -> vers /home
     *
     * On essaie aussi de rafraîchir le token s'il est expiré,
     * comme ça le user reste connecté même après 30 minutes d'inactivité
     * (tant que le refresh token de 2 jours est encore valide).
     */
    async function checkAuth() {
      const token = localStorage.getItem(ACCESS_TOKEN);

      // Pas de token du tout -> pas connecté
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // On décode le token pour vérifier sa date d'expiration
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;

        if (decoded.exp > now) {
          // Le token est encore valide -> le user est connecté
          setIsAuthenticated(true);
        } else {
          // Le token access est expiré -> on essaie de le rafraîchir
          const refreshToken = localStorage.getItem(REFRESH_TOKEN);
          if (!refreshToken) {
            setIsAuthenticated(false);
            return;
          }

          const response = await api.post("/api/token/refresh/", {
            refresh: refreshToken,
          });

          if (response.status === 200) {
            // Refresh réussi -> on stocke le nouveau access token
            localStorage.setItem(ACCESS_TOKEN, response.data.access);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        // Token invalide ou refresh échoué -> pas connecté
        setIsAuthenticated(false);
      }
    }

    checkAuth();
  }, []);

  // Direction actuelle du swipe : "right", "left" ou "up"
  const swipeDirection = SWIPE_SEQUENCE[swipeStep];

  // Le film sur la carte du dessus (celle qui va sortir)
  const currentFilm = DEMO_FILMS[currentIndex];
  // Le film sur la carte du dessous (visible en arrière-plan)
  const nextFilm = DEMO_FILMS[(currentIndex + 1) % DEMO_FILMS.length];

  useEffect(() => {
    // Si un match est affiché, on met le cycle en pause
    // L'overlay reste visible 2 secondes, puis on reprend
    if (matchFilm) {
      const matchTimer = setTimeout(() => {
        setMatchFilm(null);
      }, 2000);
      return () => clearTimeout(matchTimer);
    }

    /**
     * Timer principal qui gère le cycle d'animation.
     *
     * Toutes les 3 secondes :
     * 1. La carte du dessus sort (phase "exiting", 0.5s)
     * 2. On passe au film suivant : la carte du dessous devient
     *    celle du dessus, et une nouvelle carte apparaît en dessous
     * 3. Si c'était un like (right), on affiche l'overlay de match
     */
    const interval = setInterval(() => {
      // La carte du dessus sort
      setAnimPhase("exiting");

      // Après 500ms (durée de l'animation de sortie),
      // on avance au film suivant
      setTimeout(() => {
        // On récupère la direction actuelle AVANT de mettre à jour le step
        setSwipeStep((prevStep) => {
          const direction = SWIPE_SEQUENCE[prevStep];

          // Si c'était un like, on affiche l'animation de match
          if (direction === "right") {
            setMatchFilm(DEMO_FILMS[currentIndex]);
          }

          return (prevStep + 1) % SWIPE_SEQUENCE.length;
        });

        setCurrentIndex((prev) => (prev + 1) % DEMO_FILMS.length);
        setAnimPhase("visible");
      }, 500);
    }, 3000);

    // Nettoyage : on supprime le timer quand le composant est démonté
    return () => clearInterval(interval);
  }, [matchFilm, currentIndex]);

  // --- Redirections conditionnelles ---
  // On les met APRES tous les hooks pour respecter les règles de React.

  // Pendant la vérification du token, on ne montre rien
  // (évite un "flash" de la landing page avant la redirection)
  if (isAuthenticated === null) {
    return null;
  }

  // Si le user est connecté, on le redirige directement vers /home
  // replace={true} remplace l'entrée dans l'historique du navigateur,
  // comme ça le bouton "retour" ne ramène pas à la landing page
  if (isAuthenticated) {
    return <Navigate to="/home" replace={true} />;
  }

  /**
   * Détermine la classe CSS de la carte du dessus selon la phase
   * et la direction du swipe.
   *
   * @returns {string} La classe CSS correspondante
   */
  function getTopCardClass() {
    if (animPhase === "exiting") {
      if (swipeDirection === "right") return "landing__card--exit-right";
      if (swipeDirection === "left") return "landing__card--exit-left";
      if (swipeDirection === "up") return "landing__card--exit-up";
    }
    return "";
  }

  /**
   * Génère le JSX d'une carte de film.
   * Réutilisé pour la carte du dessus et celle du dessous.
   *
   * @param {Object} film - Les données du film à afficher
   * @returns {JSX.Element} Le contenu de la carte
   */
  function renderCardContent(film) {
    return (
      <>
        <img
          className="landing__card-image"
          src={film.img}
          alt={`Affiche de ${film.title}`}
        />
        <div className="landing__card-gradient" />
        <div className="landing__card-info">
          <span className={`landing__card-badge ${
            film.type === "Serie" ? "landing__card-badge--serie" : ""
          }`}>
            {film.type}
          </span>
          <h3 className="landing__card-title">{film.title}</h3>
          <p className="landing__card-meta">
            {film.year} · {film.director}
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="landing">

      {/* --- Logo de l'app (icône + texte) --- */}
      <div className="landing__logo">
        <img
          className="landing__logo-icon"
          src="/filmmatching-icon.svg"
          alt="Logo FilmMatching"
        />
        FilmMatching
      </div>

      {/* --- Titre + sous-titre accrocheur --- */}
      <div className="landing__header">
        <h1 className="landing__title">
          Marre de manger froid?<br />Arrête de scroller!
        </h1>
        <p className="landing__subtitle">
          Swipe et trouve un film ou une série qui plaît à tout le monde en 2 minutes
        </p>
      </div>

      {/* --- Démo visuelle : 2 cartes empilées + icônes de swipe ---
           La carte du dessous est toujours visible (légèrement réduite),
           ce qui donne l'impression d'un deck de cartes. */}
      <div className="landing__demo">

        {/* Icône "dislike" à gauche — s'illumine quand le swipe va à gauche */}
        <div className={`landing__swipe-icon landing__swipe-icon--dislike ${
          animPhase === "exiting" && swipeDirection === "left"
            ? "landing__swipe-icon--active"
            : ""
        }`}>
          ✕
        </div>

        {/* Conteneur qui empile les 2 cartes + le bouton "déjà vu" */}
        <div className="landing__card-stack">

          {/* Carte du DESSOUS (prochain film) — toujours visible,
              légèrement plus petite pour donner l'effet de profondeur */}
          <div className="landing__card landing__card--back">
            {renderCardContent(nextFilm)}
          </div>

          {/* Carte du DESSUS (film actuel) — celle qui est animée */}
          <div className={`landing__card landing__card--front ${getTopCardClass()}`}>
            {renderCardContent(currentFilm)}
          </div>

          {/* Bouton "déjà vu" sous la carte
              S'illumine quand le swipe va vers le haut */}
          <div className={`landing__seen-icon ${
            animPhase === "exiting" && swipeDirection === "up"
              ? "landing__seen-icon--active"
              : ""
          }`}>
            👁 Déjà vu
          </div>

          {/* --- Overlay "It's a Match !" ---
               Positionné dans la zone des cartes pour ne pas bloquer
               le reste de la page (CTA, liens de connexion, etc.).
               Se ferme automatiquement après 2 secondes. */}
          {matchFilm && (
            <div className="match-overlay match-overlay--landing">
              <div className="match-overlay__content">
                <h2 className="match-overlay__title">It's a Match !</h2>
                <p className="match-overlay__subtitle">
                  Toi et Alex aimez le même film
                </p>

                <div className="match-overlay__film">
                  <img
                    className="match-overlay__film-img"
                    src={matchFilm.img}
                    alt={`Affiche de ${matchFilm.title}`}
                  />
                  <p className="match-overlay__film-title">{matchFilm.title}</p>
                </div>

                <div className="match-overlay__friends">
                  <div className="match-overlay__friend">
                    <div className="match-overlay__friend-avatar">
                      <span>A</span>
                    </div>
                    <span className="match-overlay__friend-name">Alex</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Icône "like" à droite — s'illumine quand le swipe va à droite */}
        <div className={`landing__swipe-icon landing__swipe-icon--like ${
          animPhase === "exiting" && swipeDirection === "right"
            ? "landing__swipe-icon--active"
            : ""
        }`}>
          ♥
        </div>
      </div>

      {/* --- Badges de stats --- */}
      <div className="landing__stats">
        <div className="landing__stat">
          <span className="landing__stat-icon">🎬</span>
          <span>
            <span className="landing__stat-value">21 000+</span> films et séries
          </span>
        </div>
        <div className="landing__stat">
          <span className="landing__stat-icon">🤝</span>
          <span>
            <span className="landing__stat-value">Matchs</span> entre amis
          </span>
        </div>
        <div className="landing__stat">
          <span className="landing__stat-icon">⚡</span>
          <span>
            Trouve en <span className="landing__stat-value">2 min</span>
          </span>
        </div>
      </div>

      {/* --- Bouton d'inscription + lien de connexion --- */}
      <div className="landing__cta">
        <Link to="/create-login" className="landing__cta-button">
          Commencer à swiper
        </Link>
        <p className="landing__login-link">
          Déjà un compte ?{" "}
          <Link to="/login">Se connecter</Link>
        </p>
      </div>

      <TmdbAttribution />
    </div>
  );
}

export default LandingPage;
