import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import Avatar from "./Avatar";
import StarRating from "./StarRating";
import CommentModal from "./CommentModal";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * Construit la ligne de récap "X amis sur Y ont noté".
 *
 * Trois cas (gestion du singulier/pluriel) :
 * - Tous ont noté : "3 amis ont noté ce film"
 * - Aucun n'a noté : "2 amis l'ont vu, sans note"
 * - Mixte : "3 amis sur 5 ont noté"
 *
 * @param {number} ratedCount - Nombre d'amis ayant donné une note
 * @param {number} seenCount - Nombre total d'amis ayant vu le film
 * @returns {string} La phrase de récap
 */
function getCountLine(ratedCount, seenCount) {
  if (ratedCount === 0) {
    if (seenCount === 1) return "1 ami l'a vu, sans note";
    return `${seenCount} amis l'ont vu, sans note`;
  }
  if (ratedCount === seenCount) {
    if (ratedCount === 1) return "1 ami a noté ce film";
    return `${ratedCount} amis ont noté ce film`;
  }
  const verbe = ratedCount === 1 ? "a" : "ont";
  return `${ratedCount} ami${ratedCount > 1 ? "s" : ""} sur ${seenCount} ${verbe} noté`;
}

/**
 * FriendRatingsSheet — bottom sheet détaillé des notes des amis (mobile).
 *
 * Port de `frontend/src/components/FriendRatingsSheet.jsx`. Sur le web, ce
 * composant utilisait `createPortal` pour s'extraire de la carte ; sur mobile
 * on utilise simplement un `Modal` (qui passe déjà au-dessus de tout), donc
 * pas besoin de portal.
 *
 * Contenu : header (titre + film + ✕), moyenne héroïque, ligne de récap,
 * puis la liste des amis (avatar + pseudo + étoiles, ou "Vu, sans note"),
 * avec une pastille 💬 qui ouvre le commentaire de l'ami en lecture seule.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Si true, la feuille est visible
 * @param {Function} props.onClose - Ferme la feuille
 * @param {Object|null} props.friendRatings - { average, friends: [...] } ou null
 * @param {string} [props.filmTitle] - Titre du film (affiché en header)
 * @returns {JSX.Element|null} Le bottom sheet ou null
 */
export default function FriendRatingsSheet({
  isOpen,
  onClose,
  friendRatings,
  filmTitle,
}) {
  // Ami dont on consulte le commentaire (null = aucune modale ouverte).
  // ⚠️ Le useState doit être avant tout return conditionnel (règle des Hooks).
  const [viewingCommentFriend, setViewingCommentFriend] = useState(null);

  if (!isOpen || !friendRatings) return null;

  const { average, friends } = friendRatings;
  // Compteurs dérivés du payload.
  const ratedCount = friends.filter((f) => f.rating !== null).length;
  const seenCount = friends.length;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop : clic dessus ferme la feuille */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Le panneau, ancré en bas. onPress vide pour absorber le tap. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Poignée visuelle (mimétique des bottom sheets natifs) */}
          <View style={styles.handle} />

          {/* Header : label + titre du film + croix */}
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.label}>Tes amis ont noté</Text>
              {filmTitle && <Text style={styles.title}>{filmTitle}</Text>}
            </View>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body}>
            {/* Hero : la moyenne en grand (seulement si au moins un ami a noté) */}
            {average !== null && (
              <View style={styles.hero}>
                <StarRating value={average} readOnly size={28} showScore={false} />
                <Text style={styles.heroNumber}>{average}/5</Text>
              </View>
            )}

            {/* Ligne de récap */}
            <Text style={styles.count}>{getCountLine(ratedCount, seenCount)}</Text>

            {/* Liste détaillée : un ami par ligne */}
            <View style={styles.list}>
              {friends.map((friend, index) => (
                <View key={`${friend.username}-${index}`} style={styles.row}>
                  <Avatar
                    name={friend.avatar}
                    size={32}
                    fallbackLabel={friend.username}
                  />
                  <Text style={styles.username}>{friend.username}</Text>

                  {/* Note (étoiles) ou mention "Vu, sans note" */}
                  {friend.rating !== null ? (
                    <StarRating value={friend.rating} readOnly size={14} />
                  ) : (
                    <Text style={styles.unrated}>Vu, sans note</Text>
                  )}

                  {/* Pastille commentaire (si l'ami en a laissé un) */}
                  {friend.comment && (
                    <Pressable
                      style={styles.commentBtn}
                      onPress={() => setViewingCommentFriend(friend)}
                      hitSlop={6}
                    >
                      <Text style={styles.commentBtnText}>💬</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* Modale du commentaire de l'ami sélectionné (lecture seule). */}
      <CommentModal
        swipe={
          viewingCommentFriend
            ? {
                comment: viewingCommentFriend.comment,
                film: { title: filmTitle || "" },
              }
            : null
        }
        onClose={() => setViewingCommentFriend(null)}
        readOnly
        authorName={viewingCommentFriend?.username}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end", // ancre la feuille en bas
  },
  sheet: {
    backgroundColor: COLORS.noirCarte,
    borderTopLeftRadius: RADII.modal,
    borderTopRightRadius: RADII.modal,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    maxHeight: "75%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.grisMoyen,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  heading: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  label: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: COLORS.blancDoux,
    marginTop: 2,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: RADII.round,
    backgroundColor: COLORS.grisSombre,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: COLORS.blancDoux,
    fontSize: 15,
  },
  body: {
    // ScrollView : laisse défiler la liste si elle est longue
  },
  hero: {
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  heroNumber: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: COLORS.violetNuit,
  },
  count: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.grisTexte,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  list: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: BORDERS.width,
    borderTopColor: BORDERS.color,
  },
  username: {
    flex: 1, // pousse les étoiles / la pastille à droite
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  unrated: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
    fontStyle: "italic",
  },
  commentBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  commentBtnText: {
    fontSize: 16,
  },
});
