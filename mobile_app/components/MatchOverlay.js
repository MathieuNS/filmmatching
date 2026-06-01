import { useEffect, useRef } from "react";
import { View, Text, Image, Pressable, Modal, Animated, StyleSheet } from "react-native";
import { COLORS, GRADIENTS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING } from "../constants/spacing";
import GradientText from "./GradientText";
import Avatar from "./Avatar";

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

  // Quand un match arrive, on (re)lance l'animation d'apparition.
  useEffect(() => {
    if (matchData) {
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

  return (
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

            {/* Amis qui ont aussi liké (vrais avatars, repli lettre si besoin) */}
            <View style={styles.friends}>
              {friends.map((friend, index) => (
                <View key={index} style={styles.friend}>
                  <Avatar
                    name={friend.avatar}
                    size={52}
                    fallbackLabel={friend.username}
                  />
                  <Text style={styles.friendName}>{friend.username}</Text>
                </View>
              ))}
            </View>

            {/* Bouton de fermeture */}
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Continuer à swiper</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
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
  friendName: {
    fontFamily: FONTS.body,
    fontSize: 13,
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
  closeBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: COLORS.blancDoux,
    textAlign: "center",
  },
});
