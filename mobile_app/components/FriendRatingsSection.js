import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import StarRating from "./StarRating";
import FriendRatingsSheet from "./FriendRatingsSheet";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

/**
 * FriendRatingsSection — aperçu compact des notes des amis sur la carte film.
 *
 * Port de `frontend/src/components/FriendRatingsSection.jsx`. Affiche une
 * ligne « Tes amis ont noté : ★★★★☆ 4.2/5 · 3 amis › » qui, au tap, ouvre le
 * bottom sheet détaillé (`FriendRatingsSheet`).
 *
 * Garde de bord : si aucun ami n'a donné de NOTE (average null), on n'affiche
 * rien — la moyenne est l'info clé de la section.
 *
 * Note swipe : sur la carte Home, cette section est dans une `Animated.View`
 * avec un PanResponder. Comme ce dernier ne capture le geste qu'au-delà de
 * 8px de mouvement, un simple tap sur la section ouvre bien le sheet sans
 * déclencher de swipe.
 *
 * @param {Object} props
 * @param {Object|null} props.friendRatings - { average, friends: [...] } ou null
 * @param {string} [props.filmTitle] - Titre du film (transmis au sheet)
 * @returns {JSX.Element|null} La section ou null
 */
export default function FriendRatingsSection({ friendRatings, filmTitle }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Pas de données OU des amis ont vu sans noter → on n'affiche rien.
  if (!friendRatings || friendRatings.average === null) return null;

  const { average, friends } = friendRatings;
  const seenCount = friends.length;
  const countText = `${seenCount} ami${seenCount > 1 ? "s" : ""}`;

  return (
    <>
      <Pressable style={styles.section} onPress={() => setIsSheetOpen(true)}>
        <Text style={styles.label}>Tes amis ont noté : </Text>
        <StarRating value={average} readOnly size={13} showScore={false} />
        <Text style={styles.average}>{average}/5</Text>
        <Text style={styles.count}>· {countText}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <FriendRatingsSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        friendRatings={friendRatings}
        filmTitle={filmTitle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  label: {
    color: "rgba(240,238,242,0.5)",
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  average: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.ambreDore,
  },
  count: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
  },
  chevron: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.grisTexte,
  },
});
