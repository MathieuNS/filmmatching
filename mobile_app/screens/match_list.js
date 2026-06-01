import { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import Avatar from "../components/Avatar";
import StarRating from "../components/StarRating";
import FilterSheet from "../components/FilterSheet";
import FilmDetailModal from "../components/FilmDetailModal";
import CommentModal from "../components/CommentModal";
import {
  fetchMe,
  fetchFriendships,
  fetchMatches,
  fetchGroupMatches,
  fetchFriendSeen,
  addToWatchlist,
  markAsSeen,
} from "../api/friends";
import { fetchFilterOptions } from "../api/films";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

// Nombre de colonnes de la grille de films.
const NUM_COLUMNS = 3;

/**
 * MatchList — films likés en commun avec un ou plusieurs amis (mobile).
 *
 * Port de `frontend/src/pages/match_list.jsx`. Le mode est déduit des
 * paramètres de navigation :
 *   - `route.params.friendshipId` → mode 1v1 (avec onglet "Sa filmothèque")
 *   - `route.params.groupIds`     → mode groupe (intersection de N listes)
 *
 * @param {Object} props
 * @param {Object} props.route - route React Navigation (params)
 * @param {Object} props.navigation - objet de navigation
 * @returns {JSX.Element} L'écran des matchs
 */
export default function MatchList({ route }) {
  // Paramètres passés à la navigation.
  const friendshipId = route.params?.friendshipId;
  const groupIds = route.params?.groupIds;
  const isGroupMode = !friendshipId && !!groupIds;

  // --- Onglet actif (1v1 seulement) : "matches" ou "seen" ---
  const [activeTab, setActiveTab] = useState("matches");

  // --- Données ---
  const [matchedFilms, setMatchedFilms] = useState([]);
  const [seenItems, setSeenItems] = useState([]);
  const [seenLoaded, setSeenLoaded] = useState(false);
  const [seenIsPrivate, setSeenIsPrivate] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [groupFriends, setGroupFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Filtres (même structure que Home / FilmList) ---
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

  // --- Modales ---
  const [randomFilm, setRandomFilm] = useState(null);
  const [selectedFilm, setSelectedFilm] = useState(null); // onglet "matches"
  const [selectedSeenItem, setSelectedSeenItem] = useState(null); // onglet "seen"
  const [viewingCommentItem, setViewingCommentItem] = useState(null);

  // ============================================================
  // Chargement initial : matchs + options de filtres (+ nom de l'ami en 1v1)
  // ============================================================
  useEffect(() => {
    async function fetchData() {
      try {
        if (isGroupMode) {
          // --- Mode groupe ---
          const [group, options] = await Promise.all([
            fetchGroupMatches(groupIds),
            fetchFilterOptions(),
          ]);
          setMatchedFilms(group.films);
          setGroupFriends(group.friends);
          setAvailableGenres(options.genres);
          setAvailablePlateforms(options.plateforms);
        } else {
          // --- Mode 1v1 ---
          const [matches, options, friendships, me] = await Promise.all([
            fetchMatches(friendshipId),
            fetchFilterOptions(),
            fetchFriendships(),
            fetchMe(),
          ]);
          setMatchedFilms(matches);
          setAvailableGenres(options.genres);
          setAvailablePlateforms(options.plateforms);

          // Trouver le pseudo de l'ami dans la liste d'amitiés.
          const friendship = friendships.find(
            (f) => f.id === parseInt(friendshipId, 10)
          );
          if (friendship) {
            setFriendName(
              friendship.sender === me.id
                ? friendship.receiver_username
                : friendship.sender_username
            );
          }
        }
      } catch (error) {
        console.error("Erreur chargement des matchs :", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [friendshipId, groupIds, isGroupMode]);

  // ============================================================
  // Chargement de la filmothèque de l'ami (1v1 uniquement)
  // ============================================================
  useEffect(() => {
    if (isGroupMode) return; // pas de filmothèque en groupe
    if (seenLoaded) return;

    async function loadSeen() {
      try {
        const items = await fetchFriendSeen(friendshipId);
        setSeenItems(items);
        setSeenIsPrivate(false);
      } catch (error) {
        // 403 { error: "private" } = l'ami a désactivé le partage.
        if (
          error.response?.status === 403 &&
          error.response?.data?.error === "private"
        ) {
          setSeenIsPrivate(true);
          setSeenItems([]);
        } else {
          console.error("Erreur chargement filmothèque :", error);
          setSeenItems([]);
        }
      } finally {
        setSeenLoaded(true);
      }
    }
    loadSeen();
  }, [friendshipId, isGroupMode, seenLoaded]);

  /**
   * Applique les filtres choisis dans le bottom sheet.
   * @param {Object} newFilters
   */
  function handleApplyFilters(newFilters) {
    setActiveFilters(newFilters);
    setIsFilterOpen(false);
  }

  /**
   * Filtre une liste de films côté client selon les filtres actifs.
   * @param {Array} films
   * @returns {Array}
   */
  function filterFilms(films) {
    return films.filter((film) => {
      if (activeFilters.type && film.type !== activeFilters.type) return false;
      if (activeFilters.genres.length > 0) {
        const filmGenres = film.genres || [];
        if (!activeFilters.genres.some((g) => filmGenres.includes(g)))
          return false;
      }
      if (activeFilters.plateforms.length > 0) {
        const filmPlateforms = (film.plateforms || []).map((p) =>
          // les plateformes peuvent être des objets {plateform} ou des strings
          typeof p === "string" ? p : p.plateform
        );
        if (!activeFilters.plateforms.some((p) => filmPlateforms.includes(p)))
          return false;
      }
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

  // Films après filtres (onglet "matches") et items filmothèque filtrés.
  const filteredFilms = filterFilms(matchedFilms);
  const filteredSeenItems = seenItems.filter(
    (item) => filterFilms([item.film]).length > 0
  );

  // Nombre de filtres actifs (pour le badge).
  const filterCount =
    (activeFilters.type ? 1 : 0) +
    activeFilters.genres.length +
    activeFilters.plateforms.length +
    (activeFilters.yearMin ? 1 : 0) +
    (activeFilters.yearMax ? 1 : 0);

  /**
   * Choisit un film au hasard parmi les matchs filtrés (affiché en modale).
   */
  function handleRandomPick() {
    if (filteredFilms.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredFilms.length);
    setRandomFilm(filteredFilms[randomIndex]);
  }

  /**
   * Ajoute un film à MA watchlist depuis la filmothèque de l'ami.
   * Mise à jour optimiste du `my_status` local.
   * @param {Object} film
   */
  async function handleAddToWatchlist(film) {
    await addToWatchlist(film.id);
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
   * Marque un film "déjà vu" par moi (avec ou sans note).
   * @param {Object} film
   * @param {number|null} rating
   */
  async function handleMarkAsSeen(film, rating) {
    await markAsSeen(film.id, rating);
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
   * Métadonnées du badge "mon statut" en coin de carte (filmothèque).
   * @param {string|null} status
   */
  function getStatusBadgeMeta(status) {
    if (status === "like") return { icon: "❤️", color: COLORS.corailVif };
    if (status === "seen") return { icon: "👁️", color: COLORS.ambreDore };
    if (status === "dislike") return { icon: "✕", color: COLORS.grisTexte };
    return null;
  }

  // Titre de l'écran selon le mode et l'onglet.
  const headerTitle = isGroupMode
    ? "Matchs de groupe"
    : friendName
    ? activeTab === "seen"
      ? `Filmothèque de ${friendName}`
      : `Matchs avec ${friendName}`
    : "Matchs";

  // Données affichées dans la grille selon l'onglet actif.
  const gridData = activeTab === "matches" ? filteredFilms : filteredSeenItems;

  /**
   * Rendu d'une carte de la grille (branche selon l'onglet).
   * @param {Object} param0 - { item } fourni par FlatList
   */
  function renderCard({ item }) {
    // Onglet "matches" : item est un film.
    if (activeTab === "matches") {
      return (
        <Pressable style={styles.card} onPress={() => setSelectedFilm(item)}>
          <Image style={styles.cardImg} source={{ uri: item.img }} />
          <View style={styles.cardOverlay}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardYear}>{item.release_year}</Text>
          </View>
        </Pressable>
      );
    }

    // Onglet "seen" : item est { film, friend_rating, friend_comment, my_status }
    const badge = getStatusBadgeMeta(item.my_status);
    return (
      <Pressable style={styles.card} onPress={() => setSelectedSeenItem(item)}>
        <Image style={styles.cardImg} source={{ uri: item.film.img }} />

        {/* Badge "mon statut" en coin */}
        {badge && (
          <View style={[styles.statusBadge, { borderColor: badge.color }]}>
            <Text style={styles.statusBadgeIcon}>{badge.icon}</Text>
          </View>
        )}

        {/* Pastille "commentaire de l'ami" */}
        {item.friend_comment && (
          <Pressable
            style={styles.commentBadge}
            onPress={() => setViewingCommentItem(item)}
            hitSlop={6}
          >
            <Text style={styles.commentBadgeIcon}>💬</Text>
          </Pressable>
        )}

        <View style={styles.cardOverlay}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.film.title}
          </Text>
          <Text style={styles.cardYear}>{item.film.release_year}</Text>
          {/* Note de l'ami (read-only) */}
          {item.friend_rating !== null && item.friend_rating !== undefined && (
            <StarRating
              value={parseFloat(item.friend_rating)}
              readOnly
              size={11}
              showScore={false}
            />
          )}
        </View>
      </Pressable>
    );
  }

  // En-tête de la liste (titre, bandeau groupe, onglets, compteur, dé).
  const listHeader = (
    <View>
      {/* Titre + bouton filtres */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>{headerTitle}</Text>
        <Pressable style={styles.filterBtn} onPress={() => setIsFilterOpen(true)}>
          <Text style={styles.filterBtnText}>⚙ Filtres</Text>
          {filterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Bandeau des amis en mode groupe */}
      {isGroupMode && groupFriends.length > 0 && (
        <View style={styles.groupMembers}>
          <Text style={styles.groupLabel}>Avec</Text>
          {groupFriends.map((friend, index) => (
            <View key={index} style={styles.groupMember}>
              <Avatar
                name={friend.avatar}
                size={28}
                fallbackLabel={friend.username}
              />
              <Text style={styles.groupName}>{friend.username}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Onglets (1v1 uniquement) */}
      {!isGroupMode && (
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "matches" && styles.tabActive]}
            onPress={() => setActiveTab("matches")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "matches" && styles.tabTextActive,
              ]}
            >
              🎬 À voir ensemble ({matchedFilms.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "seen" && styles.tabActive]}
            onPress={() => setActiveTab("seen")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "seen" && styles.tabTextActive,
              ]}
            >
              👁️ Sa filmothèque{" "}
              {seenLoaded && `(${seenIsPrivate ? "🔒" : seenItems.length})`}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Compteur + bouton dé (onglet matches avec au moins un match) */}
      {activeTab === "matches" && matchedFilms.length > 0 && (
        <>
          <Text style={styles.count}>
            <Text style={styles.countStrong}>{filteredFilms.length}</Text>{" "}
            {filteredFilms.length > 1 ? "films en commun" : "film en commun"}
            {filterCount > 0 && ` (${matchedFilms.length} au total)`}
          </Text>
          <Pressable
            style={[
              styles.randomBtn,
              filteredFilms.length === 0 && styles.randomBtnDisabled,
            ]}
            onPress={handleRandomPick}
            disabled={filteredFilms.length === 0}
          >
            <Text style={styles.randomBtnText}>🎲 Choix aléatoire</Text>
          </Pressable>
        </>
      )}

      {/* Compteur (onglet filmothèque non vide / non privée) */}
      {activeTab === "seen" &&
        seenLoaded &&
        !seenIsPrivate &&
        seenItems.length > 0 && (
          <Text style={styles.count}>
            <Text style={styles.countStrong}>{filteredSeenItems.length}</Text>{" "}
            {filteredSeenItems.length > 1 ? "films vus" : "film vu"} par{" "}
            {friendName}
            {filterCount > 0 && ` (${seenItems.length} au total)`}
          </Text>
        )}
    </View>
  );

  // Contenu "vide" selon l'onglet / l'état.
  function renderEmpty() {
    if (activeTab === "matches") {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>
            {matchedFilms.length === 0
              ? "Aucun match pour l'instant"
              : "Aucun résultat"}
          </Text>
          <Text style={styles.emptyText}>
            {matchedFilms.length === 0
              ? "Aucun film en commun. Continuez tous à swiper !"
              : "Essaie de modifier tes filtres."}
          </Text>
        </View>
      );
    }
    // Onglet filmothèque
    if (!seenLoaded) {
      return <Text style={styles.loadingText}>Chargement...</Text>;
    }
    if (seenIsPrivate) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>Filmothèque privée</Text>
          <Text style={styles.emptyText}>
            {friendName} a choisi de garder sa filmothèque privée.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>👁️</Text>
        <Text style={styles.emptyTitle}>
          {seenItems.length === 0 ? "Aucun film vu" : "Aucun résultat"}
        </Text>
        <Text style={styles.emptyText}>
          {seenItems.length === 0
            ? `${friendName} n'a encore marqué aucun film comme déjà vu.`
            : "Essaie de modifier tes filtres."}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={gridData}
        renderItem={renderCard}
        // clé : id du film (matches) ou id du film de l'item (seen)
        keyExtractor={(item) =>
          String(activeTab === "matches" ? item.id : item.film.id)
        }
        numColumns={NUM_COLUMNS}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* === Modale du film choisi aléatoirement === */}
      <Modal
        visible={!!randomFilm}
        transparent
        animationType="fade"
        onRequestClose={() => setRandomFilm(null)}
      >
        <Pressable
          style={styles.randomBackdrop}
          onPress={() => setRandomFilm(null)}
        >
          <Pressable style={styles.randomModal} onPress={() => {}}>
            {randomFilm && (
              <>
                <Image
                  style={styles.randomPoster}
                  source={{ uri: randomFilm.img }}
                />
                <Text style={styles.randomLabel}>Ce soir vous regardez</Text>
                <Text style={styles.randomTitle}>{randomFilm.title}</Text>
                <Text style={styles.randomYear}>{randomFilm.release_year}</Text>
                <View style={styles.randomActions}>
                  <Pressable
                    style={[styles.randomActionBtn, styles.randomClose]}
                    onPress={() => setRandomFilm(null)}
                  >
                    <Text style={styles.randomCloseText}>Fermer</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.randomActionBtn, styles.randomRetry]}
                    onPress={handleRandomPick}
                  >
                    <Text style={styles.randomRetryText}>🎲 Relancer</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modale fiche film — onglet "matches" (info pure) */}
      <FilmDetailModal film={selectedFilm} onClose={() => setSelectedFilm(null)} />

      {/* Modale fiche film — onglet "seen" (filmothèque ami) */}
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

      {/* Modale du commentaire de l'ami (lecture seule) */}
      <CommentModal
        swipe={
          viewingCommentItem
            ? {
                comment: viewingCommentItem.friend_comment,
                film: viewingCommentItem.film,
              }
            : null
        }
        onClose={() => setViewingCommentItem(null)}
        readOnly
        authorName={friendName}
      />

      {/* Bottom sheet de filtres */}
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.grisTexte,
    fontFamily: FONTS.body,
    fontSize: 15,
    textAlign: "center",
    paddingVertical: SPACING.xl,
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

  // Bandeau groupe
  groupMembers: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  groupLabel: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
  },
  groupMember: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs + 2,
  },
  groupName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.blancDoux,
  },

  // Onglets
  tabs: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.button,
    backgroundColor: COLORS.noirCarte,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    alignItems: "center",
  },
  tabActive: {
    borderColor: COLORS.violetNuit,
    backgroundColor: "rgba(123,92,255,0.12)",
  },
  tabText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 12,
    color: COLORS.grisTexte,
    textAlign: "center",
  },
  tabTextActive: {
    color: COLORS.blancDoux,
  },

  // Compteur + dé
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
  randomBtn: {
    backgroundColor: COLORS.violetNuit,
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  randomBtnDisabled: {
    opacity: 0.5,
  },
  randomBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: "#fff",
  },

  // --- Cartes de la grille ---
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
    backgroundColor: "rgba(13,13,15,0.75)",
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
  statusBadge: {
    position: "absolute",
    top: SPACING.xs,
    right: SPACING.xs,
    width: 24,
    height: 24,
    borderRadius: RADII.round,
    backgroundColor: "rgba(13,13,15,0.8)",
    borderWidth: BORDERS.width,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeIcon: {
    fontSize: 11,
  },
  commentBadge: {
    position: "absolute",
    top: SPACING.xs,
    left: SPACING.xs,
    width: 24,
    height: 24,
    borderRadius: RADII.round,
    backgroundColor: "rgba(13,13,15,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  commentBadgeIcon: {
    fontSize: 11,
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

  // --- Modale aléatoire ---
  randomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  randomModal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.modal,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    padding: SPACING.xxl,
    alignItems: "center",
  },
  randomPoster: {
    width: 150,
    height: 225,
    borderRadius: RADII.input,
    marginBottom: SPACING.lg,
  },
  randomLabel: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
  },
  randomTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    color: COLORS.blancDoux,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  randomYear: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    marginTop: 2,
    marginBottom: SPACING.lg,
  },
  randomActions: {
    flexDirection: "row",
    gap: SPACING.md,
    alignSelf: "stretch",
  },
  randomActionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
    alignItems: "center",
  },
  randomClose: {
    backgroundColor: COLORS.grisSombre,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
  },
  randomCloseText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  randomRetry: {
    backgroundColor: COLORS.violetNuit,
  },
  randomRetryText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: "#fff",
  },
});
