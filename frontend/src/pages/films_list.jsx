import { useState, useEffect, useRef } from "react";
// useNavigate pour le bouton retour vers /home
import { useNavigate } from "react-router-dom";
import api from "../api";
import FilterBottomSheet from "../components/FilterBottomSheet";
import FilmDetailModal from "../components/FilmDetailModal";
import TmdbAttribution from "../components/TmdbAttribution";
import StarRating from "../components/StarRating";
import HamburgerMenu from "../components/HamburgerMenu";
import { getAvatarUrl } from "../utils/avatars";
import "../styles/FilmList.css";
import "../styles/FriendAvatars.css";

/**
 * Page "Ma liste" — Affiche les films swipés par l'utilisateur.
 *
 * 3 onglets : "À voir" (like), "Déjà vu" (seen), "Pas intéressé" (dislike).
 * L'utilisateur peut :
 * - Naviguer entre les onglets pour voir ses différentes listes
 * - Changer le statut d'un film via un menu contextuel (⋯)
 * - Filtrer les films affichés (type, genres, plateformes, année)
 *
 * @returns {JSX.Element} La page liste avec les onglets et la grille de films
 */
function FilmList() {
  const navigate = useNavigate();

  // --- Onglet actif : "like", "seen" ou "dislike" ---
  const [activeTab, setActiveTab] = useState("like");

  // --- Données des swipes pour chaque onglet ---
  // On stocke les 3 listes séparément pour éviter de recharger à chaque changement d'onglet
  const [swipes, setSwipes] = useState({
    like: [],
    seen: [],
    dislike: [],
  });

  // true pendant le chargement initial
  const [loading, setLoading] = useState(true);

  // ID du swipe dont le menu contextuel est ouvert (null = aucun menu ouvert)
  const [openMenuId, setOpenMenuId] = useState(null);

  // Film sélectionné pour afficher sa fiche complète dans la modale
  const [selectedFilm, setSelectedFilm] = useState(null);

  // Dictionnaire { filmId: [{username, avatar}, ...] } — quels amis ont aussi liké chaque film
  const [friendsLikes, setFriendsLikes] = useState({});

  // --- State pour la barre de recherche ---
  // searchQuery : le texte tapé par l'utilisateur dans le champ
  const [searchQuery, setSearchQuery] = useState("");
  // showSuggestions : contrôle l'affichage de la liste d'autocomplétion.
  // On la masque quand l'utilisateur clique sur une suggestion ou ailleurs.
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- Tri différé pour l'onglet "Déjà vu" ---
  // Quand l'utilisateur change une note, on bloque le tri pendant 2 secondes
  // pour qu'il puisse corriger sa note sans que la carte se déplace immédiatement.
  const [sortEnabled, setSortEnabled] = useState(true);
  // Ref pour stocker le timer du tri différé (useRef persiste entre les rendus sans déclencher de re-rendu)
  const sortTimerRef = useRef(null);
  // Ref pour mémoriser l'ordre d'affichage actuel pendant que le tri est bloqué
  const sortedOrderRef = useRef(null);

  // Ferme le menu contextuel d'une carte quand on clique n'importe où sur la page.
  // Le backdrop en position: fixed ne fonctionne pas car la carte a overflow: hidden,
  // donc on utilise un listener global sur le document à la place.
  useEffect(() => {
    if (openMenuId === null) return;

    function handleClickOutside() {
      setOpenMenuId(null);
    }

    // On écoute les clics sur tout le document
    document.addEventListener("click", handleClickOutside);
    // Nettoyage : on retire le listener quand le menu se ferme ou le composant se démonte
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  // --- States pour les filtres (même structure que dans Home) ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // On initialise depuis localStorage pour garder les filtres entre les pages.
  // Même clé que dans Home → les filtres sont partagés entre les 2 pages.
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
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlateforms, setAvailablePlateforms] = useState([]);

  /**
   * Charge les swipes de l'utilisateur pour les 3 statuts.
   * On fait 3 appels API en parallèle avec Promise.all pour aller plus vite.
   */
  async function fetchAllSwipes() {
    try {
      // Promise.all exécute les 3 requêtes en même temps (en parallèle)
      // au lieu de les faire une par une (séquentiel = plus lent)
      const [likeRes, seenRes, dislikeRes] = await Promise.all([
        api.get("/api/swipes/list/?status=like"),
        api.get("/api/swipes/list/?status=seen"),
        api.get("/api/swipes/list/?status=dislike"),
      ]);

      setSwipes({
        like: likeRes.data,
        seen: seenRes.data,
        dislike: dislikeRes.data,
      });
    } catch (error) {
      console.error("Erreur lors du chargement des swipes :", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Charge les genres et plateformes disponibles pour le filtre.
   */
  async function fetchFilterOptions() {
    try {
      const [genresRes, plateformsRes] = await Promise.all([
        api.get("/api/genres/"),
        api.get("/api/platforms/"),
      ]);
      setAvailableGenres(genresRes.data);
      setAvailablePlateforms(plateformsRes.data);
    } catch (error) {
      console.error("Erreur lors du chargement des filtres :", error);
    }
  }

  /**
   * Charge les likes des amis pour savoir qui a aussi aimé chaque film.
   * L'API renvoie { "42": [{username, avatar}, ...], "87": [{username, avatar}] }
   */
  async function fetchFriendsLikes() {
    try {
      const res = await api.get("/api/friends/common-likes/");
      setFriendsLikes(res.data);
    } catch (error) {
      console.error("Erreur lors du chargement des likes amis :", error);
    }
  }

  // Au montage du composant, on charge tout
  useEffect(() => {
    fetchAllSwipes();
    fetchFilterOptions();
    fetchFriendsLikes();
  }, []);

  // Nettoyage du timer de tri différé quand le composant se démonte
  // (sinon le setTimeout essaierait de mettre à jour un state qui n'existe plus)
  useEffect(() => {
    return () => clearTimeout(sortTimerRef.current);
  }, []);

  /**
   * Change le statut d'un swipe (ex: like → seen).
   *
   * 1. Envoie un PATCH à l'API pour modifier le statut en BDD
   * 2. Met à jour le state local : retire le swipe de l'ancien onglet
   *    et l'ajoute dans le nouvel onglet (sans recharger depuis l'API)
   *
   * @param {number} swipeId - L'ID du swipe à modifier
   * @param {string} oldStatus - L'ancien statut ("like", "seen" ou "dislike")
   * @param {string} newStatus - Le nouveau statut souhaité
   */
  async function handleStatusChange(swipeId, oldStatus, newStatus) {
    try {
      // PATCH envoie seulement les champs à modifier (ici, juste le status)
      await api.patch(`/api/swipes/${swipeId}/`, { status: newStatus });

      // Mise à jour locale : on déplace le swipe d'un onglet à l'autre
      setSwipes((prev) => {
        // On trouve le swipe dans l'ancien onglet
        const swipeToMove = prev[oldStatus].find((s) => s.id === swipeId);
        if (!swipeToMove) return prev;

        // On met à jour son statut
        const updatedSwipe = { ...swipeToMove, status: newStatus };

        return {
          ...prev,
          // Retirer le swipe de l'ancien onglet
          [oldStatus]: prev[oldStatus].filter((s) => s.id !== swipeId),
          // L'ajouter au début du nouvel onglet
          [newStatus]: [updatedSwipe, ...prev[newStatus]],
        };
      });

      // Fermer le menu contextuel après le changement
      setOpenMenuId(null);
    } catch (error) {
      console.error("Erreur lors du changement de statut :", error);
    }
  }

  /**
   * Met à jour la note d'un film "déjà vu".
   *
   * Envoie un PATCH à l'API avec la nouvelle note, puis met à jour
   * le state local pour que l'affichage se rafraîchisse immédiatement
   * sans recharger depuis l'API.
   *
   * @param {number} swipeId - L'ID du swipe à noter
   * @param {number|null} newRating - La nouvelle note (0.5 à 5.0, ou null pour supprimer)
   */
  async function handleRatingChange(swipeId, newRating) {
    try {
      // PATCH envoie seulement le champ rating au backend
      await api.patch(`/api/swipes/${swipeId}/`, { rating: newRating });

      // Mise à jour locale : on modifie la note dans le state "seen"
      setSwipes((prev) => ({
        ...prev,
        seen: prev.seen.map((s) =>
          s.id === swipeId ? { ...s, rating: newRating } : s
        ),
      }));

      // Bloquer le tri pendant 2 secondes pour laisser le temps de corriger la note.
      // On annule le timer précédent (si l'utilisateur note plusieurs films d'affilée,
      // le délai repart à zéro à chaque note).
      setSortEnabled(false);
      clearTimeout(sortTimerRef.current);
      sortTimerRef.current = setTimeout(() => {
        setSortEnabled(true);
      }, 2000);
    } catch (error) {
      console.error("Erreur lors de la notation :", error);
    }
  }

  /**
   * Applique les filtres sélectionnés dans le bottom sheet.
   * Appelée quand l'utilisateur clique "Appliquer" dans le FilterBottomSheet.
   *
   * @param {Object} newFilters - Les nouveaux filtres à appliquer
   */
  function handleApplyFilters(newFilters) {
    setActiveFilters(newFilters);
    setIsFilterOpen(false);
    // Sauvegarde dans localStorage pour retrouver les filtres en changeant de page
    localStorage.setItem("filmmatching_filters", JSON.stringify(newFilters));
  }

  /**
   * Filtre les swipes côté client selon les filtres actifs.
   * On ne refait pas d'appel API : on filtre la liste déjà chargée en mémoire.
   *
   * @param {Array} swipeList - La liste de swipes à filtrer
   * @returns {Array} La liste filtrée
   */
  function filterSwipes(swipeList) {
    return swipeList.filter((swipe) => {
      const film = swipe.film;

      // Filtre par recherche : si l'utilisateur a tapé quelque chose,
      // on ne garde que les films dont le titre contient le texte
      if (searchQuery.length >= 2) {
        if (!film.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      // Filtre par type (Film ou Serie)
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

      // Filtre par plateformes : le film doit être sur AU MOINS une plateforme sélectionnée.
      // film.plateforms est un tableau d'objets ({ plateform: "Netflix", logo: "...", ... }),
      // alors que activeFilters.plateforms contient des strings ("Netflix").
      // On extrait donc le nom de chaque plateforme avant de comparer.
      if (activeFilters.plateforms.length > 0) {
        const filmPlateforms = (film.plateforms || []).map((p) => p.plateform);
        const hasMatchingPlateform = activeFilters.plateforms.some((p) =>
          filmPlateforms.includes(p)
        );
        if (!hasMatchingPlateform) return false;
      }

      // Filtre par année minimum
      if (activeFilters.yearMin && film.release_year < parseInt(activeFilters.yearMin)) {
        return false;
      }

      // Filtre par année maximum
      if (activeFilters.yearMax && film.release_year > parseInt(activeFilters.yearMax)) {
        return false;
      }

      return true;
    });
  }

  // Quand l'utilisateur change d'onglet, on vide la recherche
  // pour éviter de garder un filtre qui ne correspond pas au nouvel onglet
  useEffect(() => {
    setSearchQuery("");
    setShowSuggestions(false);
  }, [activeTab]);

  /**
   * Calcule les suggestions d'autocomplétion.
   * On cherche les films dont le titre contient le texte tapé (insensible à la casse).
   * On limite à 5 suggestions pour ne pas surcharger l'écran.
   *
   * @type {Array} Liste des swipes dont le titre matche la recherche
   */
  const suggestions = searchQuery.length >= 2
    ? swipes[activeTab]
        .filter((swipe) =>
          swipe.film.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  // Nombre de filtres actifs (pour le badge sur le bouton)
  const filterCount =
    (activeFilters.type ? 1 : 0) +
    activeFilters.genres.length +
    activeFilters.plateforms.length +
    (activeFilters.yearMin ? 1 : 0) +
    (activeFilters.yearMax ? 1 : 0);

  // Films filtrés pour l'onglet actif.
  // Pour l'onglet "Déjà vu", on trie par note décroissante (5 étoiles en premier).
  // Le tri est différé de 2 secondes après un changement de note pour que
  // la carte ne se déplace pas immédiatement (meilleure UX).
  const filteredSwipes = (() => {
    const filtered = filterSwipes(swipes[activeTab]);

    // Les onglets "À voir" et "Pas intéressé" ne sont pas triés
    if (activeTab !== "seen") return filtered;

    if (sortEnabled) {
      // Tri actif : on trie par note décroissante et on sauvegarde l'ordre
      const sorted = [...filtered].sort((a, b) => {
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        return ratingB - ratingA;
      });
      // On mémorise l'ordre des IDs pour le conserver pendant le blocage du tri
      sortedOrderRef.current = sorted.map((s) => s.id);
      return sorted;
    }

    // Tri bloqué : on conserve l'ordre précédent grâce aux IDs mémorisés.
    // Chaque ID est associé à sa position dans l'ancien tri (Map pour accès O(1)).
    if (sortedOrderRef.current) {
      const orderMap = new Map(
        sortedOrderRef.current.map((id, index) => [id, index])
      );
      return [...filtered].sort((a, b) => {
        // Les films inconnus (nouveaux) vont à la fin (Infinity)
        const posA = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
        const posB = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
        return posA - posB;
      });
    }

    return filtered;
  })();

  // Configuration des onglets : label, statut, icône
  const tabs = [
    { status: "like", label: "À voir", icon: "❤️" },
    { status: "seen", label: "Déjà vu", icon: "👁️" },
    { status: "dislike", label: "Pas intéressé", icon: "✕" },
  ];

  // Options du menu contextuel selon le statut actuel
  // On propose les 2 autres statuts (pas celui en cours)
  const statusOptions = {
    like: [
      { status: "seen", label: "Déjà vu", icon: "👁️" },
      { status: "dislike", label: "Pas intéressé", icon: "✕" },
    ],
    seen: [
      { status: "like", label: "À voir", icon: "❤️" },
      { status: "dislike", label: "Pas intéressé", icon: "✕" },
    ],
    dislike: [
      { status: "like", label: "À voir", icon: "❤️" },
      { status: "seen", label: "Déjà vu", icon: "👁️" },
    ],
  };

  return (
    <div className="film-list">
      {/* Header : bouton retour + titre + bouton filtre */}
      <div className="film-list__header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="film-list__back-btn"
            onClick={() => navigate("/home")}
            aria-label="Retour à l'accueil"
          >
            ←
          </button>
          <h1 className="film-list__title">Ma liste</h1>
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
          <HamburgerMenu currentPage="liste" />
        </div>
      </div>

      {/* Barre d'onglets */}
      <div className="film-list__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            className={`film-list__tab film-list__tab--${tab.status} ${
              activeTab === tab.status ? "film-list__tab--active" : ""
            }`}
            onClick={() => setActiveTab(tab.status)}
          >
            {tab.icon} {tab.label}
            <span className="film-list__tab-count">
              {swipes[tab.status].length}
            </span>
          </button>
        ))}
      </div>

      {/* --- Barre de recherche avec autocomplétion ---
           Le conteneur a position: relative pour que la liste de suggestions
           se positionne juste en dessous du champ (position: absolute). */}
      <div className="film-list__search-container">
        <div className="film-list__search-input-wrapper">
          <span className="film-list__search-icon">🔍</span>
          <input
            type="text"
            className="film-list__search-input"
            placeholder="Rechercher un titre..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // On affiche les suggestions dès que l'utilisateur tape
              setShowSuggestions(true);
            }}
            // onFocus : si le champ a déjà du texte et qu'on clique dessus,
            // on réaffiche les suggestions (utile si elles ont été fermées)
            onFocus={() => {
              if (searchQuery.length >= 2) setShowSuggestions(true);
            }}
          />
          {/* Bouton "x" pour effacer la recherche — visible seulement s'il y a du texte */}
          {searchQuery && (
            <button
              className="film-list__search-clear"
              onClick={() => {
                setSearchQuery("");
                setShowSuggestions(false);
              }}
              aria-label="Effacer la recherche"
            >
              ✕
            </button>
          )}
        </div>

        {/* Liste de suggestions — visible seulement si :
            - showSuggestions est true (pas cliqué ailleurs)
            - il y a au moins 2 caractères tapés
            - il y a des résultats */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="film-list__suggestions">
            {suggestions.map((swipe) => (
              <li key={swipe.id}>
                <button
                  className="film-list__suggestion-item"
                  onClick={() => {
                    // On remplit le champ avec le titre exact du film
                    setSearchQuery(swipe.film.title);
                    // On ferme les suggestions
                    setShowSuggestions(false);
                  }}
                >
                  <img
                    className="film-list__suggestion-img"
                    src={swipe.film.img}
                    alt={swipe.film.title}
                  />
                  <div className="film-list__suggestion-info">
                    <span className="film-list__suggestion-title">
                      {swipe.film.title}
                    </span>
                    <span className="film-list__suggestion-year">
                      {swipe.film.release_year}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Contenu : chargement / liste vide / grille de films */}
      {loading ? (
        <div className="film-list__loading">Chargement...</div>
      ) : filteredSwipes.length === 0 ? (
        <div className="film-list__empty">
          <div className="film-list__empty-icon">
            {activeTab === "like" ? "❤️" : activeTab === "seen" ? "👁️" : "✕"}
          </div>
          <h2 className="film-list__empty-title">
            {filterCount > 0 ? "Aucun résultat" : "Liste vide"}
          </h2>
          <p className="film-list__empty-text">
            {filterCount > 0
              ? "Essaie de modifier tes filtres."
              : activeTab === "like"
              ? "Swipe des films vers la droite pour les ajouter ici !"
              : activeTab === "seen"
              ? "Les films que tu as déjà vus apparaîtront ici."
              : "Les films que tu n'aimes pas apparaîtront ici."}
          </p>
        </div>
      ) : (
        <div className="film-list__grid">
          {filteredSwipes.map((swipe) => (
            <div
              key={swipe.id}
              className="film-list__card"
              onClick={() => setSelectedFilm(swipe.film)}
            >
              {/* Affiche du film */}
              <img
                className="film-list__card-img"
                src={swipe.film.img}
                alt={swipe.film.title}
              />

              {/* Dégradé + avatars amis + titre en bas */}
              <div className="film-list__card-overlay">
                {/* Avatars empilés des amis qui ont aussi liké ce film */}
                {activeTab === "like" && friendsLikes[String(swipe.film.id)] && (
                  <div className="friend-avatars">
                    {friendsLikes[String(swipe.film.id)]
                      .slice(0, 3) // On affiche max 3 avatars sur la carte
                      .map((friend, index) => (
                        <div key={index} className="friend-avatars__circle">
                          <img
                            className="friend-avatars__img"
                            src={getAvatarUrl(friend.avatar)}
                            alt={friend.username}
                          />
                        </div>
                      ))}
                    {/* Badge "+N" s'il y a plus de 3 amis */}
                    {friendsLikes[String(swipe.film.id)].length > 3 && (
                      <div className="friend-avatars__more">
                        +{friendsLikes[String(swipe.film.id)].length - 3}
                      </div>
                    )}
                  </div>
                )}
                <p className="film-list__card-title">{swipe.film.title}</p>
                <span className="film-list__card-year">
                  {swipe.film.release_year}
                </span>

                {/* Notation par étoiles — visible uniquement dans l'onglet "Déjà vu".
                    Le onClick avec stopPropagation empêche le clic sur les étoiles
                    d'ouvrir la modale du film (sinon le clic "remonte" à la carte). */}
                {activeTab === "seen" && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <StarRating
                      value={swipe.rating ? parseFloat(swipe.rating) : null}
                      onChange={(newRating) => handleRatingChange(swipe.id, newRating)}
                    />
                  </div>
                )}
              </div>

              {/* Bouton ⋯ pour ouvrir le menu de changement de statut */}
              <button
                className="film-list__card-menu-btn"
                onClick={(e) => {
                  // stopPropagation empêche le clic de se propager à la carte
                  e.stopPropagation();
                  // Toggle : si le menu est déjà ouvert sur cette carte, on le ferme
                  setOpenMenuId(openMenuId === swipe.id ? null : swipe.id);
                }}
              >
                ⋯
              </button>

              {/* Menu contextuel — visible seulement si openMenuId correspond */}
              {/* Menu contextuel — visible seulement si openMenuId correspond */}
              {openMenuId === swipe.id && (
                <div className="film-list__card-dropdown">
                  {statusOptions[activeTab].map((option) => (
                    <button
                      key={option.status}
                      className={`film-list__card-dropdown-item film-list__card-dropdown-item--${option.status}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(swipe.id, activeTab, option.status);
                      }}
                    >
                      <span>{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale fiche complète du film */}
      <FilmDetailModal
        film={selectedFilm}
        onClose={() => setSelectedFilm(null)}
        friends={
          selectedFilm ? friendsLikes[String(selectedFilm.id)] || [] : []
        }
      />

      {/* Bottom sheet de filtres (même composant que sur la page Home) */}
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

export default FilmList;
