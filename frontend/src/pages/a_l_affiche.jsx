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
 * Les films sont pré-chargés en base de données par une commande cron
 * quotidienne (get_now_playing). L'API renvoie directement tous les films
 * avec leurs infos complètes (casting, réalisateur, bande-annonce, plateformes).
 *
 * L'utilisateur peut :
 * - Cliquer sur un film pour voir ses détails (modale immersive)
 * - Ajouter le film à sa liste (like), le marquer comme vu (seen)
 *   ou pas intéressé (dislike) via les boutons d'action
 *
 * Les swipes utilisent le même endpoint que le reste de l'app (/api/swipes/)
 * avec l'ID en base du film (pas le tmdb_id).
 *
 * @returns {JSX.Element} La page des films à l'affiche
 */
function AlAffiche() {
  const navigate = useNavigate();

  // --- Données ---
  // Liste des films à l'affiche renvoyés par l'API
  const [films, setFilms] = useState([]);
  // true pendant le chargement initial
  const [loading, setLoading] = useState(true);

  // --- Modale ---
  // Film sélectionné pour afficher ses détails
  const [selectedFilm, setSelectedFilm] = useState(null);
  // true pendant qu'un swipe est en cours d'envoi (pour désactiver les boutons)
  const [swiping, setSwiping] = useState(false);
  // true quand le synopsis est déplié dans la modale
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  // true quand le lecteur de bande-annonce est visible
  const [showTrailer, setShowTrailer] = useState(false);

  // --- Notification de match ---
  // Données du match à afficher (film + amis), ou null si pas de match
  const [matchData, setMatchData] = useState(null);

  /**
   * Charge les films à l'affiche au montage du composant.
   * Tous les films sont renvoyés d'un coup (pas de pagination).
   */
  useEffect(() => {
    fetchFilms();
  }, []);

  /**
   * Récupère les films à l'affiche depuis notre API.
   * Les films sont déjà en base avec toutes leurs infos complètes
   * (casting, réalisateur, bande-annonce, plateformes).
   */
  async function fetchFilms() {
    setLoading(true);
    try {
      const response = await api.get("/api/films/now-playing/");
      setFilms(response.data);
    } catch (error) {
      console.error("Erreur chargement films à l'affiche :", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Enregistre un swipe sur un film à l'affiche.
   *
   * Utilise le même endpoint /api/swipes/ que le reste de l'application.
   * Le film est identifié par son ID en base (pas le tmdb_id),
   * car tous les films à l'affiche sont déjà en base.
   *
   * @param {Object} film - Le film sur lequel l'utilisateur swipe
   * @param {string} swipeStatus - "like", "dislike" ou "seen"
   */
  async function handleSwipe(film, swipeStatus) {
    setSwiping(true);
    try {
      const response = await api.post("/api/swipes/", {
        film: film.id,
        status: swipeStatus,
      });

      // Mettre à jour le statut du film dans la liste locale
      // pour que le badge s'affiche immédiatement
      setFilms((prev) =>
        prev.map((f) =>
          f.id === film.id ? { ...f, user_status: swipeStatus } : f
        )
      );

      // Mettre à jour aussi le film sélectionné dans la modale
      if (selectedFilm && selectedFilm.id === film.id) {
        setSelectedFilm((prev) => ({ ...prev, user_status: swipeStatus }));
      }

      // Si des matchs sont trouvés, afficher la notification
      const matchedFriends = response.data.matched_friends || [];
      if (matchedFriends.length > 0) {
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
   * Ouvre la modale avec les détails du film.
   * Toutes les infos sont déjà dans l'objet film (pas d'appel API).
   *
   * @param {Object} film - Le film sur lequel l'utilisateur a cliqué
   */
  function handleOpenFilm(film) {
    setSelectedFilm(film);
    setSynopsisExpanded(false);
    setShowTrailer(false);
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
        <div className="film-list__header-left">
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
                key={film.id}
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
              {/* Année */}
              <div className="affiche__modal-meta">
                <span className="affiche__modal-year">
                  {selectedFilm.release_year}
                </span>
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

              {/* Bande-annonce */}
              {selectedFilm.trailer_url && (
                <button
                  className="affiche__modal-trailer-btn"
                  onClick={() => setShowTrailer(true)}
                >
                  ▶ Bande-annonce
                </button>
              )}

              {/* Réalisateur */}
              {selectedFilm.director && (
                <div className="affiche__modal-section">
                  <span className="affiche__modal-label">Réalisateur</span>
                  <p className="affiche__modal-director">{selectedFilm.director}</p>
                </div>
              )}

              {/* Casting */}
              {selectedFilm.main_actors && selectedFilm.main_actors.length > 0 && (
                <div className="affiche__modal-section">
                  <span className="affiche__modal-label">Casting</span>
                  <p className="affiche__modal-actors">
                    {selectedFilm.main_actors.join(", ")}
                  </p>
                </div>
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
                  onClick={() => handleSwipe(selectedFilm, "like")}
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
                  onClick={() => handleSwipe(selectedFilm, "seen")}
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
                  onClick={() => handleSwipe(selectedFilm, "dislike")}
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
        selectedFilm?.trailer_url &&
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
                src={selectedFilm.trailer_url}
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
