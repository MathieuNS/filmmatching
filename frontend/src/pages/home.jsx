import { useState, useEffect, useRef } from "react";
// useNavigate permet de naviguer vers une autre page sans recharger l'app
import { useNavigate } from "react-router-dom";
import api from "../api";
import Film from "../components/Film";
import FilterBottomSheet from "../components/FilterBottomSheet";
import FilmDetailModal from "../components/FilmDetailModal";
import TmdbAttribution from "../components/TmdbAttribution";
import HamburgerMenu from "../components/HamburgerMenu";
import { getAvatarUrl } from "../utils/avatars";
import "../styles/Home.css";
import "../styles/MatchAnimation.css";

/**
 * Page d'accueil — Swipe de films.
 *
 * Cette page est le cœur de l'application. Elle affiche les films
 * un par un (le plus populaire en premier) et propose 3 actions :
 * - "À voir" (like) : glisser vers la droite ou cliquer le bouton
 * - "Déjà vu" (seen) : glisser vers le haut ou cliquer le bouton
 * - "Pas intéressé" (dislike) : glisser vers la gauche ou cliquer le bouton
 *
 * Pour éviter un temps de chargement entre chaque film, le prochain film
 * est toujours pré-chargé en avance (prefetch). Quand l'utilisateur swipe,
 * le film suivant s'affiche instantanément.
 *
 * @returns {JSX.Element} La page d'accueil avec le système de swipe
 */
function Home() {
  // Hook pour naviguer vers d'autres pages (ex: /compte, /amis, /liste)
  const navigate = useNavigate();

  // Le film actuellement affiché
  const [film, setFilm] = useState(null);
  // Le prochain film, pré-chargé en avance pour un affichage instantané
  const [nextFilm, setNextFilm] = useState(null);
  // true uniquement au tout premier chargement
  const [loading, setLoading] = useState(true);
  // true quand il n'y a plus de films à proposer
  const [noMoreFilms, setNoMoreFilms] = useState(false);

  // --- State pour la recherche de films ---
  // isSearchOpen : contrôle l'affichage de l'overlay de recherche
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // searchQuery : le texte tapé par l'utilisateur dans le champ
  const [searchQuery, setSearchQuery] = useState("");
  // searchResults : les films renvoyés par l'API de recherche
  const [searchResults, setSearchResults] = useState([]);
  // searchLoading : true pendant qu'on attend la réponse de l'API
  const [searchLoading, setSearchLoading] = useState(false);

  // --- State pour l'animation de match ---
  // Contient les données du match à afficher (film + amis), ou null si pas de match
  const [matchData, setMatchData] = useState(null);

  // --- States pour les filtres ---
  // Contrôle l'ouverture/fermeture du bottom sheet
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Les filtres actuellement appliqués (envoyés à l'API).
  // On initialise depuis localStorage pour garder les filtres entre les pages.
  // JSON.parse convertit la string stockée en objet JavaScript.
  // Si rien n'est stocké (première visite), on utilise les valeurs par défaut.
  const [activeFilters, setActiveFilters] = useState(() => {
    const saved = localStorage.getItem("filmmatching_filters");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { type: "", genres: [], plateforms: [], yearMin: "", yearMax: "" };
      }
    }
    return { type: "", genres: [], plateforms: [], yearMin: "", yearMax: "" };
  });
  // Listes de genres et plateformes récupérées depuis l'API (pour les chips)
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlateforms, setAvailablePlateforms] = useState([]);

  // --- States pour le drag/swipe ---
  // deltaX et deltaY = décalage en pixels pendant le drag
  const [deltaX, setDeltaX] = useState(0);
  const [deltaY, setDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Direction de sortie : "left", "right", "up" ou null
  const [exitDirection, setExitDirection] = useState(null);

  // Positions de départ du drag (souris/doigt)
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  // Seuil en pixels pour valider un swipe
  const SWIPE_THRESHOLD = 120;

  // Au montage du composant, on charge les genres et plateformes
  // disponibles depuis l'API pour remplir les filtres.
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        // Promise.all lance les 2 requêtes en parallèle (plus rapide)
        const [genresRes, plateformsRes] = await Promise.all([
          api.get("/api/genres/"),
          api.get("/api/platforms/"),
        ]);
        setAvailableGenres(genresRes.data);
        setAvailablePlateforms(plateformsRes.data);
      } catch (error) {
        console.error("Erreur chargement filtres :", error);
      }
    }
    loadFilterOptions();
  }, []);

  // Quand les filtres changent, on recharge les films depuis zéro
  useEffect(() => {
    initializeFilms();
  }, [activeFilters]);

  /**
   * Construit l'URL de l'API /api/films/random/ avec les filtres actifs.
   *
   * URLSearchParams est un objet JavaScript qui aide à construire
   * les paramètres d'une URL. Au lieu de concaténer des strings
   * manuellement (?type=Film&genres=Action), on ajoute chaque
   * paramètre proprement et il s'occupe des "?" et "&".
   *
   * @param {Object} filters - Les filtres à appliquer
   * @param {number|null} excludeId - L'ID du film à exclure (optionnel)
   * @returns {string} L'URL complète avec les paramètres
   */
  function buildFilmUrl(filters, excludeId = null) {
    const params = new URLSearchParams();

    if (excludeId) {
      params.append("exclude", excludeId);
    }
    if (filters.type) {
      params.append("type", filters.type);
    }
    if (filters.genres.length > 0) {
      // join(",") transforme ["Action", "Comédie"] en "Action,Comédie"
      params.append("genres", filters.genres.join(","));
    }
    if (filters.plateforms.length > 0) {
      params.append("plateforms", filters.plateforms.join(","));
    }
    if (filters.yearMin) {
      params.append("year_min", filters.yearMin);
    }
    if (filters.yearMax) {
      params.append("year_max", filters.yearMax);
    }

    // toString() renvoie "type=Film&genres=Action" (sans le "?")
    const queryString = params.toString();
    return `/api/films/random/${queryString ? `?${queryString}` : ""}`;
  }

  /**
   * Charge le premier film puis pré-charge le suivant.
   * Utilise buildFilmUrl pour inclure les filtres actifs dans la requête.
   */
  async function initializeFilms() {
    setLoading(true);
    setNoMoreFilms(false);
    try {
      const url = buildFilmUrl(activeFilters);
      const response = await api.get(url);

      if (response.status === 204) {
        setFilm(null);
        setNextFilm(null);
        setNoMoreFilms(true);
      } else {
        const currentFilm = response.data;
        setFilm(currentFilm);
        prefetchNext(currentFilm.id);
      }
    } catch (error) {
      console.error("Erreur lors du chargement initial :", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Pré-charge le prochain film en arrière-plan.
   * Inclut les filtres actifs pour que le prochain film
   * corresponde aussi aux critères sélectionnés.
   *
   * @param {number} excludeId - L'ID du film à exclure (celui affiché)
   */
  async function prefetchNext(excludeId) {
    try {
      const url = buildFilmUrl(activeFilters, excludeId);
      const response = await api.get(url);

      if (response.status === 204) {
        setNextFilm(null);
      } else {
        // Pré-charge l'image dans le cache du navigateur
        const img = new Image();
        img.src = response.data.img;

        setNextFilm(response.data);
      }
    } catch (error) {
      console.error("Erreur lors du pré-chargement :", error);
      setNextFilm(null);
    }
  }

  /**
   * Enregistre le swipe et affiche immédiatement le film pré-chargé.
   *
   * @param {string} swipeStatus - "like", "dislike" ou "seen"
   * @param {string|null} direction - Direction de l'animation : "left", "right", "up" ou null
   */
  async function handleSwipe(swipeStatus, direction = null) {
    if (!film) return;

    const swipedFilm = film;

    // Lancer l'animation de sortie
    if (direction) {
      setExitDirection(direction);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    try {
      const response = await api.post("/api/swipes/", {
        film: swipedFilm.id,
        status: swipeStatus,
      });

      // Si c'est un like et que des amis ont aussi liké → animation de match !
      const matchedFriends = response.data.matched_friends || [];
      if (swipeStatus === "like" && matchedFriends.length > 0) {
        setMatchData({
          film: swipedFilm,
          friends: matchedFriends,
        });
      }

      // Afficher immédiatement le film pré-chargé
      if (nextFilm) {
        setFilm(nextFilm);
        setNextFilm(null);
        setExitDirection(null);
        setDeltaX(0);
        setDeltaY(0);
        prefetchNext(nextFilm.id);
      } else {
        setFilm(null);
        setNoMoreFilms(true);
        setExitDirection(null);
        setDeltaX(0);
        setDeltaY(0);
      }
    } catch (error) {
      console.error("Erreur lors du swipe :", error);
      setExitDirection(null);
      setDeltaX(0);
      setDeltaY(0);
    }
  }

  // --- Recherche de films avec debounce ---
  // useEffect surveille searchQuery : à chaque changement, on attend 300ms
  // avant d'appeler l'API. Si l'utilisateur tape une autre lettre avant 300ms,
  // le timer précédent est annulé (clearTimeout) → on n'envoie qu'une requête
  // pour le texte final, pas une par lettre.
  useEffect(() => {
    // Pas de recherche si moins de 2 caractères
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // setTimeout renvoie un ID qu'on peut annuler avec clearTimeout
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await api.get(`/api/films/search/?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(response.data);
      } catch (error) {
        console.error("Erreur lors de la recherche :", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    // Cleanup : si searchQuery change avant 300ms, on annule le timer précédent
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Quand l'utilisateur clique sur un film dans les suggestions :
   * on injecte ce film dans le state "film" (celui affiché sur la carte)
   * pour que l'utilisateur puisse le swiper normalement.
   *
   * @param {Object} selectedFilm - Le film choisi dans les résultats de recherche
   */
  function handleSearchSelect(selectedFilm) {
    // On remplace le film affiché par celui sélectionné
    setFilm(selectedFilm);
    // On ferme l'overlay de recherche et on remet tout à zéro
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    // On reset l'état "plus de films" au cas où il était actif
    setNoMoreFilms(false);
  }

  /**
   * Appelée quand l'utilisateur clique "Appliquer" dans le bottom sheet.
   * Met à jour les filtres actifs, ce qui déclenche le useEffect
   * et recharge automatiquement les films.
   *
   * @param {Object} newFilters - Les nouveaux filtres à appliquer
   */
  function handleApplyFilters(newFilters) {
    setActiveFilters(newFilters);
    // On sauvegarde les filtres dans localStorage pour les retrouver
    // quand l'utilisateur revient sur cette page ou va sur /liste.
    // JSON.stringify convertit l'objet en string (localStorage ne stocke que des strings).
    localStorage.setItem("filmmatching_filters", JSON.stringify(newFilters));
  }

  // Nombre de filtres actifs (pour le badge sur le bouton).
  // On compte chaque filtre individuellement : chaque genre, chaque plateforme, etc.
  // Même calcul que dans films_list.jsx pour que le badge affiche le même nombre.
  const filterCount =
    (activeFilters.type ? 1 : 0) +
    activeFilters.genres.length +
    activeFilters.plateforms.length +
    (activeFilters.yearMin ? 1 : 0) +
    (activeFilters.yearMax ? 1 : 0);

  // =============================================
  // Gestion du drag (souris + tactile)
  // =============================================

  /**
   * Début du drag : on enregistre les positions X et Y de départ.
   */
  function handleDragStart(clientX, clientY) {
    setIsDragging(true);
    startXRef.current = clientX;
    startYRef.current = clientY;
  }

  /**
   * Pendant le drag : on calcule le décalage X et Y.
   */
  function handleDragMove(clientX, clientY) {
    if (!isDragging) return;
    setDeltaX(clientX - startXRef.current);
    setDeltaY(clientY - startYRef.current);
  }

  /**
   * Fin du drag : on détermine la direction dominante (horizontale ou verticale)
   * et on valide le swipe si le seuil est dépassé.
   *
   * La direction dominante est celle où le décalage est le plus grand
   * (en valeur absolue). Ça empêche de déclencher un swipe horizontal
   * et vertical en même temps.
   */
  function handleDragEnd() {
    if (!isDragging) return;
    setIsDragging(false);

    // On compare les valeurs absolues pour trouver la direction dominante
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absY > absX && deltaY < -SWIPE_THRESHOLD) {
      // Mouvement vertical dominant vers le haut → "déjà vu"
      handleSwipe("seen", "up");
    } else if (absX >= absY && deltaX > SWIPE_THRESHOLD) {
      // Mouvement horizontal dominant vers la droite → like
      handleSwipe("like", "right");
    } else if (absX >= absY && deltaX < -SWIPE_THRESHOLD) {
      // Mouvement horizontal dominant vers la gauche → dislike
      handleSwipe("dislike", "left");
    } else {
      // Seuil pas atteint → la carte revient au centre
      setDeltaX(0);
      setDeltaY(0);
    }
  }

  // --- Événements souris ---
  function onMouseDown(e) {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }
  function onMouseMove(e) {
    handleDragMove(e.clientX, e.clientY);
  }
  function onMouseUp() {
    handleDragEnd();
  }

  // --- Événements tactiles (mobile) ---
  function onTouchStart(e) {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onTouchMove(e) {
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onTouchEnd() {
    handleDragEnd();
  }

  // =============================================
  // Calcul du style de la carte pendant le drag
  // =============================================

  /**
   * Détermine la direction dominante du drag en cours.
   * Retourne "horizontal" ou "vertical" selon l'axe principal du mouvement.
   */
  function getDominantAxis() {
    return Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical";
  }

  function getCardStyle() {
    // --- Animations de sortie ---
    if (exitDirection === "left") {
      return {
        transform: "translateX(-150vw) rotate(-30deg)",
        opacity: 0,
        transition: "transform 0.4s ease, opacity 0.4s ease",
      };
    }
    if (exitDirection === "right") {
      return {
        transform: "translateX(150vw) rotate(30deg)",
        opacity: 0,
        transition: "transform 0.4s ease, opacity 0.4s ease",
      };
    }
    if (exitDirection === "up") {
      return {
        transform: "translateY(-150vh)",
        opacity: 0,
        transition: "transform 0.4s ease, opacity 0.4s ease",
      };
    }

    // --- Pendant le drag ---
    if (isDragging || deltaX !== 0 || deltaY !== 0) {
      const axis = getDominantAxis();

      if (axis === "vertical" && deltaY < 0) {
        // Drag vertical vers le haut : la carte monte sans rotation
        return {
          transform: `translateY(${deltaY}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease",
          cursor: isDragging ? "grabbing" : "grab",
        };
      }

      // Drag horizontal : la carte se déplace et tourne
      const rotation = (deltaX / SWIPE_THRESHOLD) * 15;
      return {
        transform: `translateX(${deltaX}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s ease",
        cursor: isDragging ? "grabbing" : "grab",
      };
    }

    // État normal
    return { cursor: "grab" };
  }

  /**
   * Calcule l'opacité d'un indicateur en fonction d'un delta.
   * Plus on glisse loin, plus l'indicateur est visible (de 0 à 1).
   *
   * @param {number} delta - Le décalage en pixels (deltaX ou deltaY)
   * @returns {number} Opacité entre 0 et 1
   */
  function getIndicatorOpacity(delta) {
    return Math.min(Math.abs(delta) / SWIPE_THRESHOLD, 1);
  }

  // --- Bouton filtre (réutilisé dans plusieurs écrans) ---
  // On le définit ici pour ne pas le dupliquer dans chaque return
  const filterButton = (
    <div className="home__header">
      {/* Logo de l'app */}
      <div className="home__logo">
        <img
          className="home__logo-icon"
          src="/filmmatching-icon.svg"
          alt="Logo FilmMatching"
        />
        FilmMatching
      </div>

      {/* Groupe de boutons à droite : recherche + filtres + menu hamburger */}
      <div className="home__header-actions">
        {/* Bouton loupe — ouvre l'overlay de recherche de films */}
        <button
          className="home__search-btn"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Rechercher un film"
        >
          {/* SVG loupe — plus net qu'un emoji */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <button
          className="home__filter-btn"
          onClick={() => setIsFilterOpen(true)}
        >
          <span className="home__filter-icon">⚙</span>
          Filtres
          {/* Badge avec le nombre de filtres actifs */}
          {filterCount > 0 && (
            <span className="home__filter-badge">{filterCount}</span>
          )}
        </button>

        {/* Menu hamburger — composant réutilisable partagé entre toutes les pages */}
        <HamburgerMenu currentPage="home" />
      </div>
    </div>
  );

  // --- Overlay de recherche réutilisable (comme filterButton) ---
  // On le définit ici pour ne pas le dupliquer dans chaque return.
  const searchOverlay = isSearchOpen && (
    <div className="home__search-overlay">
      <div
        className="home__search-overlay-backdrop"
        onClick={() => {
          setIsSearchOpen(false);
          setSearchQuery("");
          setSearchResults([]);
        }}
      />
      <div className="home__search-overlay-content">
        <div className="home__search-input-wrapper">
          <span className="home__search-input-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="home__search-input"
            placeholder="Rechercher un film..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button
            className="home__search-close"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            aria-label="Fermer la recherche"
          >
            ✕
          </button>
        </div>

        {searchLoading && (
          <div className="home__search-loading">Recherche...</div>
        )}

        {!searchLoading && searchResults.length > 0 && (
          <ul className="home__search-results">
            {searchResults.map((result) => (
              <li key={result.id}>
                <button
                  className="home__search-result-item"
                  onClick={() => handleSearchSelect(result)}
                >
                  <img
                    className="home__search-result-img"
                    src={result.img}
                    alt={result.title}
                  />
                  <div className="home__search-result-info">
                    <span className="home__search-result-title">
                      {result.title}
                    </span>
                    <span className="home__search-result-year">
                      {result.release_year}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
          <div className="home__search-no-results">
            Aucun film trouvé pour « {searchQuery} »
          </div>
        )}
      </div>
    </div>
  );

  // --- Affichage pendant le chargement ---
  if (loading) {
    return (
      <div className="home">
        {filterButton}
        <div className="home__loading">Chargement...</div>
        <FilterBottomSheet
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilters}
          currentFilters={activeFilters}
          availableGenres={availableGenres}
          availablePlateforms={availablePlateforms}
        />
        {searchOverlay}
      </div>
    );
  }

  // --- Affichage quand il n'y a plus de films ---
  if (noMoreFilms) {
    return (
      <div className="home">
        {filterButton}
        <div className="home__empty">
          <div className="home__empty-icon">🎬</div>
          <h2 className="home__empty-title">Tu as tout vu !</h2>
          <p className="home__empty-text">
            Il n'y a plus de films à découvrir pour le moment.
          </p>
        </div>
        <FilterBottomSheet
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilters}
          currentFilters={activeFilters}
          availableGenres={availableGenres}
          availablePlateforms={availablePlateforms}
        />
        {searchOverlay}
      </div>
    );
  }

  // Calcul des opacités des indicateurs selon la direction dominante
  const axis = getDominantAxis();
  // L'indicateur like n'apparaît que si le mouvement est horizontal vers la droite
  const likeOpacity = axis === "horizontal" && deltaX > 0 ? getIndicatorOpacity(deltaX) : 0;
  // L'indicateur dislike n'apparaît que si le mouvement est horizontal vers la gauche
  const dislikeOpacity = axis === "horizontal" && deltaX < 0 ? getIndicatorOpacity(deltaX) : 0;
  // L'indicateur seen n'apparaît que si le mouvement est vertical vers le haut
  const seenOpacity = axis === "vertical" && deltaY < 0 ? getIndicatorOpacity(deltaY) : 0;

  // --- Affichage principal : le film + les 3 boutons ---
  return (
    <div
      className="home"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Bouton filtre en haut */}
      {filterButton}

      {/* La carte du film avec le drag */}
      <div
        className="home__film-wrapper"
        style={getCardStyle()}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Indicateur "Pas intéressé" — glissement vers la gauche */}
        <div
          className="home__swipe-indicator home__swipe-indicator--dislike"
          style={{ opacity: dislikeOpacity }}
        >
          ✕ Pas intéressé
        </div>

        {/* Indicateur "À voir" — glissement vers la droite */}
        <div
          className="home__swipe-indicator home__swipe-indicator--like"
          style={{ opacity: likeOpacity }}
        >
          ♥ À voir
        </div>

        {/* Indicateur "Déjà vu" — glissement vers le haut */}
        <div
          className="home__swipe-indicator home__swipe-indicator--seen"
          style={{ opacity: seenOpacity }}
        >
          👁 Déjà vu
        </div>

        <Film
          title={film.title}
          img={film.img}
          synopsis={film.synopsis}
          tags={film.genres}
          plateform={film.plateforms}
          type={film.type}
          main_actors={film.main_actors ? film.main_actors.join(", ") : ""}
          release_year={film.release_year}
          director={film.director}
          trailer_url={film.trailer_url}
        />
      </div>

      {/* Les 3 boutons d'action sous la carte */}
      <div className="home__actions">
        {/* Bouton "Pas intéressé" — swipe gauche */}
        <div className="home__action-group">
          <button
            className="home__action-btn home__action-btn--dislike"
            onClick={() => handleSwipe("dislike", "left")}
          >
            {/* SVG croix — plus net qu'un emoji, s'adapte à la couleur via currentColor */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="home__action-label home__action-label--dislike">
            Pas intéressé
          </span>
        </div>

        {/* Bouton "Déjà vu" — swipe haut */}
        <div className="home__action-group">
          <button
            className="home__action-btn home__action-btn--seen"
            onClick={() => handleSwipe("seen", "up")}
          >
            {/* SVG œil */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <span className="home__action-label home__action-label--seen">
            Déjà vu
          </span>
        </div>

        {/* Bouton "À voir" — swipe droite */}
        <div className="home__action-group">
          <button
            className="home__action-btn home__action-btn--like"
            onClick={() => handleSwipe("like", "right")}
          >
            {/* SVG cœur — fill au lieu de stroke pour un cœur plein */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <span className="home__action-label home__action-label--like">
            À voir
          </span>
        </div>
      </div>

      {/* Overlay de recherche (variable réutilisable définie plus haut) */}
      {searchOverlay}

      {/* Bottom sheet de filtres */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
        availableGenres={availableGenres}
        availablePlateforms={availablePlateforms}
      />


      {/* === Overlay d'animation de match === */}
      {/* S'affiche quand on like un film qu'un ami a aussi liké */}
      {matchData && (
        <div className="match-overlay" onClick={() => setMatchData(null)}>
          <div className="match-overlay__content" onClick={(e) => e.stopPropagation()}>
            {/* Titre animé "It's a Match !" */}
            <h2 className="match-overlay__title">It's a Match !</h2>
            <p className="match-overlay__subtitle">
              Vous aimez le même film
            </p>

            {/* Affiche du film matché */}
            <div className="match-overlay__film">
              <img
                className="match-overlay__film-img"
                src={matchData.film.img}
                alt={matchData.film.title}
              />
              <p className="match-overlay__film-title">{matchData.film.title}</p>
            </div>

            {/* Avatars des amis qui ont aussi liké */}
            <div className="match-overlay__friends">
              {matchData.friends.map((friend, index) => (
                <div key={index} className="match-overlay__friend">
                  <div className="match-overlay__friend-avatar">
                    <img
                      src={getAvatarUrl(friend.avatar)}
                      alt={friend.username}
                    />
                  </div>
                  <span className="match-overlay__friend-name">
                    {friend.username}
                  </span>
                </div>
              ))}
            </div>

            {/* Bouton pour fermer */}
            <button
              className="match-overlay__close-btn"
              onClick={() => setMatchData(null)}
            >
              Continuer à swiper
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
