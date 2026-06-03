// React : états + références persistantes entre les rendus
// useLayoutEffect : comme useEffect, mais exécuté AVANT l'affichage. On s'en
// sert pour configurer le header (boutons loupe/filtres) sans clignotement.
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING } from "../constants/spacing";
import AppHeader from "../components/AppHeader";
import FilmCard from "../components/FilmCard";
import SearchOverlay from "../components/SearchOverlay";
import FilterSheet from "../components/FilterSheet";
import MatchOverlay from "../components/MatchOverlay";
import {
  fetchRandomFilm,
  fetchFilterOptions,
  sendSwipe,
} from "../api/films";
import {
  loadFilters,
  saveFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
} from "../api/filtersStorage";

// Dimensions de l'écran : servent à projeter la carte hors écran à la sortie.
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
// Distance (en px) à parcourir pour valider un swipe (comme le web).
const SWIPE_THRESHOLD = 120;

/**
 * Home — l'écran de swipe, cœur de l'application (version mobile).
 *
 * Port de la page web `frontend/src/pages/home.jsx`. On affiche un film à la
 * fois ; l'utilisateur le fait glisser au doigt (ou tape un bouton) :
 *   - vers la DROITE  → "À voir" (like)
 *   - vers la GAUCHE  → "Pas intéressé" (dislike)
 *   - vers le HAUT    → "Déjà vu" (seen)
 *
 * Le film suivant est pré-chargé en avance pour un affichage instantané.
 * Le geste utilise `PanResponder` + `Animated` (intégrés à React Native) :
 * `PanResponder` écoute le doigt, `Animated` déplace/incline la carte.
 *
 * @param {Object} props
 * @param {Object} props.navigation - objet de navigation (fourni par la pile)
 * @returns {JSX.Element} L'écran de swipe
 */
export default function Home({ navigation }) {
  // --- Données du deck ---
  const [film, setFilm] = useState(null); // film affiché
  const [nextFilm, setNextFilm] = useState(null); // film pré-chargé
  const [loading, setLoading] = useState(true); // chargement initial
  const [noMoreFilms, setNoMoreFilms] = useState(false); // plus rien à proposer

  // --- Filtres ---
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false); // filtres lus du stockage ?
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availablePlateforms, setAvailablePlateforms] = useState([]);

  // --- Overlays ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [matchData, setMatchData] = useState(null);

  // Zone "sûre" du bas : hauteur de la barre de navigation (ou de la barre de
  // gestes) du téléphone. On l'AJOUTE au paddingBottom de l'écran pour que les
  // labels des 3 boutons ne passent plus DERRIÈRE les boutons système du bas
  // (problème constaté sur l'Oppo Reno 2). Même principe que `insets.top` pour
  // la barre d'état dans AppHeader.
  const insets = useSafeAreaInsets();
  // Style de l'écran combinant le style statique + le padding bas dynamique.
  // `SPACING.md` reste comme respiration minimale quand l'inset vaut 0.
  const screenStyle = [
    styles.screen,
    { paddingBottom: insets.bottom + SPACING.md },
  ];

  // --- Animation de la carte ---
  // Animated.ValueXY = un couple (x, y) animable. C'est la position de la
  // carte par rapport à son centre. On la garde dans un useRef pour qu'elle
  // survive aux rendus sans être recréée.
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // performSwipeRef : le PanResponder est créé UNE seule fois (useRef) et
  // capturerait donc des valeurs périmées (film/nextFilm du 1er rendu). Pour
  // qu'il appelle toujours la version À JOUR de notre logique de swipe, on
  // range cette logique dans une référence qu'on rafraîchit à chaque rendu.
  const performSwipeRef = useRef(null);

  // ============================================================
  // Chargement initial : options de filtres + filtres sauvegardés
  // ============================================================
  useEffect(() => {
    // Genres + plateformes pour le panneau de filtres.
    async function loadOptions() {
      try {
        const { genres, plateforms } = await fetchFilterOptions();
        setAvailableGenres(genres);
        setAvailablePlateforms(plateforms);
      } catch (error) {
        console.error("Erreur chargement options filtres :", error);
      }
    }
    // Filtres mémorisés (AsyncStorage) : on attend de les avoir lus avant
    // de charger le deck, pour charger directement les bons films.
    async function restoreFilters() {
      const saved = await loadFilters();
      setFilters(saved);
      setFiltersLoaded(true);
    }
    loadOptions();
    restoreFilters();
  }, []);

  // ============================================================
  // (Re)charge le deck quand les filtres sont prêts ou changent
  // ============================================================
  useEffect(() => {
    if (!filtersLoaded) return; // on attend la lecture du stockage

    let annule = false; // garde-fou si le composant change pendant l'await

    async function initializeDeck() {
      setLoading(true);
      setNoMoreFilms(false);
      try {
        const current = await fetchRandomFilm(filters);
        if (annule) return;
        if (!current) {
          setFilm(null);
          setNextFilm(null);
          setNoMoreFilms(true);
        } else {
          setFilm(current);
          // (le recentrage de la carte est géré par le useLayoutEffect sur `film`)
          prefetchNext(current.id);
        }
      } catch (error) {
        console.error("Erreur chargement initial du deck :", error);
      } finally {
        if (!annule) setLoading(false);
      }
    }

    initializeDeck();
    // Nettoyage : si filters change à nouveau avant la fin, on ignore le résultat.
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, filtersLoaded]);

  // ============================================================
  // Recentrage de la carte à chaque changement de film
  // ============================================================
  // Corrige le bug "la carte swipée réapparaît une demi-seconde".
  //
  // La position de la carte (`Animated.ValueXY`) est pilotée en dehors du
  // cycle de rendu React : si on la remet à {0,0} de façon impérative pendant
  // qu'on change de film, la vue se recentre INSTANTANÉMENT alors que React
  // n'a pas encore basculé sur le nouveau film → l'ANCIENNE carte (encore à
  // l'écran) revient au centre l'espace d'un instant.
  //
  // La solution : recentrer la carte ICI, dans un `useLayoutEffect` déclenché
  // par le changement de `film`. `useLayoutEffect` s'exécute APRÈS que React a
  // appliqué le nouveau film, mais AVANT l'affichage à l'écran. Du coup la
  // remise à zéro est synchronisée avec le nouveau film : on ne voit jamais
  // l'ancienne carte revenir au centre (c'est l'équivalent mobile du correctif
  // web, où tout est remis à zéro dans le même rendu).
  useLayoutEffect(() => {
    position.setValue({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film]);

  /**
   * Pré-charge le prochain film (et son image) pour un affichage instantané.
   * @param {number} excludeId - ID du film actuel (à ne pas re-proposer)
   */
  async function prefetchNext(excludeId) {
    try {
      const next = await fetchRandomFilm(filters, excludeId);
      if (!next) {
        setNextFilm(null);
        return;
      }
      // Image.prefetch télécharge l'affiche dans le cache à l'avance, pour que
      // la prochaine carte s'affiche sans temps de chargement. On ne bloque
      // pas dessus (pas d'await) : le .catch évite un warning si ça échoue.
      if (next.img) {
        Image.prefetch(next.img).catch(() => {});
      }
      setNextFilm(next);
    } catch (error) {
      console.error("Erreur pré-chargement :", error);
      setNextFilm(null);
    }
  }

  /**
   * Envoie le swipe au backend et déclenche l'animation de match si besoin.
   * @param {Object} swipedFilm - le film qui vient d'être swipé
   * @param {string} status - "like" | "dislike" | "seen"
   */
  async function sendSwipeAndCheckMatch(swipedFilm, status) {
    try {
      const data = await sendSwipe(swipedFilm.id, status);
      const matchedFriends = data.matched_friends || [];
      if (status === "like" && matchedFriends.length > 0) {
        setMatchData({ film: swipedFilm, friends: matchedFriends });
      }
    } catch (error) {
      console.error("Erreur envoi du swipe :", error);
    }
  }

  /**
   * Passe au film suivant après qu'une carte soit sortie de l'écran.
   *
   * ORDRE IMPORTANT (corrige le bug "les films swipés reviennent") :
   *   1. On affiche IMMÉDIATEMENT le film suivant (déjà pré-chargé) → fluide.
   *   2. On enregistre le swipe et on ATTEND sa confirmation. Tant que le
   *      backend n'a pas reçu le swipe, il considère le film comme "non vu"
   *      et le re-proposerait (il renvoie toujours le film non-swipé le plus
   *      populaire). Il faut donc attendre AVANT de pré-charger le suivant.
   *   3. SEULEMENT APRÈS, on pré-charge le film d'après : le backend exclut
   *      désormais le film qu'on vient de swiper.
   *
   * NB : on ne recentre PAS la carte ici (pas de `position.setValue`). Ce
   * recentrage est fait par le `useLayoutEffect` déclenché par le changement
   * de `film` — sinon l'ancienne carte revient une fraction de seconde au
   * centre (voir le commentaire de ce useLayoutEffect).
   *
   * @param {string} status - le statut du swipe qui vient d'être validé
   */
  async function advanceDeck(status) {
    const swiped = film;
    const upcoming = nextFilm;

    // 1. Affichage instantané du film suivant (ou écran "plus de films").
    if (upcoming) {
      setFilm(upcoming);
      setNextFilm(null);
    } else {
      setFilm(null);
      setNoMoreFilms(true);
    }

    // 2. Enregistrement du swipe — on ATTEND qu'il soit bien pris en compte.
    if (swiped) await sendSwipeAndCheckMatch(swiped, status);

    // 3. Pré-chargement du film d'après (le film swipé est maintenant exclu).
    if (upcoming) prefetchNext(upcoming.id);
  }

  /**
   * Joue l'animation de sortie de la carte puis avance le deck.
   * @param {string} status - "like" | "dislike" | "seen"
   * @param {string} direction - "right" | "left" | "up"
   */
  function performSwipe(status, direction) {
    if (!film) return;
    // Cible hors écran selon la direction.
    const toValue =
      direction === "right"
        ? { x: SCREEN_W * 1.4, y: 0 }
        : direction === "left"
        ? { x: -SCREEN_W * 1.4, y: 0 }
        : { x: 0, y: -SCREEN_H };

    Animated.timing(position, {
      toValue,
      duration: 300,
      useNativeDriver: false, // on anime aussi des valeurs lues en JS (indicateurs)
    }).start(({ finished }) => {
      if (finished) advanceDeck(status);
    });
  }

  // On garde toujours la DERNIÈRE version de performSwipe accessible au
  // PanResponder (créé une seule fois plus bas).
  performSwipeRef.current = performSwipe;

  // ============================================================
  // PanResponder : la reconnaissance du geste de glissement
  // ============================================================
  const panResponder = useRef(
    PanResponder.create({
      // On ne "capture" le geste que s'il y a un vrai mouvement (> 8px).
      // Sinon, un simple tap passe aux boutons enfants (bande-annonce...).
      onMoveShouldSetPanResponder: (_e, gesture) =>
        Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,

      // Pendant le glissement : la carte suit le doigt.
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),

      // Au relâchement : on décide de l'action selon la direction dominante.
      onPanResponderRelease: (_e, gesture) => {
        const { dx, dy } = gesture;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absY > absX && dy < -SWIPE_THRESHOLD) {
          performSwipeRef.current("seen", "up");
        } else if (absX >= absY && dx > SWIPE_THRESHOLD) {
          performSwipeRef.current("like", "right");
        } else if (absX >= absY && dx < -SWIPE_THRESHOLD) {
          performSwipeRef.current("dislike", "left");
        } else {
          // Seuil non atteint : la carte revient au centre en douceur.
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 6,
          }).start();
        }
      },
    })
  ).current;

  // ============================================================
  // Interpolations : transformer la position (x,y) en styles
  // ============================================================
  // Rotation de la carte selon le décalage horizontal (max ±15°).
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ["-15deg", "0deg", "15deg"],
    extrapolate: "clamp",
  });
  // Opacité des 3 indicateurs (apparaissent en glissant dans leur direction).
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const dislikeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const seenOpacity = position.y.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // ============================================================
  // Handlers des overlays
  // ============================================================
  /**
   * Applique de nouveaux filtres et les sauvegarde (déclenche le rechargement).
   * @param {Object} newFilters - les filtres choisis dans le panneau
   */
  function handleApplyFilters(newFilters) {
    setFilters(newFilters);
    saveFilters(newFilters);
  }

  /**
   * Injecte un film choisi dans la recherche sur la carte (pour le swiper).
   * @param {Object} selectedFilm - le film sélectionné
   */
  function handleSearchSelect(selectedFilm) {
    setFilm(selectedFilm);
    // (le recentrage de la carte est géré par le useLayoutEffect sur `film`)
    setNoMoreFilms(false);
  }

  const filterCount = countActiveFilters(filters);

  // --- Injection des boutons loupe + filtres DANS le header partagé ---
  // Plutôt qu'une barre sous le header (qui mangeait de la hauteur), on place
  // ces actions au même niveau que le logo et le menu hamburger, comme le web.
  // `navigation.setOptions({ header })` remplace le header POUR CET ÉCRAN
  // uniquement : les autres écrans gardent l'AppHeader standard.
  // On relance l'effet quand `filterCount` change pour rafraîchir le badge.
  useLayoutEffect(() => {
    navigation.setOptions({
      header: (props) => (
        <AppHeader
          {...props}
          // Home est l'écran d'accueil : pas de flèche de retour, même si la
          // pile contient un écran précédent (on force `back` à undefined).
          back={undefined}
          rightActions={
            <View style={styles.headerActions}>
              <Pressable
                style={styles.searchBtn}
                onPress={() => setIsSearchOpen(true)}
              >
                <Text style={styles.searchBtnText}>🔍</Text>
              </Pressable>
              <Pressable
                style={styles.filterBtn}
                onPress={() => setIsFilterOpen(true)}
                // Libellé d'accessibilité : l'icône seule ne dit pas son rôle
                // aux lecteurs d'écran, on le précise donc explicitement.
                accessibilityLabel="Filtres"
              >
                <Text style={styles.filterBtnIcon}>⚙</Text>
                {filterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{filterCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          }
        />
      ),
    });
  }, [navigation, filterCount]);

  // --- Les modales, regroupées pour les rendre dans chaque état ---
  const overlays = (
    <>
      <SearchOverlay
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleSearchSelect}
      />
      <FilterSheet
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
        availableGenres={availableGenres}
        availablePlateforms={availablePlateforms}
      />
      <MatchOverlay matchData={matchData} onClose={() => setMatchData(null)} />
    </>
  );

  // ============================================================
  // Rendu selon l'état : chargement / plus de films / swipe
  // ============================================================
  if (loading) {
    return (
      <View style={screenStyle}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
        {overlays}
      </View>
    );
  }

  if (noMoreFilms) {
    return (
      <View style={screenStyle}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>Tu as tout vu !</Text>
          <Text style={styles.emptyText}>
            Il n'y a plus de films à découvrir pour le moment.
          </Text>
        </View>
        {overlays}
      </View>
    );
  }

  return (
    <View style={screenStyle}>
      {/* Zone de la carte (prend tout l'espace restant) */}
      <View style={styles.cardZone}>
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Indicateur "Pas intéressé" (glissement gauche) */}
          <Animated.View
            style={[
              styles.indicator,
              styles.indicatorDislike,
              { opacity: dislikeOpacity },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.indicatorText, { color: COLORS.grisTexte }]}>
              ✕ Pas intéressé
            </Text>
          </Animated.View>

          {/* Indicateur "À voir" (glissement droite) */}
          <Animated.View
            style={[
              styles.indicator,
              styles.indicatorLike,
              { opacity: likeOpacity },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.indicatorText, { color: COLORS.corailVif }]}>
              ♥ À voir
            </Text>
          </Animated.View>

          {/* Indicateur "Déjà vu" (glissement haut) */}
          <Animated.View
            style={[
              styles.indicator,
              styles.indicatorSeen,
              { opacity: seenOpacity },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.indicatorText, { color: COLORS.ambreDore }]}>
              👁 Déjà vu
            </Text>
          </Animated.View>

          {film && <FilmCard film={film} />}
        </Animated.View>
      </View>

      {/* Les 3 boutons d'action sous la carte */}
      <View style={styles.actions}>
        {/* Pas intéressé */}
        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnDislike]}
            onPress={() => performSwipe("dislike", "left")}
          >
            <Text style={[styles.actionBtnIcon, { color: COLORS.corailVif }]}>
              ✕
            </Text>
          </Pressable>
          <Text style={[styles.actionLabel, { color: COLORS.corailVif }]}>
            Pas intéressé
          </Text>
        </View>

        {/* Déjà vu */}
        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSeen]}
            onPress={() => performSwipe("seen", "up")}
          >
            <Text style={[styles.actionBtnIcon, { color: COLORS.ambreDore }]}>
              👁
            </Text>
          </Pressable>
          <Text style={[styles.actionLabel, { color: COLORS.ambreDore }]}>
            Déjà vu
          </Text>
        </View>

        {/* À voir */}
        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnLike]}
            onPress={() => performSwipe("like", "right")}
          >
            <Text style={[styles.actionBtnIcon, { color: COLORS.vertMatch }]}>
              ♥
            </Text>
          </Pressable>
          <Text style={[styles.actionLabel, { color: COLORS.vertMatch }]}>
            À voir
          </Text>
        </View>
      </View>

      {overlays}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },

  // Actions injectées dans le header (loupe + filtres)
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm + 2,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: "rgba(123,92,255,0.3)",
    backgroundColor: "rgba(123,92,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    fontSize: 16,
  },
  filterBtn: {
    // Même gabarit carré 40x40 que la loupe (searchBtn) pour rester homogène.
    // `position: relative` sert d'ancrage au badge positionné en absolu.
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: "rgba(123,92,255,0.3)",
    backgroundColor: "rgba(123,92,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnIcon: {
    fontSize: 16,
    color: COLORS.violetNuit,
  },
  filterBadge: {
    // Badge compteur épinglé dans le coin haut-droit de l'icône.
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.violetNuit,
    alignItems: "center",
    justifyContent: "center",
    // Liseré couleur du fond pour détacher le badge du bouton.
    borderWidth: 2,
    borderColor: COLORS.noirCinema,
  },
  filterBadgeText: {
    fontFamily: FONTS.displayBold,
    fontSize: 11,
    color: COLORS.blancDoux,
  },

  // Zone + carte
  cardZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 420,
    flex: 1,
  },

  // Indicateurs de swipe
  indicator: {
    position: "absolute",
    top: 24,
    zIndex: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.input - 2,
    borderWidth: 3,
  },
  indicatorLike: {
    left: 20,
    borderColor: COLORS.corailVif,
    backgroundColor: "rgba(255,77,106,0.15)",
  },
  indicatorDislike: {
    right: 20,
    borderColor: COLORS.grisTexte,
    backgroundColor: "rgba(139,139,158,0.15)",
  },
  indicatorSeen: {
    alignSelf: "center",
    borderColor: COLORS.ambreDore,
    backgroundColor: "rgba(255,170,43,0.15)",
  },
  indicatorText: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
  },

  // États centrés (chargement / vide)
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.grisTexte,
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.blancDoux,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    textAlign: "center",
  },

  // Boutons d'action
  actions: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: SPACING.xl,
    marginTop: SPACING.md,
  },
  actionGroup: {
    alignItems: "center",
    gap: SPACING.sm + 2,
    width: 72,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: RADII.round,
    backgroundColor: COLORS.noirCarte,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionBtnDislike: {
    borderColor: "rgba(255,77,106,0.25)",
  },
  actionBtnSeen: {
    borderColor: "rgba(255,170,43,0.25)",
  },
  actionBtnLike: {
    borderColor: "rgba(46,224,161,0.25)",
  },
  actionBtnIcon: {
    fontSize: 26,
  },
  actionLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    textAlign: "center",
  },
});
