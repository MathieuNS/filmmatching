import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api";
import { getAvatarUrl } from "../utils/avatars";
import FilterBottomSheet from "../components/FilterBottomSheet";
import FilmDetailModal from "../components/FilmDetailModal";
import StarRating from "../components/StarRating";
import "../styles/FilmList.css";
import TmdbAttribution from "../components/TmdbAttribution";
import HamburgerMenu from "../components/HamburgerMenu";
import "../styles/MatchList.css";

/**
 * Page "Matchs" — Affiche les films likés en commun avec un ou plusieurs amis.
 *
 * 2 modes d'accès :
 * - Mode 1v1 : /amis/:friendshipId/matchs → matchs avec un seul ami
 *   Inclut un onglet "Sa filmothèque" qui montre les films vus par l'ami.
 * - Mode groupe : /amis/groupe/matchs?ids=12,34,56 → matchs avec plusieurs amis
 *   Pas d'onglet filmothèque (la feature n'a de sens qu'en 1v1).
 *
 * Le mode est déterminé automatiquement :
 * - Si friendshipId est présent dans l'URL → mode 1v1 (comportement existant)
 * - Si le query param "ids" est présent → mode groupe (nouvel endpoint)
 *
 * En mode 1v1, le query param ?tab=seen permet le deep-linking vers
 * l'onglet "Sa filmothèque" (utile pour les notifications futures).
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
  // setSearchParams permet de modifier l'URL sans recharger la page (deep-link tab).
  const [searchParams, setSearchParams] = useSearchParams();

  // Détermine si on est en mode groupe (plusieurs amis) ou 1v1
  // En mode groupe, friendshipId est undefined et on a un param "ids"
  const groupIds = searchParams.get("ids");
  const isGroupMode = !friendshipId && !!groupIds;

  // --- Onglet actif : "matches" (likes en commun) ou "seen" (filmothèque de l'ami) ---
  // Le tab "seen" n'existe qu'en mode 1v1. La valeur initiale vient du query param
  // ?tab=seen pour permettre de partager un lien direct vers cet onglet.
  const initialTab = searchParams.get("tab") === "seen" && !isGroupMode ? "seen" : "matches";
  const [activeTab, setActiveTab] = useState(initialTab);

  // --- Données ---
  // Liste des films matchés (likes en commun) renvoyés par l'API
  const [matchedFilms, setMatchedFilms] = useState([]);
  // Liste des items "filmothèque de l'ami" : tableau d'objets
  // { film, friend_rating, friend_seen_at, my_status, my_rating }
  const [seenItems, setSeenItems] = useState([]);
  // true tant qu'on n'a pas tenté de charger la filmothèque (évite un flash empty)
  const [seenLoaded, setSeenLoaded] = useState(false);
  // true si l'ami a désactivé le partage de sa filmothèque (réponse 403 "private")
  const [seenIsPrivate, setSeenIsPrivate] = useState(false);
  // Mode 1v1 : le pseudo de l'ami (string)
  // Mode groupe : liste des amis [{ username, avatar }, ...]
  const [friendName, setFriendName] = useState("");
  const [groupFriends, setGroupFriends] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Film sélectionné pour afficher sa fiche complète dans la modale.
  // En mode "matches", contient juste un Film. En mode "seen", contient
  // un objet enrichi (item de la filmothèque) pour pouvoir passer
  // friend_rating, my_status, etc. à FilmDetailModal.
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [selectedSeenItem, setSelectedSeenItem] = useState(null);

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
   * Charge la filmothèque de l'ami quand l'onglet "seen" devient actif
   * pour la première fois. On évite de charger à chaque switch d'onglet :
   * la liste est gardée en mémoire après le premier chargement.
   *
   * Si l'ami a désactivé le partage, l'API renvoie 403 avec le payload
   * { "error": "private" } → on met seenIsPrivate à true pour afficher
   * le message dédié.
   */
  useEffect(() => {
    if (isGroupMode) return; // Pas de filmothèque en mode groupe
    if (activeTab !== "seen") return;
    if (seenLoaded) return; // Déjà chargée

    async function fetchSeen() {
      try {
        const res = await api.get(`/api/friends/${friendshipId}/seen/`);
        setSeenItems(res.data);
        setSeenIsPrivate(false);
      } catch (error) {
        // Le backend renvoie 403 avec { "error": "private" } si l'ami
        // a désactivé le partage. On distingue ce cas d'une vraie erreur.
        if (
          error.response &&
          error.response.status === 403 &&
          error.response.data?.error === "private"
        ) {
          setSeenIsPrivate(true);
          setSeenItems([]);
        } else {
          console.error("Erreur lors du chargement de la filmothèque :", error);
          setSeenItems([]);
        }
      } finally {
        setSeenLoaded(true);
      }
    }

    fetchSeen();
  }, [activeTab, friendshipId, isGroupMode, seenLoaded]);

  /**
   * Change d'onglet et synchronise l'URL (?tab=seen ou pas de param).
   * Permet de partager un lien direct ou de revenir en arrière dans l'historique.
   *
   * @param {string} tab - "matches" ou "seen"
   */
  function handleTabChange(tab) {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === "seen") {
      newParams.set("tab", "seen");
    } else {
      newParams.delete("tab");
    }
    setSearchParams(newParams, { replace: true });
  }

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

  // Films après application des filtres (onglet "matches")
  const filteredFilms = filterFilms(matchedFilms);
  // Items "filmothèque" filtrés. On extrait `film` de chaque item pour réutiliser
  // filterFilms, puis on garde les items dont le film survit au filtre.
  const filteredSeenItems = seenItems.filter((item) => {
    const films = filterFilms([item.film]);
    return films.length > 0;
  });

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

  /**
   * Ajoute un film à ma watchlist (= crée un swipe de status "like").
   * Appelé depuis FilmDetailModal quand le user clique le bouton dédié
   * sur l'onglet "Sa filmothèque".
   *
   * Met à jour optimistiquement l'item local pour que le badge "Dans ta
   * watchlist" apparaisse immédiatement, sans recharger toute la liste.
   *
   * @param {Object} film - Le film à ajouter
   */
  async function handleAddToWatchlist(film) {
    await api.post("/api/swipes/", { film: film.id, status: "like" });
    // Met à jour le my_status localement pour faire disparaître les boutons
    // et faire apparaître le badge dans la modale + la carte.
    setSeenItems((prev) =>
      prev.map((item) =>
        item.film.id === film.id ? { ...item, my_status: "like" } : item
      )
    );
    setSelectedSeenItem((prev) =>
      prev && prev.film.id === film.id ? { ...prev, my_status: "like" } : prev
    );
  }

  /**
   * Marque un film comme "déjà vu" par l'utilisateur connecté
   * (= crée un swipe de status "seen", éventuellement avec une note).
   * Appelé depuis le RatingPrompt dans FilmDetailModal.
   *
   * @param {Object} film - Le film concerné
   * @param {number|null} rating - La note de l'utilisateur (0.5-5) ou null
   */
  async function handleMarkAsSeen(film, rating) {
    const payload = { film: film.id, status: "seen" };
    if (rating !== null) {
      payload.rating = rating;
    }
    await api.post("/api/swipes/", payload);
    setSeenItems((prev) =>
      prev.map((item) =>
        item.film.id === film.id
          ? { ...item, my_status: "seen", my_rating: rating }
          : item
      )
    );
    setSelectedSeenItem((prev) =>
      prev && prev.film.id === film.id
        ? { ...prev, my_status: "seen", my_rating: rating }
        : prev
    );
  }

  /**
   * Renvoie la classe CSS du badge "mon statut" affiché en coin de carte
   * sur l'onglet filmothèque. Renvoie null si aucun badge ne doit être affiché.
   *
   * @param {string|null} status - Le statut ("like", "seen", "dislike" ou null)
   */
  function getStatusBadgeMeta(status) {
    if (status === "like") return { icon: "❤️", className: "like" };
    if (status === "seen") return { icon: "👁️", className: "seen" };
    if (status === "dislike") return { icon: "✕", className: "dislike" };
    return null;
  }

  // Détermine le titre de l'écran (en haut). On le calcule en fonction du mode
  // ET de l'onglet actif pour clarifier le contexte au user.
  const headerTitle = isGroupMode
    ? "Matchs de groupe"
    : friendName
      ? activeTab === "seen"
        ? `Filmothèque de ${friendName}`
        : `Matchs avec ${friendName}`
      : "Matchs";

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
          <h1 className="film-list__title">{headerTitle}</h1>
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

          {/* Menu hamburger — composant réutilisable */}
          <HamburgerMenu currentPage="matchs" />
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

      {/* Onglets : visibles uniquement en mode 1v1 (pas en groupe).
          On garde les classes film-list__tab pour la cohérence visuelle. */}
      {!isGroupMode && (
        <div className="film-list__tabs">
          <button
            className={`film-list__tab film-list__tab--matches ${
              activeTab === "matches" ? "film-list__tab--active" : ""
            }`}
            onClick={() => handleTabChange("matches")}
          >
            🎬 À voir ensemble
            <span className="film-list__tab-count">{matchedFilms.length}</span>
          </button>
          <button
            className={`film-list__tab film-list__tab--seen ${
              activeTab === "seen" ? "film-list__tab--active" : ""
            }`}
            onClick={() => handleTabChange("seen")}
          >
            👁️ Sa filmothèque
            {seenLoaded && !seenIsPrivate && (
              <span className="film-list__tab-count">{seenItems.length}</span>
            )}
          </button>
        </div>
      )}

      {/* Contenu principal — branche selon l'onglet actif */}
      {loading ? (
        <div className="film-list__loading">Chargement...</div>
      ) : activeTab === "matches" ? (
        // --- Onglet "À voir ensemble" : matchs (likes en commun) ---
        matchedFilms.length === 0 ? (
          <div className="film-list__empty">
            <div className="film-list__empty-icon">🎬</div>
            <h2 className="film-list__empty-title">Aucun match pour l'instant</h2>
            <p className="film-list__empty-text">
              Aucun film en commun. Continuez tous à swiper !
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
        )
      ) : (
        // --- Onglet "Sa filmothèque" : films vus par l'ami ---
        !seenLoaded ? (
          <div className="film-list__loading">Chargement...</div>
        ) : seenIsPrivate ? (
          <div className="film-list__empty">
            <div className="film-list__empty-icon">🔒</div>
            <h2 className="film-list__empty-title">Filmothèque privée</h2>
            <p className="film-list__empty-text">
              {friendName} a choisi de garder sa filmothèque privée.
            </p>
          </div>
        ) : seenItems.length === 0 ? (
          <div className="film-list__empty">
            <div className="film-list__empty-icon">👁️</div>
            <h2 className="film-list__empty-title">Aucun film vu</h2>
            <p className="film-list__empty-text">
              {friendName} n'a encore marqué aucun film comme déjà vu.
            </p>
          </div>
        ) : (
          <>
            <div className="match-list__count">
              <strong>{filteredSeenItems.length}</strong>{" "}
              {filteredSeenItems.length > 1 ? "films vus" : "film vu"} par {friendName}
              {filterCount > 0 && ` (${seenItems.length} au total)`}
            </div>

            {filteredSeenItems.length === 0 ? (
              <div className="film-list__empty">
                <h2 className="film-list__empty-title">Aucun résultat</h2>
                <p className="film-list__empty-text">
                  Essaie de modifier tes filtres.
                </p>
              </div>
            ) : (
              <div className="film-list__grid">
                {filteredSeenItems.map((item) => {
                  const badge = getStatusBadgeMeta(item.my_status);
                  return (
                    <div
                      key={item.film.id}
                      className="film-list__card"
                      onClick={() => setSelectedSeenItem(item)}
                    >
                      <img
                        className="film-list__card-img"
                        src={item.film.img}
                        alt={item.film.title}
                      />

                      {/* Badge "mon statut" en coin de carte si déjà swipé.
                          Permet de scanner la liste d'un coup d'œil pour
                          repérer ce qu'on connaît déjà. */}
                      {badge && (
                        <span
                          className={`match-list__card-badge match-list__card-badge--${badge.className}`}
                          aria-label={`Mon statut : ${item.my_status}`}
                        >
                          {badge.icon}
                        </span>
                      )}

                      <div className="film-list__card-overlay">
                        <p className="film-list__card-title">{item.film.title}</p>
                        <span className="film-list__card-year">
                          {item.film.release_year}
                        </span>

                        {/* Note de l'ami affichée en read-only sur la carte.
                            Si l'ami n'a pas noté, on n'affiche rien. */}
                        {item.friend_rating !== null && item.friend_rating !== undefined && (
                          <StarRating
                            value={parseFloat(item.friend_rating)}
                            onChange={() => {}}
                            readOnly
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )
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

      {/* Modale fiche complète du film — onglet "matches" (info pure). */}
      <FilmDetailModal
        film={selectedFilm}
        onClose={() => setSelectedFilm(null)}
      />

      {/* Modale fiche complète du film — onglet "seen" (filmothèque ami).
          Reçoit la note de l'ami, mon statut et les callbacks d'action. */}
      {selectedSeenItem && (
        <FilmDetailModal
          film={selectedSeenItem.film}
          onClose={() => setSelectedSeenItem(null)}
          friendName={friendName}
          friendRating={selectedSeenItem.friend_rating}
          myStatus={selectedSeenItem.my_status}
          onAddToWatchlist={handleAddToWatchlist}
          onMarkAsSeen={handleMarkAsSeen}
        />
      )}

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
