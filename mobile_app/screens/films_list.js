import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import Avatar from "../components/Avatar";
import StarRating from "../components/StarRating";
import FriendRatingsBadge from "../components/FriendRatingsBadge";
import FilterSheet from "../components/FilterSheet";
import FilmDetailModal from "../components/FilmDetailModal";
import CommentModal from "../components/CommentModal";
import {
  fetchSwipesList,
  updateSwipe,
  fetchFilterOptions,
} from "../api/films";
import { fetchCommonLikes } from "../api/friends";
import {
  loadFilters,
  saveFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
} from "../api/filtersStorage";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

// Nombre de colonnes de la grille de films (comme match_list).
const NUM_COLUMNS = 3;

// Configuration des onglets : statut interne, libellé, icône.
const TABS = [
  { status: "like", label: "À voir", icon: "❤️" },
  { status: "seen", label: "Déjà vu", icon: "👁️" },
  { status: "dislike", label: "Pas intéressé", icon: "✕" },
];

// Pour le menu contextuel : quels statuts proposer selon l'onglet courant
// (on propose toujours les 2 autres statuts, pas celui déjà actif).
const STATUS_OPTIONS = {
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

/**
 * FilmList — "Ma liste" : les films que j'ai swipés (mobile).
 *
 * Port de `frontend/src/pages/films_list.jsx`. Trois onglets :
 *   - "À voir" (like)  : mes films à regarder, avec les avatars des amis
 *     qui les ont aussi likés + le badge des notes des amis.
 *   - "Déjà vu" (seen) : mes films vus, que je peux noter (étoiles) et
 *     commenter (💬). Triés par note décroissante (tri gelé 2 s après une
 *     modif de note pour pouvoir se corriger).
 *   - "Pas intéressé" (dislike) : mes films écartés, avec le badge amis.
 *
 * Depuis chaque carte je peux changer le statut d'un film via le menu ⋯,
 * ouvrir sa fiche complète (FilmDetailModal) ou éditer mon commentaire.
 *
 * @returns {JSX.Element} L'écran "Ma liste"
 */
export default function FilmList() {
  // --- Onglet actif : "like", "seen" ou "dislike" ---
  const [activeTab, setActiveTab] = useState("like");

  // --- Les 3 listes de swipes (une par statut), chargées en parallèle ---
  const [swipes, setSwipes] = useState({ like: [], seen: [], dislike: [] });
  const [loading, setLoading] = useState(true);

  // --- Likes des amis : { "42": [{username, avatar}, ...] } ---
  const [friendsLikes, setFriendsLikes] = useState({});

  // --- Recherche locale + autocomplétion ---
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- Modales ---
  // Swipe dont le menu ⋯ est ouvert (null = fermé).
  const [menuSwipe, setMenuSwipe] = useState(null);
  // Film sélectionné pour la fiche complète (null = fermée).
  const [selectedFilm, setSelectedFilm] = useState(null);
  // Swipe en cours d'édition de commentaire (null = fermée).
  const [commentingSwipe, setCommentingSwipe] = useState(null);

  // --- Tri différé de l'onglet "Déjà vu" ---
  // Après une modif de note, on gèle le tri 2 s pour ne pas faire "sauter"
  // la carte pendant que l'utilisateur ajuste sa note.
  const [sortEnabled, setSortEnabled] = useState(true);
  const sortTimerRef = useRef(null); // timer du gel (persiste sans re-render)
  const sortedOrderRef = useRef(null); // ordre mémorisé pendant le gel

  // --- Filtres (mêmes structure et stockage que Home → partagés) ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlateforms, setAvailablePlateforms] = useState([]);

  // ============================================================
  // Chargement initial : swipes + likes amis + options de filtres + filtres
  // ============================================================
  useEffect(() => {
    async function fetchData() {
      try {
        // Promise.all lance toutes les requêtes en même temps (plus rapide).
        const [likeList, seenList, dislikeList, common, options, savedFilters] =
          await Promise.all([
            fetchSwipesList("like"),
            fetchSwipesList("seen"),
            fetchSwipesList("dislike"),
            fetchCommonLikes(),
            fetchFilterOptions(),
            loadFilters(),
          ]);
        setSwipes({ like: likeList, seen: seenList, dislike: dislikeList });
        setFriendsLikes(common);
        setAvailableGenres(options.genres);
        setAvailablePlateforms(options.plateforms);
        setActiveFilters(savedFilters);
      } catch (error) {
        console.error("Erreur chargement de Ma liste :", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Nettoyage du timer de tri différé au démontage (évite un setState fantôme).
  useEffect(() => {
    return () => clearTimeout(sortTimerRef.current);
  }, []);

  // En changeant d'onglet, on vide la recherche (un titre filtré sur l'onglet
  // précédent n'a pas de sens sur le nouveau).
  useEffect(() => {
    setSearchQuery("");
    setShowSuggestions(false);
  }, [activeTab]);

  /**
   * Change le statut d'un swipe (ex : like → seen).
   * Envoie un PATCH puis déplace le swipe d'un onglet à l'autre en local.
   *
   * @param {Object} swipe - Le swipe à modifier
   * @param {string} newStatus - Le nouveau statut
   */
  async function handleStatusChange(swipe, newStatus) {
    const oldStatus = swipe.status;
    try {
      await updateSwipe(swipe.id, { status: newStatus });
      setSwipes((prev) => {
        const updated = { ...swipe, status: newStatus };
        return {
          ...prev,
          // On retire le swipe de l'ancien onglet...
          [oldStatus]: prev[oldStatus].filter((s) => s.id !== swipe.id),
          // ...et on l'ajoute en tête du nouvel onglet.
          [newStatus]: [updated, ...prev[newStatus]],
        };
      });
      setMenuSwipe(null);
    } catch (error) {
      console.error("Erreur changement de statut :", error);
    }
  }

  /**
   * Met à jour la note d'un film "déjà vu" (PATCH + état local).
   * Gèle le tri 2 s pour laisser le temps de se corriger.
   *
   * @param {number} swipeId - L'ID du swipe
   * @param {number|null} newRating - La nouvelle note (0,5 à 5) ou null
   */
  async function handleRatingChange(swipeId, newRating) {
    try {
      await updateSwipe(swipeId, { rating: newRating });
      setSwipes((prev) => ({
        ...prev,
        seen: prev.seen.map((s) =>
          s.id === swipeId ? { ...s, rating: newRating } : s
        ),
      }));
      // Gel du tri : on relance le délai à chaque note (debounce).
      setSortEnabled(false);
      clearTimeout(sortTimerRef.current);
      sortTimerRef.current = setTimeout(() => setSortEnabled(true), 2000);
    } catch (error) {
      console.error("Erreur notation :", error);
    }
  }

  /**
   * Enregistre le commentaire d'un film "déjà vu" (PATCH + état local).
   *
   * @param {number} swipeId - L'ID du swipe
   * @param {string} newComment - Le texte (chaîne vide pour effacer)
   */
  async function handleCommentSave(swipeId, newComment) {
    try {
      await updateSwipe(swipeId, { comment: newComment });
      setSwipes((prev) => ({
        ...prev,
        seen: prev.seen.map((s) =>
          s.id === swipeId ? { ...s, comment: newComment } : s
        ),
      }));
      setCommentingSwipe(null);
    } catch (error) {
      console.error("Erreur enregistrement du commentaire :", error);
    }
  }

  /**
   * Applique les filtres choisis dans le bottom sheet + les persiste
   * (même clé AsyncStorage que Home → filtres partagés entre écrans).
   *
   * @param {Object} newFilters
   */
  function handleApplyFilters(newFilters) {
    setActiveFilters(newFilters);
    setIsFilterOpen(false);
    saveFilters(newFilters);
  }

  /**
   * Filtre une liste de swipes côté client (recherche + filtres actifs).
   * On ne refait pas d'appel réseau : on filtre la liste déjà en mémoire.
   *
   * @param {Array} list - La liste de swipes à filtrer
   * @returns {Array} La liste filtrée
   */
  function filterSwipes(list) {
    return list.filter((swipe) => {
      const film = swipe.film;

      // Recherche par titre (à partir de 2 caractères).
      if (searchQuery.length >= 2) {
        if (!film.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }
      // Type (Film / Série).
      if (activeFilters.type && film.type !== activeFilters.type) return false;
      // Genres : au moins un genre sélectionné présent.
      if (activeFilters.genres.length > 0) {
        const filmGenres = film.genres || [];
        if (!activeFilters.genres.some((g) => filmGenres.includes(g)))
          return false;
      }
      // Plateformes : au moins une plateforme sélectionnée présente.
      if (activeFilters.plateforms.length > 0) {
        const filmPlateforms = (film.plateforms || []).map((p) =>
          typeof p === "string" ? p : p.plateform
        );
        if (!activeFilters.plateforms.some((p) => filmPlateforms.includes(p)))
          return false;
      }
      // Années.
      if (
        activeFilters.yearMin &&
        film.release_year < parseInt(activeFilters.yearMin, 10)
      )
        return false;
      if (
        activeFilters.yearMax &&
        film.release_year > parseInt(activeFilters.yearMax, 10)
      )
        return false;

      return true;
    });
  }

  // Suggestions d'autocomplétion (5 max) sur l'onglet courant.
  const suggestions =
    searchQuery.length >= 2
      ? swipes[activeTab]
          .filter((s) =>
            s.film.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
      : [];

  // Nombre de filtres actifs (badge du bouton Filtres).
  const filterCount = countActiveFilters(activeFilters);

  // Films filtrés de l'onglet courant. L'onglet "Déjà vu" est trié par note
  // décroissante (avec gel du tri pendant 2 s après une modif de note).
  const filteredSwipes = (() => {
    const filtered = filterSwipes(swipes[activeTab]);
    if (activeTab !== "seen") return filtered;

    if (sortEnabled) {
      const sorted = [...filtered].sort((a, b) => {
        const ra = a.rating ? parseFloat(a.rating) : 0;
        const rb = b.rating ? parseFloat(b.rating) : 0;
        return rb - ra;
      });
      // On mémorise l'ordre (par ID) pour le conserver pendant le gel.
      sortedOrderRef.current = sorted.map((s) => s.id);
      return sorted;
    }

    // Tri gelé : on rejoue l'ordre mémorisé (Map pour un accès O(1)).
    if (sortedOrderRef.current) {
      const orderMap = new Map(
        sortedOrderRef.current.map((id, index) => [id, index])
      );
      return [...filtered].sort((a, b) => {
        const pa = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
        const pb = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
        return pa - pb;
      });
    }
    return filtered;
  })();

  /**
   * Rendu d'une carte de la grille (branche selon l'onglet).
   * @param {Object} param0 - { item } fourni par FlatList (un swipe)
   */
  function renderCard({ item: swipe }) {
    const film = swipe.film;
    const friends = friendsLikes[String(film.id)] || [];

    return (
      <Pressable style={styles.card} onPress={() => setSelectedFilm(film)}>
        <Image style={styles.cardImg} source={{ uri: film.img }} />

        {/* Pastille "commentaire existant" (onglet Déjà vu uniquement) :
            raccourci pour relire / modifier sans passer par le menu ⋯. */}
        {activeTab === "seen" && swipe.comment ? (
          <Pressable
            style={styles.commentBadge}
            onPress={() => setCommentingSwipe(swipe)}
            hitSlop={6}
          >
            <Text style={styles.commentBadgeIcon}>💬</Text>
          </Pressable>
        ) : null}

        {/* Bouton ⋯ : ouvre le menu de changement de statut. */}
        <Pressable
          style={styles.menuBtn}
          onPress={() => setMenuSwipe(swipe)}
          hitSlop={6}
        >
          <Text style={styles.menuBtnIcon}>⋯</Text>
        </Pressable>

        {/* Bandeau bas : avatars amis + titre + extras selon l'onglet. */}
        <View style={styles.cardOverlay}>
          {/* Avatars empilés des amis (onglet "À voir") */}
          {activeTab === "like" && friends.length > 0 ? (
            <View style={styles.avatars}>
              {friends.slice(0, 3).map((friend, index) => (
                <View
                  key={index}
                  style={[styles.avatarCircle, { marginLeft: index === 0 ? 0 : -8 }]}
                >
                  <Avatar
                    name={friend.avatar}
                    size={20}
                    fallbackLabel={friend.username}
                  />
                </View>
              ))}
              {friends.length > 3 ? (
                <View style={styles.avatarMore}>
                  <Text style={styles.avatarMoreText}>
                    +{friends.length - 3}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.cardTitle} numberOfLines={2}>
            {film.title}
          </Text>
          <Text style={styles.cardYear}>{film.release_year}</Text>

          {/* Onglets "À voir" / "Pas intéressé" : badge des notes des amis. */}
          {(activeTab === "like" || activeTab === "dislike") && (
            <FriendRatingsBadge
              friendRatings={film.friend_ratings}
              filmTitle={film.title}
            />
          )}

          {/* Onglet "Déjà vu" : ma note (étoiles interactives).
              Le Pressable interne des étoiles capte le tap → n'ouvre pas la fiche. */}
          {activeTab === "seen" && (
            <StarRating
              value={swipe.rating ? parseFloat(swipe.rating) : null}
              onChange={(newRating) => handleRatingChange(swipe.id, newRating)}
              size={14}
              showScore={false}
            />
          )}
        </View>
      </Pressable>
    );
  }

  // En-tête de la liste : onglets + recherche (+ suggestions) + compteur.
  const listHeader = (
    <View>
      {/* Titre + bouton Filtres */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Ma liste</Text>
        <Pressable style={styles.filterBtn} onPress={() => setIsFilterOpen(true)}>
          <Text style={styles.filterBtnText}>⚙ Filtres</Text>
          {filterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Barre d'onglets */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.status}
            style={[styles.tab, activeTab === tab.status && styles.tabActive]}
            onPress={() => setActiveTab(tab.status)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.status && styles.tabTextActive,
              ]}
              numberOfLines={1}
            >
              {tab.icon} {tab.label} ({swipes[tab.status].length})
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un titre..."
          placeholderTextColor={COLORS.grisTexte}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setShowSuggestions(true);
          }}
        />
        {searchQuery ? (
          <Pressable
            onPress={() => {
              setSearchQuery("");
              setShowSuggestions(false);
            }}
            hitSlop={8}
          >
            <Text style={styles.searchClear}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Suggestions d'autocomplétion (sous la barre, en flux). */}
      {showSuggestions && suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((swipe) => (
            <Pressable
              key={swipe.id}
              style={styles.suggestionItem}
              onPress={() => {
                setSearchQuery(swipe.film.title);
                setShowSuggestions(false);
              }}
            >
              <Image
                style={styles.suggestionImg}
                source={{ uri: swipe.film.img }}
              />
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {swipe.film.title}
                </Text>
                <Text style={styles.suggestionYear}>
                  {swipe.film.release_year}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Compteur de résultats (si liste non vide). */}
      {!loading && filteredSwipes.length > 0 ? (
        <Text style={styles.count}>
          <Text style={styles.countStrong}>{filteredSwipes.length}</Text>{" "}
          {filteredSwipes.length > 1 ? "films" : "film"}
        </Text>
      ) : null}
    </View>
  );

  // Contenu "vide" (selon chargement / filtres / onglet).
  function renderEmpty() {
    if (loading) {
      return <Text style={styles.loadingText}>Chargement...</Text>;
    }
    const icon =
      activeTab === "like" ? "❤️" : activeTab === "seen" ? "👁️" : "✕";
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>{icon}</Text>
        <Text style={styles.emptyTitle}>
          {filterCount > 0 || searchQuery ? "Aucun résultat" : "Liste vide"}
        </Text>
        <Text style={styles.emptyText}>
          {filterCount > 0 || searchQuery
            ? "Essaie de modifier tes filtres ou ta recherche."
            : activeTab === "like"
            ? "Swipe des films vers la droite pour les ajouter ici !"
            : activeTab === "seen"
            ? "Les films que tu as déjà vus apparaîtront ici."
            : "Les films qui ne t'intéressent pas apparaîtront ici."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={loading ? [] : filteredSwipes}
        renderItem={renderCard}
        keyExtractor={(swipe) => String(swipe.id)}
        numColumns={NUM_COLUMNS}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* === Menu contextuel ⋯ (changement de statut + commentaire) === */}
      <Modal
        visible={!!menuSwipe}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuSwipe(null)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuSwipe(null)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            {menuSwipe ? (
              <>
                <Text style={styles.menuTitle} numberOfLines={1}>
                  {menuSwipe.film.title}
                </Text>

                {/* Option commentaire (onglet Déjà vu uniquement). */}
                {activeTab === "seen" ? (
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      setCommentingSwipe(menuSwipe);
                      setMenuSwipe(null);
                    }}
                  >
                    <Text style={styles.menuItemText}>
                      💬{" "}
                      {menuSwipe.comment
                        ? "Modifier le commentaire"
                        : "Commentaire"}
                    </Text>
                  </Pressable>
                ) : null}

                {/* Les 2 autres statuts. */}
                {STATUS_OPTIONS[activeTab].map((option) => (
                  <Pressable
                    key={option.status}
                    style={styles.menuItem}
                    onPress={() => handleStatusChange(menuSwipe, option.status)}
                  >
                    <Text style={styles.menuItemText}>
                      {option.icon} {option.label}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* === Fiche complète du film === */}
      <FilmDetailModal
        film={selectedFilm}
        onClose={() => setSelectedFilm(null)}
        friends={
          selectedFilm ? friendsLikes[String(selectedFilm.id)] || [] : []
        }
      />

      {/* === Édition du commentaire personnel (onglet Déjà vu) === */}
      <CommentModal
        swipe={commentingSwipe}
        onClose={() => setCommentingSwipe(null)}
        onSave={(newComment) =>
          handleCommentSave(commentingSwipe.id, newComment)
        }
      />

      {/* === Bottom sheet de filtres (même composant que Home) === */}
      <FilterSheet
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={activeFilters}
        availableGenres={availableGenres}
        availablePlateforms={availablePlateforms}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.huge,
  },
  columnWrapper: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  loadingText: {
    color: COLORS.grisTexte,
    fontFamily: FONTS.body,
    fontSize: 15,
    textAlign: "center",
    paddingVertical: SPACING.xl,
  },

  // --- En-tête ---
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  pageTitle: {
    flex: 1,
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.blancDoux,
    marginRight: SPACING.sm,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs + 2,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    borderWidth: BORDERS.width,
    borderColor: "rgba(123,92,255,0.3)",
    backgroundColor: "rgba(123,92,255,0.1)",
  },
  filterBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 13,
    color: COLORS.violetNuit,
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.violetNuit,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontFamily: FONTS.displayBold,
    fontSize: 11,
    color: "#fff",
  },

  // Onglets
  tabs: {
    flexDirection: "row",
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADII.button,
    backgroundColor: COLORS.noirCarte,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    alignItems: "center",
  },
  tabActive: {
    borderColor: COLORS.corailVif,
    backgroundColor: "rgba(255,77,106,0.12)",
  },
  tabText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 11,
    color: COLORS.grisTexte,
    textAlign: "center",
  },
  tabTextActive: {
    color: COLORS.blancDoux,
  },

  // Recherche
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.grisSombre,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  searchClear: {
    color: COLORS.grisTexte,
    fontSize: 14,
  },

  // Suggestions
  suggestions: {
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
    overflow: "hidden",
    marginBottom: SPACING.sm,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.sm,
  },
  suggestionImg: {
    width: 34,
    height: 50,
    borderRadius: 6,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  suggestionYear: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
  },

  // Compteur
  count: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    marginBottom: SPACING.sm,
  },
  countStrong: {
    fontFamily: FONTS.displayBold,
    color: COLORS.blancDoux,
  },

  // --- Cartes ---
  card: {
    flex: 1 / NUM_COLUMNS,
    aspectRatio: 2 / 3,
    borderRadius: RADII.input,
    overflow: "hidden",
    backgroundColor: COLORS.noirCarte,
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.sm,
    backgroundColor: "rgba(13,13,15,0.78)",
    gap: 3,
  },
  cardTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 11,
    color: COLORS.blancDoux,
  },
  cardYear: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.grisTexte,
  },

  // Avatars amis empilés
  avatars: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  avatarCircle: {
    borderWidth: 1,
    borderColor: COLORS.noirCarte,
    borderRadius: RADII.round,
    overflow: "hidden",
  },
  avatarMore: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    marginLeft: -8,
    borderRadius: RADII.round,
    backgroundColor: COLORS.grisMoyen,
    borderWidth: 1,
    borderColor: COLORS.noirCarte,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMoreText: {
    fontFamily: FONTS.displayBold,
    fontSize: 9,
    color: COLORS.blancDoux,
  },

  // Boutons de carte
  menuBtn: {
    position: "absolute",
    top: SPACING.xs,
    right: SPACING.xs,
    width: 26,
    height: 26,
    borderRadius: RADII.round,
    backgroundColor: "rgba(13,13,15,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnIcon: {
    color: COLORS.blancDoux,
    fontSize: 16,
    lineHeight: 16,
  },
  commentBadge: {
    position: "absolute",
    top: SPACING.xs,
    left: SPACING.xs,
    width: 26,
    height: 26,
    borderRadius: RADII.round,
    backgroundColor: "rgba(13,13,15,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  commentBadgeIcon: {
    fontSize: 12,
  },

  // --- Menu contextuel (Modal) ---
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  menu: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.modal,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  menuTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: COLORS.blancDoux,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  menuItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.button,
    backgroundColor: COLORS.grisSombre,
  },
  menuItemText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.blancDoux,
  },

  // --- Vide ---
  empty: {
    alignItems: "center",
    paddingVertical: SPACING.huge,
    gap: SPACING.sm,
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: COLORS.blancDoux,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    textAlign: "center",
  },
});
