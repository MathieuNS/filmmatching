import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
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
 * @param {Function} [props.onSwipe] - Contexte "À l'affiche" : appelée avec
 *   (film, status) où status vaut "like"|"seen"|"dislike". Si fournie, on
 *   affiche 3 boutons de swipe directs (au lieu du contexte filmothèque).
 * @param {string} [props.userStatus] - Mon statut actuel sur ce film (contexte
 *   affiche), pour surligner le bouton : "like"|"seen"|"dislike"|null
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
  onSwipe,
  userStatus = null,
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

  /**
   * Clic sur un des 3 boutons de swipe (contexte "À l'affiche").
   * Délègue au parent qui gère l'appel API + l'éventuel match.
   * @param {string} status - "like", "seen" ou "dislike"
   */
  async function handleSwipe(status) {
    if (!onSwipe || saving) return;
    setSaving(true);
    try {
      await onSwipe(film, status);
    } finally {
      setSaving(false);
    }
  }

  // Contexte "À l'affiche" : on affiche 3 boutons de swipe directs.
  const isAfficheContext = !!onSwipe;

  // Contexte "filmothèque d'un ami" : au moins une prop sociale fournie.
  const isFriendShelfContext =
    friendRating !== null ||
    myStatus !== null ||
    !!onAddToWatchlist ||
    !!onMarkAsSeen;

  const myBadge = getMyStatusBadge();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Conteneur plein écran qui centre la carte. */}
      <View style={styles.root}>
        {/* Fond sombre cliquable placé DERRIÈRE la carte (c'est un FRÈRE, pas un
            parent). Tap sur les marges = fermeture. Comme il n'enveloppe pas la
            carte, aucun Pressable ne vole le geste de scroll du synopsis (c'était
            la cause du synopsis non scrollable). Même principe que la modale
            bande-annonce. */}
        <Pressable style={styles.backdrop} onPress={onClose} />
        {/* La carte : une simple View (PAS un Pressable) → le ScrollView interne
            du synopsis garde son geste de défilement. */}
        <View style={styles.modal}>
          {/* Bouton fermer */}
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          {/* Contenu en colonne (PAS de ScrollView) : la carte remplit l'espace
              restant (flex:1) et les sections d'action prennent leur hauteur
              naturelle en dessous. Sans ScrollView parent, le scroll interne du
              synopsis (quand on déplie "voir plus") refonctionne comme sur Home. */}
          <View style={styles.content}>
            {/* La carte film, en variante "detail" : elle s'étire (flex:1). */}
            <FilmCard film={film} variant="detail" />

            {/* Contexte "À l'affiche" : 3 boutons de swipe directs.
                Le bouton correspondant à mon statut actuel est surligné. */}
            {isAfficheContext && (
              <View style={styles.afficheActions}>
                <Pressable
                  style={[
                    styles.afficheBtn,
                    styles.afficheLike,
                    userStatus === "like" && styles.afficheLikeActive,
                  ]}
                  onPress={() => handleSwipe("like")}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.afficheLikeText,
                      userStatus === "like" && styles.afficheTextActive,
                    ]}
                  >
                    ❤️ À voir
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.afficheBtn,
                    styles.afficheSeen,
                    userStatus === "seen" && styles.afficheSeenActive,
                  ]}
                  onPress={() => handleSwipe("seen")}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.afficheSeenText,
                      userStatus === "seen" && styles.afficheTextActive,
                    ]}
                  >
                    👁️ Déjà vu
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.afficheBtn,
                    styles.afficheDislike,
                    userStatus === "dislike" && styles.afficheDislikeActive,
                  ]}
                  onPress={() => handleSwipe("dislike")}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.afficheDislikeText,
                      userStatus === "dislike" && styles.afficheTextActive,
                    ]}
                  >
                    ✕ Zapper
                  </Text>
                </Pressable>
              </View>
            )}

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
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Conteneur plein écran : centre la carte, réserve une marge autour, et porte
  // l'assombrissement du fond (sur tout l'écran, marges comprises).
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  // Zone cliquable transparente derrière la carte : un tap dessus ferme la
  // modale. Elle ne fait que capter le tap (l'assombrissement est sur `root`).
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    // Hauteur fixe (et non maxHeight) : indispensable pour que la carte enfant
    // en flex:1 sache quelle place remplir. La carte s'adapte donc à l'écran.
    height: "90%",
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
  // Conteneur du contenu (colonne) : la carte (flex:1) remplit l'espace, les
  // sections d'action prennent leur hauteur naturelle dessous.
  content: {
    flex: 1,
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

  // Contexte "À l'affiche" : 3 boutons de swipe
  afficheActions: {
    gap: SPACING.sm,
  },
  afficheBtn: {
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
    alignItems: "center",
    borderWidth: BORDERS.width,
  },
  // Like (corail)
  afficheLike: {
    backgroundColor: "rgba(255,77,106,0.12)",
    borderColor: "rgba(255,77,106,0.4)",
  },
  afficheLikeActive: {
    backgroundColor: COLORS.corailVif,
    borderColor: COLORS.corailVif,
  },
  afficheLikeText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.corailVif,
  },
  // Seen (ambre)
  afficheSeen: {
    backgroundColor: "rgba(255,170,43,0.12)",
    borderColor: "rgba(255,170,43,0.4)",
  },
  afficheSeenActive: {
    backgroundColor: COLORS.ambreDore,
    borderColor: COLORS.ambreDore,
  },
  afficheSeenText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.ambreDore,
  },
  // Dislike (gris)
  afficheDislike: {
    backgroundColor: COLORS.grisSombre,
    borderColor: COLORS.grisMoyen,
  },
  afficheDislikeActive: {
    backgroundColor: COLORS.grisMoyen,
    borderColor: COLORS.grisTexte,
  },
  afficheDislikeText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.grisTexte,
  },
  // Texte blanc quand le bouton est actif (fond plein).
  afficheTextActive: {
    color: "#fff",
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
