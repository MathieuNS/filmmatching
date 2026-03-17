import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api";
import { getAvatarUrl } from "../utils/avatars";
import FilterBottomSheet from "../components/FilterBottomSheet";
import FilmDetailModal from "../components/FilmDetailModal";
import "../styles/FilmList.css";
import TmdbAttribution from "../components/TmdbAttribution";
import "../styles/MatchList.css";
import "../styles/Home.css";

/**
 * Page "Matchs" — Affiche les films likés en commun avec un ou plusieurs amis.
 *
 * 2 modes d'accès :
 * - Mode 1v1 : /amis/:friendshipId/matchs → matchs avec un seul ami
 * - Mode groupe : /amis/groupe/matchs?ids=12,34,56 → matchs avec plusieurs amis
 *
 * Le mode est déterminé automatiquement :
 * - Si friendshipId est présent dans l'URL → mode 1v1 (comportement existant)
 * - Si le query param "ids" est présent → mode groupe (nouvel endpoint)
 *
 * @returns {JSX.Element} La page des matchs
 */
function MatchList() {
  const navigate = useNavigate();
  // useParams() extrait les paramètres dynamiques de l'URL.
  // Pour /amis/:friendshipId/matchs → { friendshipId: "7" }
  // Pour /amis/groupe/matchs → { friendshipId: undefined }
  const { friendshipId } = useParams();

  // useSearchParams() lit les query params de l'URL (après le "?").
  // Pour /amis/groupe/matchs?ids=12,34,56 → searchParams.get("ids") = "12,34,56"
  const [searchParams] = useSearchParams();

  // Détermine si on est en mode groupe (plusieurs amis) ou 1v1
  // En mode groupe, friendshipId est undefined et on a un param "ids"
  const groupIds = searchParams.get("ids");
  const isGroupMode = !friendshipId && !!groupIds;

  // --- Données ---
  // Liste des films matchés renvoyés par l'API
  const [matchedFilms, setMatchedFilms] = useState([]);
  // Mode 1v1 : le pseudo de l'ami (string)
  // Mode groupe : liste des amis [{ username, avatar }, ...]
  const [friendName, setFriendName] = useState("");
  const [groupFriends, setGroupFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Menu hamburger ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Filtres (même structure que FilmList et Home) ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    type: "",
    genres: [],
    plateforms: [],
    yearMin: "",
    yearMax: "",
  });
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlateforms, setAvailablePlateforms] = useState([]);

  // --- Modale du film choisi aléatoirement ---
  const [randomFilm, setRandomFilm] = useState(null);

  // Film sélectionné pour afficher sa fiche complète dans la modale
  const [selectedFilm, setSelectedFilm] = useState(null);

  /**
   * Charge les films matchés et les options de filtres au montage.
   *
   * 2 modes :
   * - Mode 1v1 : GET /api/friends/<id>/matches/ + recherche du nom de l'ami
   * - Mode groupe : GET /api/friends/group-matches/?ids=12,34,56
   *   L'API groupe renvoie directement les noms/avatars des amis.
   */
  useEffect(() => {
    async function fetchData() {
      try {
        if (isGroupMode) {
          // --- Mode groupe ---
          // On appelle le nouvel endpoint qui fait l'intersection de N listes
          const [groupRes, genresRes, plateformsRes] = await Promise.all([
            api.get(`/api/friends/group-matches/?ids=${groupIds}`),
            api.get("/api/genres/"),
            api.get("/api/platforms/"),
          ]);

          // L'API renvoie { films: [...], friends: [{username, avatar}, ...] }
          setMatchedFilms(groupRes.data.films);
          setGroupFriends(groupRes.data.friends);
          setAvailableGenres(genresRes.data);
          setAvailablePlateforms(plateformsRes.data);
        } else {
          // --- Mode 1v1 (comportement existant) ---
          const [matchesRes, genresRes, plateformsRes, friendsRes] =
            await Promise.all([
              api.get(`/api/friends/${friendshipId}/matches/`),
              api.get("/api/genres/"),
              api.get("/api/platforms/"),
              api.get("/api/friends/"),
            ]);

          setMatchedFilms(matchesRes.data);
          setAvailableGenres(genresRes.data);
          setAvailablePlateforms(plateformsRes.data);

          // Trouver le pseudo de l'ami dans la liste d'amitiés
          const friendship = friendsRes.data.find(
            (f) => f.id === parseInt(friendshipId)
          );
          if (friendship) {
            const userRes = await api.get("/api/users/me/");
            const myId = userRes.data.id;
            setFriendName(
              friendship.sender === myId
                ? friendship.receiver_username
                : friendship.sender_username
            );
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des matchs :", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [friendshipId, groupIds, isGroupMode]);

  /**
   * Applique les filtres sélectionnés dans le bottom sheet.
   *
   * @param {Object} newFilters - Les nouveaux filtres à appliquer
   */
  function handleApplyFilters(newFilters) {
    setActiveFilters(newFilters);
    setIsFilterOpen(false);
  }

  /**
   * Filtre les films côté client selon les filtres actifs.
   * Même logique que dans FilmList, mais on filtre directement les films
   * (pas des objets swipe qui contiennent un film).
   *
   * @param {Array} films - La liste de films à filtrer
   * @returns {Array} La liste filtrée
   */
  function filterFilms(films) {
    return films.filter((film) => {
      // Filtre par type (Film ou Série)
      if (activeFilters.type && film.type !== activeFilters.type) {
        return false;
      }

      // Filtre par genres : le film doit avoir AU MOINS un genre sélectionné
      if (activeFilters.genres.length > 0) {
        const filmGenres = film.genres || [];
        const hasMatchingGenre = activeFilters.genres.some((g) =>
          filmGenres.includes(g)
        );
        if (!hasMatchingGenre) return false;
      }

      // Filtre par plateformes
      if (activeFilters.plateforms.length > 0) {
        const filmPlateforms = film.plateforms || [];
        const hasMatchingPlateform = activeFilters.plateforms.some((p) =>
          filmPlateforms.includes(p)
        );
        if (!hasMatchingPlateform) return false;
      }

      // Filtre par année minimum
      if (
        activeFilters.yearMin &&
        film.release_year < parseInt(activeFilters.yearMin)
      ) {
        return false;
      }

      // Filtre par année maximum
      if (
        activeFilters.yearMax &&
        film.release_year > parseInt(activeFilters.yearMax)
      ) {
        return false;
      }

      return true;
    });
  }

  // Films après application des filtres
  const filteredFilms = filterFilms(matchedFilms);

  // Nombre de filtres actifs (pour le badge)
  const filterCount =
    (activeFilters.type ? 1 : 0) +
    activeFilters.genres.length +
    activeFilters.plateforms.length +
    (activeFilters.yearMin ? 1 : 0) +
    (activeFilters.yearMax ? 1 : 0);

  /**
   * Choisit un film au hasard parmi les matchs filtrés.
   *
   * Math.random() renvoie un nombre entre 0 et 1.
   * En le multipliant par la longueur du tableau et en arrondissant
   * vers le bas (Math.floor), on obtient un index aléatoire valide.
   *
   * Le film choisi est affiché dans une modale.
   * Les filtres sont pris en compte : on pioche dans filteredFilms,
   * pas dans matchedFilms.
   */
  function handleRandomPick() {
    if (filteredFilms.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredFilms.length);
    setRandomFilm(filteredFilms[randomIndex]);
  }

  return (
    <div className="film-list">
      {/* Header : retour + titre + filtres + hamburger */}
      <div className="film-list__header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="film-list__back-btn"
            onClick={() => navigate("/amis")}
            aria-label="Retour aux amis"
          >
            ←
          </button>
          <h1 className="film-list__title">
            {isGroupMode
              ? "Matchs de groupe"
              : friendName
                ? `Matchs avec ${friendName}`
                : "Matchs"}
          </h1>
        </div>

        <div className="film-list__header-actions">
          <button
            className="film-list__filter-btn"
            onClick={() => setIsFilterOpen(true)}
          >
            <span className="film-list__filter-icon">⚙</span>
            Filtres
            {filterCount > 0 && (
              <span className="film-list__filter-badge">{filterCount}</span>
            )}
          </button>

          {/* Menu hamburger */}
          <div className="home__menu-container">
            <button
              className="home__menu-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu de navigation"
            >
              <span
                className={`home__menu-icon ${isMenuOpen ? "home__menu-icon--open" : ""}`}
              >
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="home__menu-backdrop"
                  onClick={() => setIsMenuOpen(false)}
                />
                <nav className="home__menu-dropdown">
                  <button
                    className="home__menu-item"
                    onClick={() => {
                      navigate("/home");
                      setIsMenuOpen(false);
                    }}
                  >
                    <span className="home__menu-item-icon">👆</span>
                    Swiper
                  </button>
                  <button
                    className="home__menu-item"
                    onClick={() => {
                      navigate("/liste");
                      setIsMenuOpen(false);
                    }}
                  >
                    <span className="home__menu-item-icon">📋</span>
                    Ma liste
                  </button>
                  <button
                    className="home__menu-item"
                    onClick={() => {
                      navigate("/amis");
                      setIsMenuOpen(false);
                    }}
                  >
                    <span className="home__menu-item-icon">👥</span>
                    Mes Amis
                  </button>
                  <button
                    className="home__menu-item"
                    onClick={() => {
                      navigate("/compte");
                      setIsMenuOpen(false);
                    }}
                  >
                    <span className="home__menu-item-icon">👤</span>
                    Mon compte
                  </button>
                  <button
                    className="home__menu-item"
                    onClick={() => {
                      navigate("/logout");
                      setIsMenuOpen(false);
                    }}
                  >
                    <span className="home__menu-item-icon">⏻</span>
                    Déconnexion
                  </button>
                </nav>
              </>
            )}
          </div>
        </div>
      </div>

      {/* En mode groupe, on affiche les avatars des amis sélectionnés
          sous le header pour rappeler qui participe à la soirée. */}
      {isGroupMode && groupFriends.length > 0 && (
        <div className="match-list__group-members">
          <span className="match-list__group-label">Avec</span>
          {groupFriends.map((friend, index) => (
            <div key={index} className="match-list__group-member">
              <div className="match-list__group-avatar">
                <img
                  className="match-list__group-avatar-img"
                  src={getAvatarUrl(friend.avatar)}
                  alt={friend.username}
                />
              </div>
              <span className="match-list__group-name">{friend.username}</span>
            </div>
          ))}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="film-list__loading">Chargement...</div>
      ) : matchedFilms.length === 0 ? (
        <div className="film-list__empty">
          <div className="film-list__empty-icon">🎬</div>
          <h2 className="film-list__empty-title">Aucun match pour l'instant</h2>
          <p className="film-list__empty-text">
            {isGroupMode
              ? "Aucun film n'a été liké par tout le groupe. Continuez tous à swiper !"
              : "Continuez à swiper tous les deux pour trouver des films en commun !"}
          </p>
        </div>
      ) : (
        <>
          {/* Compteur + bouton aléatoire */}
          <div className="match-list__count">
            <strong>{filteredFilms.length}</strong>{" "}
            {filteredFilms.length > 1 ? "films en commun" : "film en commun"}
            {filterCount > 0 && ` (${matchedFilms.length} au total)`}
          </div>

          <button
            className="match-list__random-btn"
            onClick={handleRandomPick}
            disabled={filteredFilms.length === 0}
          >
            <span className="match-list__random-icon">🎲</span>
            Choix aléatoire
          </button>

          {/* Grille de films (mêmes classes que FilmList) */}
          {filteredFilms.length === 0 ? (
            <div className="film-list__empty">
              <h2 className="film-list__empty-title">Aucun résultat</h2>
              <p className="film-list__empty-text">
                Essaie de modifier tes filtres.
              </p>
            </div>
          ) : (
            <div className="film-list__grid">
              {filteredFilms.map((film) => (
                <div
                  key={film.id}
                  className="film-list__card"
                  onClick={() => setSelectedFilm(film)}
                >
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
          )}
        </>
      )}

      {/* Modale du film choisi aléatoirement */}
      {randomFilm && (
        <div
          className="match-list__modal-backdrop"
          onClick={() => setRandomFilm(null)}
        >
          <div
            className="match-list__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              className="match-list__modal-poster"
              src={randomFilm.img}
              alt={randomFilm.title}
            />
            <div className="match-list__modal-info">
              <div className="match-list__modal-label">Ce soir vous regardez</div>
              <h2 className="match-list__modal-title">{randomFilm.title}</h2>
              <div className="match-list__modal-year">
                {randomFilm.release_year}
              </div>
              <div className="match-list__modal-actions">
                <button
                  className="match-list__modal-close"
                  onClick={() => setRandomFilm(null)}
                >
                  Fermer
                </button>
                <button
                  className="match-list__modal-retry"
                  onClick={handleRandomPick}
                >
                  🎲 Relancer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale fiche complète du film */}
      <FilmDetailModal
        film={selectedFilm}
        onClose={() => setSelectedFilm(null)}
      />

      {/* Bottom sheet de filtres */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
        availableGenres={availableGenres}
        availablePlateforms={availablePlateforms}
      />

      <TmdbAttribution />
    </div>
  );
}

export default MatchList;
