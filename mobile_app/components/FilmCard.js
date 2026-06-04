// React : useState (mémoire d'état), useEffect (réinitialiser au changement de film)
import { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  ScrollView,
  Linking,
  Dimensions,
  StyleSheet,
} from "react-native";
// LinearGradient : dégradé sombre en bas de l'affiche (impossible en pur RN)
import { LinearGradient } from "expo-linear-gradient";
// YoutubePlayer : lecteur YouTube dédié (s'appuie sur l'API officielle
// "IFrame Player" + react-native-webview). Bien plus fiable qu'une iframe
// faite main : il gère correctement l'origine, donc plus d'erreur 150/152
// "vidéo indisponible / regarder sur YouTube".
import YoutubePlayer from "react-native-youtube-iframe";
import FriendRatingsSection from "./FriendRatingsSection";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

// Dimensions du lecteur trailer : on remplit la largeur de la modale (largeur
// d'écran moins ses marges) et on garde le ratio vidéo 16:9. Le lecteur exige
// une hauteur en nombre (il ne s'étire pas en flex comme une View).
const { width: SCREEN_W } = Dimensions.get("window");
const TRAILER_WIDTH = SCREEN_W - SPACING.xl * 2;
const TRAILER_HEIGHT = Math.round((TRAILER_WIDTH * 9) / 16);

/**
 * ExpandableText — un texte tronqué à N lignes avec un lien "voir plus".
 *
 * Sur le web, la troncature se mesure en comparant la hauteur réelle du
 * texte à sa hauteur visible. En React Native, on n'a pas accès à ça :
 * on utilise l'événement `onTextLayout`, qui nous donne le nombre de
 * lignes que le texte OCCUPERAIT sans limite. Si ce nombre dépasse la
 * limite, c'est qu'il est tronqué → on affiche "voir plus".
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - le texte à afficher
 * @param {number} props.numberOfLines - nombre de lignes max quand replié
 * @param {Object|Object[]} [props.style] - style du texte
 * @returns {JSX.Element} Le texte + éventuellement le bouton voir plus
 */
function ExpandableText({ children, numberOfLines, style }) {
  // La section est-elle dépliée ?
  const [expanded, setExpanded] = useState(false);
  // Le texte dépasse-t-il la limite (donc "voir plus" utile) ?
  const [isTruncated, setIsTruncated] = useState(false);

  /**
   * Mesure le nombre de lignes au premier rendu (quand le texte est encore
   * limité). `lines.length` reflète les lignes effectivement affichées :
   * si elles atteignent la limite, on suppose qu'il y a (peut-être) plus.
   *
   * @param {Object} e - l'événement onTextLayout fourni par React Native
   */
  function handleTextLayout(e) {
    // On ne mesure qu'une fois, tant que la section est repliée.
    if (!expanded && !isTruncated) {
      const lines = e.nativeEvent.lines;
      if (lines.length >= numberOfLines) {
        setIsTruncated(true);
      }
    }
  }

  return (
    <View style={styles.section}>
      <Text
        style={style}
        // numberOfLines limite l'affichage quand replié ; 0 = illimité (déplié)
        numberOfLines={expanded ? 0 : numberOfLines}
        onTextLayout={handleTextLayout}
      >
        {children}
      </Text>
      {isTruncated && (
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          // hitSlop agrandit la zone tactile sans changer la taille visuelle
          hitSlop={8}
        >
          <Text style={styles.seeMore}>
            {expanded ? "voir moins" : "voir plus"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Hauteur (en px) d'UNE ligne de pastilles. Une pastille fait ~22px de haut ;
// on prend 28 pour englober une ligne complète sans rogner. La version
// tronquée est limitée à cette hauteur, et on considère qu'il y a débordement
// dès que le contenu réel dépasse 28 + 6px de tolérance (≈ une 2ᵉ ligne).
const ONE_LINE_HEIGHT = 28;

/**
 * ExpandablePills — une rangée de pastilles tronquée à UNE ligne, avec
 * un lien "voir plus" si le contenu déborde (ex : "Disponible sur ...").
 *
 * Contrairement au texte, on ne peut pas utiliser `numberOfLines` sur des
 * pastilles (ce sont des `View`). On MESURE donc la hauteur réelle du
 * contenu : on le rend une fois en "fantôme" invisible (positionné en
 * absolu, opacité 0) pour obtenir sa hauteur NON tronquée, qu'on compare à
 * la hauteur d'une ligne. S'il déborde, on affiche "voir plus" et on limite
 * la version visible à une ligne (maxHeight + overflow caché).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - le contenu (label + pastilles)
 * @returns {JSX.Element} La rangée dépliable
 */
function ExpandablePills({ children }) {
  const [expanded, setExpanded] = useState(false);
  // Hauteur réelle (non tronquée) du contenu, mesurée sur le "fantôme".
  const [fullHeight, setFullHeight] = useState(0);

  // Le contenu déborde-t-il d'une ligne ? (petite tolérance de 6px)
  const isTruncated = fullHeight > ONE_LINE_HEIGHT + 6;

  return (
    <View style={styles.section}>
      {/* Fantôme invisible : sert UNIQUEMENT à mesurer la hauteur complète.
          position absolute + opacity 0 → il ne prend pas de place et ne se
          voit pas, mais React Native le met quand même en page (donc onLayout
          renvoie sa vraie hauteur). pointerEvents none → il n'intercepte rien. */}
      <View style={styles.pillsMeasurer} pointerEvents="none">
        <View
          style={styles.pillsRow}
          onLayout={(e) => setFullHeight(e.nativeEvent.layout.height)}
        >
          {children}
        </View>
      </View>

      {/* Version visible : tronquée à une ligne tant qu'elle déborde et
          qu'on ne l'a pas dépliée. */}
      <View
        style={[
          styles.pillsRow,
          !expanded && isTruncated && styles.pillsRowCollapsed,
        ]}
      >
        {children}
      </View>

      {isTruncated && (
        <Pressable onPress={() => setExpanded((prev) => !prev)} hitSlop={8}>
          <Text style={styles.seeMore}>
            {expanded ? "voir moins" : "voir plus"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * getYoutubeId — extrait l'identifiant de la vidéo depuis l'URL d'embed.
 *
 * Le backend stocke `https://www.youtube.com/embed/KEY`. Le lecteur
 * `react-native-youtube-iframe` attend juste la KEY (l'identifiant vidéo),
 * pas l'URL complète. On la récupère avec une expression régulière.
 *
 * @param {string} embedUrl - URL embed (ex: https://www.youtube.com/embed/KEY)
 * @returns {string|null} L'identifiant vidéo, ou null si introuvable
 */
function getYoutubeId(embedUrl) {
  if (!embedUrl) return null;
  // match cherche le segment après "embed/" jusqu'au prochain "?", "&" ou "/".
  const match = embedUrl.match(/embed\/([^?&/]+)/);
  return match ? match[1] : null;
}

/**
 * FilmCard — Carte immersive d'un film/série (version mobile).
 *
 * Port du composant web `frontend/src/components/Film.jsx`. L'affiche
 * remplit la carte, un dégradé sombre la recouvre en bas, et toutes les
 * infos sont superposées par-dessus (style Netflix/Tinder).
 *
 * Deux modales s'ouvrent au besoin :
 * - le lecteur de bande-annonce (react-native-youtube-iframe),
 * - la liste "Où regarder" (plateformes cliquables).
 *
 * Deux variantes d'affichage via la prop `variant` :
 * - "swipe" (défaut) : la carte REMPLIT l'espace fourni par le parent
 *   (`flex:1`), comme sur l'écran de swipe.
 * - "detail" : la carte a une hauteur PROPRE (ratio d'affiche 2:3), pour
 *   être posée dans une modale/`ScrollView` (FilmDetailModal) où il n'y a
 *   pas de parent en `flex:1` qui lui donne une hauteur.
 *
 * @param {Object} props
 * @param {Object} props.film - les données du film (payload backend)
 * @param {"swipe"|"detail"} [props.variant="swipe"] - mode d'affichage
 * @returns {JSX.Element} La carte du film
 */
export default function FilmCard({ film, variant = "swipe" }) {
  // Affiche-t-on la modale bande-annonce ? la modale plateformes ?
  const [showTrailer, setShowTrailer] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);

  // Si le film change, on referme les modales (sécurité)
  useEffect(() => {
    setShowTrailer(false);
    setShowPlatforms(false);
  }, [film.id]);

  const isSerie = film.type === "Serie";
  // Les acteurs arrivent en tableau ; on les joint en une phrase lisible.
  const actorsText =
    film.main_actors && film.main_actors.length > 0
      ? film.main_actors.join(", ")
      : "";
  const plateforms = film.plateforms || [];
  const genres = film.genres || [];
  // Identifiant de la bande-annonce (null si le film n'en a pas).
  const youtubeId = getYoutubeId(film.trailer_url);

  // Notes des amis : payload du backend, affiché par FriendRatingsSection
  // (étoiles + bottom sheet détaillé au tap). Remplace le résumé texte de
  // la Phase 5.
  const friendRatings = film.friend_ratings;

  return (
    <View style={[styles.card, variant === "detail" && styles.cardDetail]}>
      {/* --- Affiche en fond --- */}
      <Image
        style={styles.image}
        source={{ uri: film.img }}
        resizeMode="cover"
      />

      {/* --- Dégradé sombre (transparent en haut -> noir en bas) --- */}
      <LinearGradient
        colors={[
          "transparent",
          "rgba(13,13,15,0.6)",
          "rgba(13,13,15,0.95)",
          COLORS.noirCinema,
        ]}
        // locations reproduit les pourcentages du dégradé web (20/45/70/100%)
        locations={[0.2, 0.45, 0.7, 1]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* --- Bloc d'infos superposé en bas --- */}
      <View style={styles.overlay}>
        {/* Ligne badge type + année */}
        <View style={styles.meta}>
          <View
            style={[
              styles.typeBadge,
              isSerie ? styles.typeBadgeSerie : styles.typeBadgeFilm,
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                { color: isSerie ? "#f472b6" : "#818cf8" },
              ]}
            >
              {film.type ? film.type.toUpperCase() : ""}
            </Text>
          </View>
          {film.release_year ? (
            <Text style={styles.year}>{film.release_year}</Text>
          ) : null}
        </View>

        {/* Titre (max 2 lignes) */}
        <Text style={styles.title} numberOfLines={2}>
          {film.title}
        </Text>

        {/* Notes des amis — section interactive (étoiles + bottom sheet) */}
        <FriendRatingsSection
          friendRatings={friendRatings}
          filmTitle={film.title}
        />

        {/* Boutons d'action : bande-annonce + où regarder */}
        <View style={styles.actionButtons}>
          {youtubeId ? (
            <Pressable
              style={[styles.actionBtn, styles.trailerBtn]}
              onPress={() => setShowTrailer(true)}
            >
              {/* numberOfLines={1} : le libellé ne se casse jamais en hauteur,
                  il se tronque (…) si la place manque vraiment. */}
              <Text
                style={[styles.actionBtnText, { color: COLORS.corailVif }]}
                numberOfLines={1}
              >
                ▶ Bande-annonce
              </Text>
            </Pressable>
          ) : null}
          {plateforms.length > 0 ? (
            <Pressable
              style={[styles.actionBtn, styles.platformsBtn]}
              onPress={() => setShowPlatforms(true)}
            >
              <Text
                style={[styles.actionBtnText, { color: COLORS.vertMatch }]}
                numberOfLines={1}
              >
                📺 Regarder
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Synopsis — 3 lignes max, dépliable */}
        {film.synopsis ? (
          <ExpandableText numberOfLines={3} style={styles.synopsis}>
            {film.synopsis}
          </ExpandableText>
        ) : null}

        {/* Réalisateur */}
        {film.director ? (
          <Text style={styles.director}>
            <Text style={styles.label}>Réalisateur : </Text>
            {film.director}
          </Text>
        ) : null}

        {/* Acteurs — 1 ligne max, dépliable */}
        {actorsText ? (
          <ExpandableText numberOfLines={1} style={styles.actors}>
            <Text style={styles.label}>Acteurs : </Text>
            {actorsText}
          </ExpandableText>
        ) : null}

        {/* Genres (pills) */}
        {genres.length > 0 ? (
          <View style={styles.tagsRow}>
            {genres.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Plateformes (pills) — tronquées à une ligne avec "voir plus".
            On affiche juste les noms ici ; les logos + liens sont dans la
            modale "Où regarder". */}
        {plateforms.length > 0 ? (
          <ExpandablePills>
            <Text style={styles.label}>Disponible sur : </Text>
            {plateforms.map((plat, index) => (
              <View key={index} style={styles.platformPill}>
                <Text style={styles.platformPillText}>{plat.plateform}</Text>
              </View>
            ))}
          </ExpandablePills>
        ) : null}
      </View>

      {/* ============================================================
          MODALE BANDE-ANNONCE — lecteur YouTube dédié
          ------------------------------------------------------------
          On ne monte cette modale que si une bande-annonce existe.
          ============================================================ */}
      {youtubeId ? (
        <Modal
          visible={showTrailer}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTrailer(false)}
        >
          {/* Pressable en fond : un tap N'IMPORTE OÙ en dehors du lecteur
              ferme la modale (comme la modale « Où regarder »). */}
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowTrailer(false)}
          >
            {/* Pressable interne (onPress vide) : "absorbe" le tap pour qu'un
                clic SUR le lecteur ne referme pas la modale (équiv.
                stopPropagation du web). */}
            <Pressable style={styles.trailerModal} onPress={() => {}}>
              <Pressable
                style={styles.modalClose}
                onPress={() => setShowTrailer(false)}
                hitSlop={8}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
              {/* play={showTrailer} : démarre la lecture quand la modale est
                  ouverte, et la stoppe quand elle se ferme. Le lecteur gère
                  lui-même l'origine → plus d'erreur "vidéo indisponible". */}
              <YoutubePlayer
                height={TRAILER_HEIGHT}
                width={TRAILER_WIDTH}
                play={showTrailer}
                videoId={youtubeId}
                // À la fin de la vidéo, on referme la modale.
                onChangeState={(state) => {
                  if (state === "ended") setShowTrailer(false);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {/* ============================================================
          MODALE "OÙ REGARDER" — plateformes cliquables
          ============================================================ */}
      <Modal
        visible={showPlatforms}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlatforms(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowPlatforms(false)}
        >
          {/* Pressable interne (onPress vide) : "absorbe" le tap pour qu'un clic
              DANS la modale ne la ferme pas (équiv. stopPropagation du web). */}
          <Pressable style={styles.platformsModal} onPress={() => {}}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setShowPlatforms(false)}
              hitSlop={8}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
            <Text style={styles.platformsModalTitle}>Où regarder</Text>
            <ScrollView style={styles.platformsList}>
              {plateforms.map((plat, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.platformLink,
                    !plat.link && styles.platformLinkDisabled,
                  ]}
                  // Ouvre le lien de la plateforme dans le navigateur/app externe.
                  // Linking est l'équivalent mobile d'un lien <a target="_blank">.
                  onPress={() => {
                    if (plat.link) Linking.openURL(plat.link);
                  }}
                >
                  {plat.logo ? (
                    <Image
                      style={styles.platformLogo}
                      source={{ uri: plat.logo }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.platformLogoPlaceholder}>
                      <Text style={styles.platformLogoPlaceholderText}>
                        {plat.plateform.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.platformName}>{plat.plateform}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ============================================================
   STYLES — traduction du Films.css web en StyleSheet
   ============================================================ */
const styles = StyleSheet.create({
  card: {
    flex: 1, // remplit l'espace fourni par le parent (l'écran Home)
    width: "100%",
    borderRadius: RADII.card,
    overflow: "hidden",
    backgroundColor: COLORS.noirCinema,
  },
  // Variante "détail" : hauteur propre (ratio d'affiche 2:3) au lieu de flex:1,
  // pour s'afficher dans une modale sans parent qui impose la hauteur.
  cardDetail: {
    flex: 0,
    aspectRatio: 2 / 3,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.xl,
    gap: SPACING.xs + 2, // ~6px, comme le gap web
  },

  // Section dépliable (texte + voir plus)
  section: {
    flexDirection: "column",
  },
  seeMore: {
    color: COLORS.violetNuit,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },

  // Ligne badge type + année
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm + 2, // ~10px
  },
  typeBadge: {
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADII.pill,
  },
  typeBadgeFilm: {
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  typeBadgeSerie: {
    backgroundColor: "rgba(236,72,153,0.25)",
  },
  typeBadgeText: {
    fontFamily: FONTS.displayBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  year: {
    color: "rgba(240,238,242,0.7)",
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
  },

  // Titre
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.blancDoux,
  },

  // Boutons d'action
  actionButtons: {
    flexDirection: "row",
    // Pas de `flexWrap` : les deux boutons restent côte à côte sur la même
    // ligne. S'ils manquent de place, ils rétrécissent (flexShrink ci-dessous)
    // au lieu de passer l'un sous l'autre.
    gap: SPACING.sm,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // Autorise le bouton à se réduire sous sa largeur naturelle quand la place
    // manque (sinon le 2e bouton serait poussé hors de la ligne).
    flexShrink: 1,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md, // resserré (~14px -> ~10px) pour gagner de la place
    borderRadius: RADII.pill,
    borderWidth: BORDERS.width,
  },
  trailerBtn: {
    backgroundColor: "rgba(255,77,106,0.12)",
    borderColor: "rgba(255,77,106,0.4)",
  },
  platformsBtn: {
    backgroundColor: "rgba(46,224,161,0.12)",
    borderColor: "rgba(46,224,161,0.4)",
  },
  actionBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },

  // Synopsis / réalisateur / acteurs
  synopsis: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(240,238,242,0.65)",
  },
  director: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "rgba(240,238,242,0.75)",
  },
  actors: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "rgba(240,238,242,0.75)",
  },
  label: {
    color: "rgba(240,238,242,0.5)",
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },

  // Genres (pills)
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: SPACING.xs + 2, // ~6px
    marginTop: 2,
  },
  tag: {
    backgroundColor: "rgba(123,92,255,0.15)",
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADII.pill,
  },
  tagText: {
    color: "#a5b4fc",
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
  },

  // Plateformes (pills)
  // Rangée de pastilles dépliable (utilisée par ExpandablePills)
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: SPACING.xs + 2,
    marginTop: 2,
  },
  // Version tronquée : limitée à une ligne, le surplus est masqué
  pillsRowCollapsed: {
    maxHeight: ONE_LINE_HEIGHT,
    overflow: "hidden",
  },
  // Fantôme de mesure : invisible et hors flux, juste pour lire la hauteur
  pillsMeasurer: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
  },
  platformPill: {
    backgroundColor: "rgba(46,224,161,0.12)",
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADII.pill,
  },
  platformPillText: {
    color: COLORS.vertMatch,
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
  },

  // --- Modales (commun) ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  modalClose: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: RADII.round,
    backgroundColor: "rgba(13,13,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: COLORS.blancDoux,
    fontSize: 16,
  },

  // Modale trailer (ratio 16:9)
  trailerModal: {
    // Se dimensionne au lecteur (qui a une largeur/hauteur fixes en 16:9).
    borderRadius: RADII.card,
    overflow: "hidden",
    backgroundColor: COLORS.noirCinema,
  },

  // Modale plateformes
  platformsModal: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.card,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    padding: SPACING.xxl,
  },
  platformsModalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 19,
    color: COLORS.blancDoux,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  platformsList: {
    flexGrow: 0,
  },
  platformLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.input,
    backgroundColor: COLORS.grisSombre,
    marginBottom: SPACING.sm,
  },
  platformLinkDisabled: {
    opacity: 0.5,
  },
  platformLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  platformLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(46,224,161,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  platformLogoPlaceholderText: {
    color: COLORS.vertMatch,
    fontSize: 18,
    fontFamily: FONTS.displayBold,
  },
  platformName: {
    color: COLORS.blancDoux,
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
  },
});
