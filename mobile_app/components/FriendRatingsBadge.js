import { useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import StarRating from "./StarRating";
import FriendRatingsSheet from "./FriendRatingsSheet";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING } from "../constants/spacing";

/**
 * FriendRatingsBadge — badge compact des notes des amis (mobile).
 *
 * Port de `frontend/src/components/FriendRatingsBadge.jsx`. Format ramassé
 * (★★★★☆ ›) destiné aux cartes de la page "Ma liste" (Phase 7). Au tap,
 * ouvre le même bottom sheet partagé que la section de la carte Home.
 *
 * Garde de bord : pas de payload OU des amis ont vu sans noter (average null)
 * → on n'affiche rien.
 *
 * @param {Object} props
 * @param {Object|null} props.friendRatings - { average, friends: [...] } ou null
 * @param {string} [props.filmTitle] - Titre du film (transmis au sheet)
 * @returns {JSX.Element|null} Le badge ou null
 */
export default function FriendRatingsBadge({ friendRatings, filmTitle }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!friendRatings || friendRatings.average === null) return null;

  const { average } = friendRatings;

  return (
    <>
      <Pressable style={styles.badge} onPress={() => setIsSheetOpen(true)}>
        <StarRating value={average} readOnly size={12} showScore={false} />
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(255,170,43,0.12)",
  },
  chevron: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    color: COLORS.ambreDore,
  },
});
