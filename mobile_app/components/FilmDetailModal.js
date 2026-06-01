import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import FilmCard from "./FilmCard";
import StarRating from "./StarRating";
import RatingPrompt from "./RatingPrompt";
import Avatar from "./Avatar";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * FilmDetailModal — fiche complète d'un film dans une modale (version mobile).
 *
 * Port de `frontend/src/components/FilmDetailModal.jsx`. Réutilise `FilmCard`
 * (en variante "detail") pour l'affiche + infos, dans une `ScrollView`.
 *
 * 3 contextes (comme le web) :
 *  1. Info pure (Ma liste / matchs) : aucune action.
 *  2. "Aussi aimé par" : si `friends` est fourni, on liste les amis.
 *  3. Filmothèque d'un ami : note de l'ami (read-only) + badge "mon statut" +
 *     2 actions si je n'ai jamais swipé ("Ajouter à ma watchlist" / "Déjà vu
 *     aussi" → RatingPrompt).
 *
 * Tous les params sociaux sont optionnels : la modale reste un info pur si on
 * ne passe que `film` et `onClose`.
 *
 * @param {Object} props
 * @param {Object|null} props.film - Le film (null = modale fermée)
 * @param {Function} props.onClose - Ferme la modale
 * @param {Array<{username,avatar}>} [props.friends] - Amis ayant aussi liké
 * @param {string} [props.friendName] - Pseudo de l'ami (filmothèque)
 * @param {number|null} [props.friendRating] - Note de l'ami (0,5-5)
 * @param {string|null} [props.myStatus] - Mon statut : "like"|"dislike"|"seen"|null
 * @param {Function} [props.onAddToWatchlist] - Clic "Ajouter à ma watchlist"
 * @param {Function} [props.onMarkAsSeen] - Appelée avec (film, rating|null)
 * @returns {JSX.Element|null} La modale ou null si pas de film
 */
export default function FilmDetailModal({
  film,
  onClose,
  friends = [],
  friendName,
  friendRating = null,
  myStatus = null,
  onAddToWatchlist,
  onMarkAsSeen,
}) {
  // Affiche-t-on le mini RatingPrompt (clic "Déjà vu aussi") ?
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  // true pendant l'appel API (bloque les doubles-clics).
  const [saving, setSaving] = useState(false);

  if (!film) return null;

  /**
   * Métadonnées du badge "mon statut" (ou null si rien à afficher).
   */
  function getMyStatusBadge() {
    if (myStatus === "like")
      return { label: "Dans ta watchlist", icon: "❤️", color: COLORS.corailVif };
    if (myStatus === "seen")
      return { label: "Tu l'as déjà vu", icon: "👁️", color: COLORS.ambreDore };
    if (myStatus === "dislike")
      return { label: "Pas pour toi", icon: "✕", color: COLORS.grisTexte };
    return null;
  }

  /**
   * Clic "Ajouter à ma watchlist" : délègue au parent (qui gère l'API + state).
   */
  async function handleAddToWatchlist() {
    if (!onAddToWatchlist || saving) return;
    setSaving(true);
    try {
      await onAddToWatchlist(film);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Validation du RatingPrompt : crée un swipe "seen" (avec ou sans note).
   * @param {number|null} rating
   */
  async function handleConfirmSeen(rating) {
    if (!onMarkAsSeen || saving) return;
    setSaving(true);
    try {
      await onMarkAsSeen(film, rating);
      setShowRatingPrompt(false);
    } finally {
      setSaving(false);
    }
  }

  // Contexte "filmothèque d'un ami" : au moins une prop sociale fournie.
  const isFriendShelfContext =
    friendRating !== null ||
    myStatus !== null ||
    !!onAddToWatchlist ||
    !!onMarkAsSeen;

  const myBadge = getMyStatusBadge();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* onPress vide : absorbe le tap pour ne pas fermer en cliquant dedans */}
        <Pressable style={styles.modal} onPress={() => {}}>
          {/* Bouton fermer */}
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* La carte film, en variante "detail" (hauteur propre). */}
            <FilmCard film={film} variant="detail" />

            {/* Section filmothèque : note ami + badge mon statut + actions. */}
            {isFriendShelfContext && (
              <View style={styles.shelf}>
                {/* Note de l'ami (read-only) */}
                {friendRating !== null && friendRating !== undefined && (
                  <View style={styles.shelfRow}>
                    <Text style={styles.shelfLabel}>
                      Note de {friendName || "ton ami"}
                    </Text>
                    <StarRating value={parseFloat(friendRating)} readOnly size={16} />
                  </View>
                )}

                {/* Badge "mon statut" si déjà swipé */}
                {myBadge && (
                  <View
                    style={[styles.myBadge, { borderColor: myBadge.color }]}
                  >
                    <Text style={styles.myBadgeIcon}>{myBadge.icon}</Text>
                    <Text style={[styles.myBadgeText, { color: myBadge.color }]}>
                      {myBadge.label}
                    </Text>
                  </View>
                )}

                {/* Actions si jamais swipé et RatingPrompt non affiché */}
                {myStatus === null && !showRatingPrompt && (
                  <View style={styles.shelfActions}>
                    {onAddToWatchlist && (
                      <Pressable
                        style={[styles.action, styles.actionLike]}
                        onPress={handleAddToWatchlist}
                        disabled={saving}
                      >
                        <Text style={styles.actionLikeText}>
                          ❤️ Ajouter à ma watchlist
                        </Text>
                      </Pressable>
                    )}
                    {onMarkAsSeen && (
                      <Pressable
                        style={[styles.action, styles.actionSeen]}
                        onPress={() => setShowRatingPrompt(true)}
                        disabled={saving}
                      >
                        <Text style={styles.actionSeenText}>
                          👁️ Je l'ai déjà vu aussi
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Mini stepper de notation (clic "Déjà vu aussi") */}
                {myStatus === null && showRatingPrompt && (
                  <RatingPrompt
                    title="Quelle note tu lui mets ?"
                    onSave={handleConfirmSeen}
                    onCancel={() => setShowRatingPrompt(false)}
                    saving={saving}
                  />
                )}
              </View>
            )}

            {/* Section "Aussi aimé par" (si des amis ont liké) */}
            {friends.length > 0 && (
              <View style={styles.friendsSection}>
                <Text style={styles.friendsTitle}>Aussi aimé par</Text>
                <View style={styles.friendsList}>
                  {friends.map((friend, index) => (
                    <View key={index} style={styles.friendChip}>
                      <Avatar
                        name={friend.avatar}
                        size={28}
                        fallbackLabel={friend.username}
                      />
                      <Text style={styles.friendChipName}>
                        {friend.username}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.modal,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    overflow: "hidden",
  },
  close: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 5,
    width: 34,
    height: 34,
    borderRadius: RADII.round,
    backgroundColor: "rgba(13,13,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: COLORS.blancDoux,
    fontSize: 16,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },

  // Section filmothèque
  shelf: {
    gap: SPACING.md,
  },
  shelfRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shelfLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  myBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    alignSelf: "flex-start",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    borderWidth: BORDERS.width,
  },
  myBadgeIcon: {
    fontSize: 14,
  },
  myBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
  },
  shelfActions: {
    gap: SPACING.sm,
  },
  action: {
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
    alignItems: "center",
    borderWidth: BORDERS.width,
  },
  actionLike: {
    backgroundColor: "rgba(255,77,106,0.12)",
    borderColor: "rgba(255,77,106,0.4)",
  },
  actionLikeText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.corailVif,
  },
  actionSeen: {
    backgroundColor: "rgba(255,170,43,0.12)",
    borderColor: "rgba(255,170,43,0.4)",
  },
  actionSeenText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.ambreDore,
  },

  // Section "Aussi aimé par"
  friendsSection: {
    gap: SPACING.sm,
  },
  friendsTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  friendsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs + 2,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.grisSombre,
  },
  friendChipName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.blancDoux,
  },
});
