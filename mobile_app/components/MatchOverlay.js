import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  Animated,
  ScrollView,
  StyleSheet,
} from "react-native";
import { COLORS, GRADIENTS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING } from "../constants/spacing";
import GradientText from "./GradientText";
import Avatar from "./Avatar";

// Nombre maximum d'amis affichés avec leur avatar. Au-delà, on remplace le
// surplus par une pastille "+N" (voir le bloc des amis plus bas). Évite que
// l'overlay déborde de l'écran quand BEAUCOUP d'amis likent le même film.
const MAX_VISIBLE_FRIENDS = 4;

/**
 * MatchOverlay — animation "It's a Match !".
 *
 * S'affiche par-dessus l'écran Home quand l'utilisateur "like" un film
 * qu'un (ou plusieurs) ami(s) a aussi liké. Reprend le visuel de l'overlay
 * de match déjà conçu sur la landing page, mais avec de VRAIS amis.
 *
 * NOTE (Phase 5) : on affiche un "avatar-lettre" (1ʳᵉ lettre du pseudo dans
 * une pastille dégradée) car les vraies images d'avatar ne sont pas encore
 * portées sur mobile (chantier Phase 6/8). Voir ROADMAP.
 *
 * @param {Object} props
 * @param {Object|null} props.matchData - { film: {img, title}, friends: [{username, avatar}] }
 * @param {Function} props.onClose - ferme l'overlay
 * @returns {JSX.Element|null} L'overlay, ou null s'il n'y a pas de match
 */
export default function MatchOverlay({ matchData, onClose }) {
  // Valeur d'animation pour l'effet "pop" (apparition en fondu + zoom).
  const anim = useRef(new Animated.Value(0)).current;

  // Ouverture/fermeture de la liste complète des amis (second modal), déclenchée
  // par un tap sur la pastille "+N".
  const [showAllFriends, setShowAllFriends] = useState(false);

  // Quand un match arrive, on (re)lance l'animation d'apparition.
  useEffect(() => {
    if (matchData) {
      // On repart toujours de l'overlay principal (liste refermée) pour un
      // nouveau match, sinon elle pourrait rester ouverte d'un match précédent.
      setShowAllFriends(false);
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }
  }, [matchData]);

  // Si pas de match, on ne rend rien (le Modal n'est pas monté).
  if (!matchData) return null;

  const { film, friends } = matchData;

  // On ne montre que les premiers amis (avatar + pseudo). `slice` renvoie un
  // sous-tableau sans modifier l'original. Le reste est compté pour la pastille.
  const visibleFriends = friends.slice(0, MAX_VISIBLE_FRIENDS);
  // Nombre d'amis "cachés" : 0 si tout le monde tient, sinon le surplus à résumer.
  const hiddenCount = friends.length - visibleFriends.length;

  return (
    <>
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Fond cliquable pour fermer */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Contenu animé (pop). Pressable interne sans onPress pour absorber
            le tap et éviter de fermer en cliquant sur le contenu. */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable onPress={() => {}}>
            <GradientText colors={GRADIENTS.match} style={styles.title}>
              It's a Match !
            </GradientText>
            <Text style={styles.subtitle}>Vous aimez le même film</Text>

            {/* Affiche du film matché */}
            <View style={styles.filmBlock}>
              <Image
                style={styles.filmImg}
                source={{ uri: film.img }}
                resizeMode="cover"
              />
              <Text style={styles.filmTitle}>{film.title}</Text>
            </View>

            {/* Amis qui ont aussi liké (vrais avatars, repli lettre si besoin).
                On limite à MAX_VISIBLE_FRIENDS ; au-delà → pastille "+N". */}
            <View style={styles.friends}>
              {visibleFriends.map((friend, index) => (
                <View key={index} style={styles.friend}>
                  <Avatar
                    name={friend.avatar}
                    size={52}
                    fallbackLabel={friend.username}
                  />
                  <Text style={styles.friendName}>{friend.username}</Text>
                </View>
              ))}

              {/* Pastille de résumé : n'apparaît que s'il reste des amis cachés.
                  Même gabarit (52px) que les avatars pour rester aligné.
                  Cliquable → ouvre la liste complète des amis (second modal). */}
              {hiddenCount > 0 && (
                <Pressable
                  style={styles.friend}
                  onPress={() => setShowAllFriends(true)}
                  // Le lecteur d'écran annonce l'action plutôt que juste "+5".
                  accessibilityRole="button"
                  accessibilityLabel={`Voir les ${friends.length} amis qui ont liké`}
                >
                  <View style={styles.moreBadge}>
                    <Text style={styles.moreBadgeText}>+{hiddenCount}</Text>
                  </View>
                  <Text style={styles.friendName}>autres</Text>
                </Pressable>
              )}
            </View>

            {/* Bouton de fermeture */}
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Continuer à swiper</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>

    {/* Second modal : la liste complète des amis ayant liké ce film.
        S'ouvre par-dessus l'overlay quand on tape sur la pastille "+N".
        La liste est déroulante (ScrollView) pour gérer n'importe quel nombre. */}
    <Modal
      visible={showAllFriends}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAllFriends(false)}
    >
      {/* Fond cliquable pour refermer juste cette liste (pas tout l'overlay). */}
      <Pressable
        style={styles.backdrop}
        onPress={() => setShowAllFriends(false)}
      >
        {/* Pressable interne sans onPress : absorbe le tap sur la carte. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>
            {friends.length} amis ont liké
          </Text>

          {/* Liste déroulante : un avatar + pseudo par ligne. */}
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
          >
            {friends.map((friend, index) => (
              <View key={index} style={styles.sheetRow}>
                <Avatar
                  name={friend.avatar}
                  size={44}
                  fallbackLabel={friend.username}
                />
                <Text style={styles.sheetRowName}>{friend.username}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Bouton de fermeture de la liste. */}
          <Pressable
            style={[styles.closeBtn, styles.sheetCloseBtn]}
            onPress={() => setShowAllFriends(false)}
          >
            <Text style={styles.closeBtnText}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(13,13,15,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  content: {
    alignItems: "center",
  },
  title: {
    fontFamily: FONTS.displayBlack,
    fontSize: 38,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.blancDoux,
    marginBottom: SPACING.xl,
    textAlign: "center",
  },
  filmBlock: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  filmImg: {
    width: 130,
    height: 195,
    borderRadius: RADII.input,
    borderWidth: 2,
    borderColor: COLORS.vertMatch,
  },
  filmTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: COLORS.blancDoux,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  friends: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  friend: {
    alignItems: "center",
    gap: SPACING.xs + 2,
  },
  // Pastille "+N" : même diamètre (52px) que les avatars pour rester aligné,
  // mais en fond gris discret (couleur "carte") pour ne pas voler la vedette
  // aux vrais avatars.
  moreBadge: {
    width: 52,
    height: 52,
    borderRadius: RADII.round,
    backgroundColor: COLORS.grisSombre,
    borderWidth: 1,
    borderColor: COLORS.grisMoyen,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBadgeText: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.blancDoux,
  },
  friendName: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.blancDoux,
  },
  // --- Liste complète des amis (second modal) ---
  // Carte centrée façon "modale", hauteur limitée pour rester à l'écran.
  sheet: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "70%",
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.grisMoyen,
    padding: SPACING.xl,
  },
  sheetTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: COLORS.blancDoux,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  // Zone déroulante : `flexShrink: 1` lui permet de RÉTRÉCIR à l'intérieur du
  // `maxHeight` de la carte → quand la liste est longue elle devient scrollable
  // et le bouton "Fermer" reste visible. `flexGrow: 0` l'empêche de s'étirer
  // inutilement quand il n'y a que quelques amis (la carte reste compacte).
  sheetScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetScrollContent: {
    gap: SPACING.md,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  sheetRowName: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.blancDoux,
  },
  closeBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADII.button,
    backgroundColor: COLORS.grisSombre,
    borderWidth: 1,
    borderColor: COLORS.grisMoyen,
  },
  // Espacement propre au bouton "Fermer" de la liste (séparé du bouton de
  // l'overlay principal, qui ne doit pas bouger).
  sheetCloseBtn: {
    marginTop: SPACING.lg,
  },
  closeBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: COLORS.blancDoux,
    textAlign: "center",
  },
});
