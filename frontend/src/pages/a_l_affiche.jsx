import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { getAvatarUrl } from "../utils/avatars";
import TmdbAttribution from "../components/TmdbAttribution";
import HamburgerMenu from "../components/HamburgerMenu";
import "../styles/FilmList.css";
import "../styles/Films.css";
import "../styles/AlAffiche.css";

/**
 * Page "À l'affiche" — Affiche les films actuellement au cinéma en France.
 *
 * Les films sont récupérés depuis l'API TMDB via notre backend
 * (endpoint /api/films/now-playing/). Pour chaque film, on sait
 * si l'utilisateur l'a déjà swipé (like, dislike, seen) grâce
 * au champ user_status renvoyé par l'API.
 *
 * L'utilisateur peut :
 * - Cliquer sur un film pour voir ses détails (modale)
 * - Ajouter le film à sa liste (like), le marquer comme vu (seen)
 *   ou pas intéressé (dislike) via les boutons d'action dans la modale
 * - Charger plus de films (pagination TMDB)
 *
 * Quand l'utilisateur swipe un film qui n'est pas encore dans notre base,
 * le backend le crée automatiquement avec toutes les infos enrichies
 * (casting, réalisateur, plateformes, bande-annonce).
 *
 * @returns {JSX.Element} La page des films à l'affiche
 */
function AlAffiche() {
  const navigate = useNavigate();

  // --- Données ---
  // Liste des films à l'affiche renvoyés par l'API
  const [films, setFilms] = useState([]);
  // Page actuelle de la pagination TMDB
  const [page, setPage] = useState(1);
  // Nombre total de pages disponibles sur TMDB
  const [totalPages, setTotalPages] = useState(1);
  // true pendant le chargement initial
  const [loading, setLoading] = useState(true);
  // true pendant le chargement d'une page supplémentaire
  const [loadingMore, setLoadingMore] = useState(false);

  // --- Modale ---
  // Film sélectionné pour afficher ses détails
  const [selectedFilm, setSelectedFilm] = useState(null);
  // true pendant qu'un swipe est en cours d'envoi (pour désactiver les boutons)
  const [swiping, setSwiping] = useState(false);
  // true quand le synopsis est déplié dans la modale
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  // true quand le lecteur de bande-annonce est visible
  const [showTrailer, setShowTrailer] = useState(false);
  // Détails enrichis du film sélectionné (casting, réalisateur, bande-annonce)
  // Chargés à la volée quand on clique sur un film
  const [filmDetails, setFilmDetails] = useState(null);
  // true pendant le chargement des détails
  const [loadingDetails, setLoadingDetails] = useState(false);

  // --- Notification de match ---
  // Données du match à afficher (film + amis), ou null si pas de match
  const [matchData, setMatchData] = useState(null);

  /**
   * Charge les films à l'affiche au montage du composant.
   * On ne charge que la première page au départ.
   */
  useEffect(() => {
    fetchFilms(1);
  }, []);

  /**
   * Récupère une page de films à l'affiche depuis notre API.
   *
   * Si c'est la première page (pageNum === 1), on remplace la liste.
   * Sinon, on ajoute les nouveaux films à la suite (pagination).
   *
   * @param {number} pageNum - Le numéro de page TMDB à charger
   */
  async function fetchFilms(pageNum) {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await api.get(`/api/films/now-playing/?page=${pageNum}`);
      const data = response.data;

      if (pageNum === 1) {
        // Première page : on remplace toute la liste
        setFilms(data.results);
      } else {
        // Pages suivantes : on ajoute à la suite
        // On filtre les doublons éventuels (même tmdb_id)
        setFilms((prev) => {
          const existingIds = new Set(prev.map((f) => f.tmdb_id));
          const newFilms = data.results.filter(
            (f) => !existingIds.has(f.tmdb_id)
          );
          return [...prev, ...newFilms];
        });
      }

      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error("Erreur chargement films à l'affiche :", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  /**
   * Charge la page suivante de films.
   * Appelée quand l'utilisateur clique sur "Charger plus".
   */
  function handleLoadMore() {
    if (page < totalPages && !loadingMore) {
      fetchFilms(page + 1);
    }
  }

  /**
   * Enregistre un swipe sur un film à l'affiche.
   *
   * Envoie le tmdb_id et le statut au backend, qui se charge de :
   * 1. Créer le film en base s'il n'existe pas (enrichissement à la volée)
   * 2. Enregistrer le swipe
   * 3. Détecter les matchs avec les amis
   *
   * Après le swipe, on met à jour le statut du film dans la liste locale
   * pour que le badge s'affiche immédiatement sans recharger la page.
   *
   * @param {number} tmdbId - L'ID TMDB du film
   * @param {string} swipeStatus - "like", "dislike" ou "seen"
   */
  async function handleSwipe(tmdbId, swipeStatus) {
    setSwiping(true);
    try {
      const response = await api.post("/api/films/now-playing/swipe/", {
        tmdb_id: tmdbId,
        status: swipeStatus,
      });

      // Mettre à jour le statut du film dans la liste locale
      // pour que le badge s'affiche immédiatement
      setFilms((prev) =>
        prev.map((f) =>
          f.tmdb_id === tmdbId ? { ...f, user_status: swipeStatus } : f
        )
      );

      // Mettre à jour aussi le film sélectionné dans la modale
      if (selectedFilm && selectedFilm.tmdb_id === tmdbId) {
        setSelectedFilm((prev) => ({ ...prev, user_status: swipeStatus }));
      }

      // Si des matchs sont trouvés, afficher la notification
      const matchedFriends = response.data.matched_friends || [];
      if (matchedFriends.length > 0) {
        const film = films.find((f) => f.tmdb_id === tmdbId);
        setMatchData({
          film: film,
          friends: matchedFriends,
        });
      }
    } catch (error) {
      console.error("Erreur swipe film cinéma :", error);
    } finally {
      setSwiping(false);
    }
  }

  /**
   * Ouvre la modale et charge les détails enrichis (casting, bande-annonce).
   *
   * Si le film existe déjà dans notre base (has_details === true),
   * les infos complètes sont déjà incluses dans l'objet film
   * → on les utilise directement, aucun appel API supplémentaire.
   *
   * Si le film n'est pas en base (has_details === false),
   * on appelle /api/films/now-playing/<tmdb_id>/ qui va chercher
   * le casting et la bande-annonce sur TMDB à la volée.
   *
   * @param {Object} film - Le film sur lequel l'utilisateur a cliqué
   */
  async function handleOpenFilm(film) {
    setSelectedFilm(film);
    setSynopsisExpanded(false);
    setShowTrailer(false);

    if (film.has_details) {
      // Le film existe en base → les détails sont déjà dans l'objet film
      setFilmDetails({
        main_actors: film.main_actors || [],
        director: film.director || null,
        trailer_url: film.trailer_url || null,
      });
      setLoadingDetails(false);
      return;
    }

    // Le film n'est pas en base → appel API pour récupérer les détails
    setFilmDetails(null);
    setLoadingDetails(true);

    try {
      const response = await api.get(`/api/films/now-playing/${film.tmdb_id}/`);
      setFilmDetails(response.data);
    } catch (error) {
      console.error("Erreur chargement détails film :", error);
    } finally {
      setLoadingDetails(false);
    }
  }

  /**
   * Renvoie l'icône emoji correspondant au statut du swipe.
   *
   * @param {string} userStatus - "like", "dislike", "seen" ou null
   * @returns {string} L'emoji correspondant
   */
  function getStatusIcon(userStatus) {
    switch (userStatus) {
      case "like":
        return "❤️";
      case "dislike":
        return "✕";
      case "seen":
        return "👁";
      default:
        return "";
    }
  }

  return (
    <div className="film-list">
      {/* Header : retour + titre + hamburger */}
      <div className="film-list__header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="film-list__back-btn"
            onClick={() => navigate("/home")}
            aria-label="Retour à l'accueil"
          >
            ←
          </button>
          <h1 className="film-list__title">À l'affiche</h1>
        </div>

        <div className="film-list__header-actions">
          <HamburgerMenu currentPage="affiche" />
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="film-list__loading">Chargement...</div>
      ) : films.length === 0 ? (
        <div className="film-list__empty">
          <div className="film-list__empty-icon">🎬</div>
          <h2 className="film-list__empty-title">Aucun film à l'affiche</h2>
          <p className="film-list__empty-text">
            Aucun film trouvé pour le moment.
          </p>
        </div>
      ) : (
        <>
          {/* Compteur */}
          <div className="affiche__count">
            <strong>{films.length}</strong>{" "}
            {films.length > 1 ? "films à l'affiche" : "film à l'affiche"}
          </div>

          {/* Grille de films (mêmes classes que FilmList) */}
          <div className="film-list__grid">
            {films.map((film) => (
              <div
                key={film.tmdb_id}
                className="film-list__card"
                onClick={() => handleOpenFilm(film)}
              >
                {/* Badge de statut si le film a déjà été swipé */}
                {film.user_status && (
                  <div
                    className={`affiche__card-status affiche__card-status--${film.user_status}`}
                  >
                    {getStatusIcon(film.user_status)}
                  </div>
                )}

                {/* Note TMDB */}
                {film.vote_average > 0 && (
                  <div className="affiche__card-rating">
                    ★ {film.vote_average.toFixed(1)}
                  </div>
                )}

                <img
                  className="film-list__card-img"
                  src={film.img}
                  alt={film.title}
                />
                <div className="film-list__card-overlay">
                  <p className="film-list__card-title">{film.title}</p>
                  <span className="film-list__card-year">
                    {film.release_year}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton "Charger plus" si d'autres pages sont disponibles */}
          {page < totalPages && (
            <button
              className="affiche__load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Chargement..." : "Charger plus"}
            </button>
          )}
        </>
      )}

      {/* Modale immersive — même style que Film.jsx :
          image en fond plein + dégradé + infos superposées en bas.
          Les boutons d'action sont superposés sous les infos. */}
      {selectedFilm && (
        <div
          className="affiche__modal-backdrop"
          onClick={() => setSelectedFilm(null)}
        >
          <div
            className="affiche__modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <button
              className="affiche__modal-close"
              onClick={() => setSelectedFilm(null)}
              aria-label="Fermer"
            >
              ✕
            </button>

            {/* Image du film en fond (comme film-card__image) */}
            <img
              className="affiche__modal-image"
              src={selectedFilm.img}
              alt={selectedFilm.title}
            />

            {/* Dégradé sombre superposé (comme film-card__gradient) */}
            <div className="affiche__modal-gradient" />

            {/* Infos superposées en bas de l'image (comme film-card__overlay) */}
            <div className="affiche__modal-overlay">
              {/* Année + note TMDB */}
              <div className="affiche__modal-meta">
                <span className="affiche__modal-year">
                  {selectedFilm.release_year}
                </span>
                {selectedFilm.vote_average > 0 && (
                  <span className="affiche__modal-rating">
                    ★ {selectedFilm.vote_average.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Titre */}
              <h2 className="affiche__modal-title">{selectedFilm.title}</h2>

              {/* Genres sous forme de pills */}
              {selectedFilm.genres && selectedFilm.genres.length > 0 && (
                <div className="affiche__modal-genres">
                  {selectedFilm.genres.map((genre, i) => (
                    <span key={i} className="affiche__modal-genre">
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Bande-annonce — visible quand les détails sont chargés */}
              {filmDetails?.trailer_url && (
                <button
                  className="affiche__modal-trailer-btn"
                  onClick={() => setShowTrailer(true)}
                >
                  ▶ Bande-annonce
                </button>
              )}

              {/* Réalisateur — visible quand les détails sont chargés */}
              {filmDetails?.director && (
                <div className="affiche__modal-section">
                  <span className="affiche__modal-label">Réalisateur</span>
                  <p className="affiche__modal-director">{filmDetails.director}</p>
                </div>
              )}

              {/* Casting — visible quand les détails sont chargés */}
              {filmDetails?.main_actors && filmDetails.main_actors.length > 0 && (
                <div className="affiche__modal-section">
                  <span className="affiche__modal-label">Casting</span>
                  <p className="affiche__modal-actors">
                    {filmDetails.main_actors.join(", ")}
                  </p>
                </div>
              )}

              {/* Indicateur de chargement des détails */}
              {loadingDetails && (
                <p className="affiche__modal-loading-details">Chargement...</p>
              )}

              {/* Synopsis avec "voir plus / voir moins" */}
              {selectedFilm.synopsis && (
                <div className="affiche__modal-section">
                  <p
                    className={`affiche__modal-synopsis ${
                      synopsisExpanded ? "affiche__modal-synopsis--expanded" : ""
                    }`}
                  >
                    {selectedFilm.synopsis}
                  </p>
                  <button
                    className="affiche__modal-see-more"
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                  >
                    {synopsisExpanded ? "voir moins" : "voir plus"}
                  </button>
                </div>
              )}

              {/* Boutons d'action (like / seen / dislike) */}
              <div className="affiche__actions">
                <button
                  className={`affiche__action-btn affiche__action-btn--like ${
                    selectedFilm.user_status === "like"
                      ? "affiche__action-btn--active"
                      : ""
                  }`}
                  onClick={() => handleSwipe(selectedFilm.tmdb_id, "like")}
                  disabled={swiping}
                >
                  ❤️ À voir
                </button>
                <button
                  className={`affiche__action-btn affiche__action-btn--seen ${
                    selectedFilm.user_status === "seen"
                      ? "affiche__action-btn--active"
                      : ""
                  }`}
                  onClick={() => handleSwipe(selectedFilm.tmdb_id, "seen")}
                  disabled={swiping}
                >
                  👁 Déjà vu
                </button>
                <button
                  className={`affiche__action-btn affiche__action-btn--dislike ${
                    selectedFilm.user_status === "dislike"
                      ? "affiche__action-btn--active"
                      : ""
                  }`}
                  onClick={() => handleSwipe(selectedFilm.tmdb_id, "dislike")}
                  disabled={swiping}
                >
                  ✕ Pas intéressé
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale bande-annonce — rendue dans le <body> via createPortal
          pour éviter les conflits de z-index avec la modale du film */}
      {showTrailer &&
        filmDetails?.trailer_url &&
        createPortal(
          <div
            className="film-card__trailer-backdrop"
            onClick={() => setShowTrailer(false)}
          >
            <div
              className="film-card__trailer-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="film-card__trailer-close"
                onClick={() => setShowTrailer(false)}
                aria-label="Fermer la bande-annonce"
              >
                ✕
              </button>
              <iframe
                className="film-card__trailer-iframe"
                src={filmDetails.trailer_url}
                title="Bande-annonce"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>,
          document.body
        )}

      {/* Notification de match — s'affiche quand un ami a aussi liké ce film */}
      {matchData && (
        <div
          className="affiche__match-overlay"
          onClick={() => setMatchData(null)}
        >
          <h2 className="affiche__match-title">C'est un match !</h2>
          <p className="affiche__match-subtitle">
            {matchData.film?.title}
          </p>
          <div className="affiche__match-friends">
            {matchData.friends.map((friend, i) => (
              <div key={i} className="affiche__match-friend">
                <img
                  className="affiche__match-friend-avatar"
                  src={getAvatarUrl(friend.avatar)}
                  alt={friend.username}
                />
                <span className="affiche__match-friend-name">
                  {friend.username}
                </span>
              </div>
            ))}
          </div>
          <button
            className="affiche__match-close"
            onClick={() => setMatchData(null)}
          >
            Super !
          </button>
        </div>
      )}

      <TmdbAttribution />
    </div>
  );
}

export default AlAffiche;
