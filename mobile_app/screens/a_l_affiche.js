import { useState, useEffect } from "react";
import { View, Text, Image, Pressable, FlatList, StyleSheet } from "react-native";
import FilmDetailModal from "../components/FilmDetailModal";
import MatchOverlay from "../components/MatchOverlay";
import { fetchNowPlaying, sendSwipe } from "../api/films";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

// Nombre de colonnes de la grille (comme Ma liste / Matchs).
const NUM_COLUMNS = 3;

/**
 * Métadonnées du badge de statut affiché en coin de carte.
 * @param {string|null} status - "like", "seen", "dislike" ou null
 * @returns {{icon: string, color: string}|null}
 */
function getStatusBadge(status) {
  if (status === "like") return { icon: "❤️", color: COLORS.corailVif };
  if (status === "seen") return { icon: "👁️", color: COLORS.ambreDore };
  if (status === "dislike") return { icon: "✕", color: COLORS.grisTexte };
  return null;
}

/**
 * AlAffiche — "À l'affiche" : les films actuellement au cinéma en France.
 *
 * Port de `frontend/src/pages/a_l_affiche.jsx`. Les films sont pré-chargés
 * en base par une commande cron (get_now_playing) ; l'API les renvoie tous
 * d'un coup avec leurs infos complètes.
 *
 * Au tap sur un film, on ouvre `FilmDetailModal` en contexte "affiche" :
 * 3 boutons de swipe directs (À voir / Déjà vu / Pas intéressé) qui
 * utilisent le même endpoint /api/swipes/ que le reste de l'app. Un match
 * déclenche l'animation `MatchOverlay`.
 *
 * @returns {JSX.Element} L'écran "À l'affiche"
 */
export default function AlAffiche() {
  // --- Données ---
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Modales ---
  const [selectedFilm, setSelectedFilm] = useState(null);
  // Données du match à afficher ({ film, friends }) ou null.
  const [matchData, setMatchData] = useState(null);

  // Chargement des films à l'affiche au montage.
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNowPlaying();
        setFilms(data);
      } catch (error) {
        console.error("Erreur chargement films à l'affiche :", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /**
   * Enregistre un swipe sur un film à l'affiche (même endpoint que partout).
   * Met à jour le `user_status` local (film dans la grille + film sélectionné)
   * et déclenche l'animation de match si des amis ont aussi liké.
   *
   * @param {Object} film - Le film swipé
   * @param {string} status - "like", "seen" ou "dislike"
   */
  async function handleSwipe(film, status) {
    try {
      const data = await sendSwipe(film.id, status);

      // Mise à jour optimiste du statut dans la grille.
      setFilms((prev) =>
        prev.map((f) =>
          f.id === film.id ? { ...f, user_status: status } : f
        )
      );
      // Et dans le film ouvert dans la modale (pour surligner le bon bouton).
      setSelectedFilm((prev) =>
        prev && prev.id === film.id ? { ...prev, user_status: status } : prev
      );

      // Match éventuel : amis ayant aussi liké ce film.
      const matchedFriends = data.matched_friends || [];
      if (matchedFriends.length > 0) {
        setMatchData({ film, friends: matchedFriends });
      }
    } catch (error) {
      console.error("Erreur swipe film à l'affiche :", error);
    }
  }

  /**
   * Rendu d'une carte de la grille.
   * @param {Object} param0 - { item } fourni par FlatList (un film)
   */
  function renderCard({ item: film }) {
    const badge = getStatusBadge(film.user_status);
    return (
      <Pressable style={styles.card} onPress={() => setSelectedFilm(film)}>
        <Image style={styles.cardImg} source={{ uri: film.img }} />

        {/* Badge de statut si déjà swipé. */}
        {badge ? (
          <View style={[styles.statusBadge, { borderColor: badge.color }]}>
            <Text style={styles.statusBadgeIcon}>{badge.icon}</Text>
          </View>
        ) : null}

        <View style={styles.cardOverlay}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {film.title}
          </Text>
          <Text style={styles.cardYear}>{film.release_year}</Text>
        </View>
      </Pressable>
    );
  }

  // En-tête : titre + compteur.
  const listHeader = (
    <View>
      <Text style={styles.pageTitle}>À l'affiche</Text>
      {!loading && films.length > 0 ? (
        <Text style={styles.count}>
          <Text style={styles.countStrong}>{films.length}</Text>{" "}
          {films.length > 1 ? "films à l'affiche" : "film à l'affiche"}
        </Text>
      ) : null}
    </View>
  );

  // Contenu "vide" (chargement / aucun film).
  function renderEmpty() {
    if (loading) {
      return <Text style={styles.loadingText}>Chargement...</Text>;
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyTitle}>Aucun film à l'affiche</Text>
        <Text style={styles.emptyText}>Aucun film trouvé pour le moment.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={loading ? [] : films}
        renderItem={renderCard}
        keyExtractor={(film) => String(film.id)}
        numColumns={NUM_COLUMNS}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Fiche détail en contexte "affiche" (3 boutons de swipe directs). */}
      <FilmDetailModal
        film={selectedFilm}
        onClose={() => setSelectedFilm(null)}
        onSwipe={handleSwipe}
        userStatus={selectedFilm?.user_status || null}
      />

      {/* Animation "It's a Match !" si un ami a aussi liké. */}
      <MatchOverlay matchData={matchData} onClose={() => setMatchData(null)} />
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

  // En-tête
  pageTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.blancDoux,
    marginBottom: SPACING.sm,
  },
  count: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    marginBottom: SPACING.md,
  },
  countStrong: {
    fontFamily: FONTS.displayBold,
    color: COLORS.blancDoux,
  },

  // Cartes
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

  // Vide
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
