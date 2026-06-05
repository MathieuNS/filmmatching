import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import StarRating from "./StarRating";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * Mappe une note (0,5 à 5) à un label émotionnel court.
 *
 * Donne un retour visuel immédiat : l'utilisateur voit la "signification"
 * de son choix. 5 paliers, comme sur le web.
 *
 * @param {number|null} rating - La note actuelle, ou null
 * @returns {string} Le label correspondant (ou "" si null)
 */
function getFeedbackLabel(rating) {
  if (rating === null || rating === undefined) return "";
  if (rating <= 1) return "Pas pour moi";
  if (rating <= 2) return "Mouais";
  if (rating <= 3) return "Pas mal";
  if (rating <= 4) return "Vraiment bien";
  return "Coup de cœur";
}

/**
 * RatingPrompt — mini formulaire de notation par étoiles (version mobile).
 *
 * Port de `frontend/src/components/RatingPrompt.jsx`. Affiche un titre, un
 * label émotionnel dynamique, 5 étoiles interactives, puis "Valider" et
 * un lien "Sans note". La note est gardée en local jusqu'à la validation :
 * `onSave(rating)` ou `onSave(null)` pour "Sans note".
 *
 * @param {Object} props
 * @param {Function} props.onSave - Appelée avec (rating | null) à la validation
 * @param {Function} [props.onCancel] - Appelée si l'utilisateur annule (croix)
 * @param {string} [props.title="Quelle note ?"] - Texte au-dessus des étoiles
 * @param {boolean} [props.saving=false] - true pendant l'appel API (bloque)
 * @returns {JSX.Element} Le composant de notation
 */
export default function RatingPrompt({
  onSave,
  onCancel,
  title = "Quelle note ?",
  saving = false,
}) {
  // La note choisie (null = pas encore notée).
  const [rating, setRating] = useState(null);
  const feedbackLabel = getFeedbackLabel(rating);

  /**
   * Valide la note choisie (ne fait rien si aucune note).
   */
  function handleSave() {
    if (rating === null) return;
    onSave(rating);
  }

  return (
    <View style={styles.prompt}>
      {/* Croix d'annulation (si fournie) */}
      {onCancel && (
        <Pressable
          style={styles.cancel}
          onPress={onCancel}
          disabled={saving}
          hitSlop={8}
        >
          <Text style={styles.cancelText}>✕</Text>
        </Pressable>
      )}

      <Text style={styles.title}>{title}</Text>

      {/* Label émotionnel dynamique (espace réservé même vide → pas de saut) */}
      <Text style={styles.feedback}>{feedbackLabel || " "}</Text>

      {/* Étoiles interactives (30px) */}
      <View style={styles.stars}>
        <StarRating value={rating} onChange={setRating} size={30} showScore={false} />
      </View>

      {/* Actions : Valider (corail) + Sans note (lien discret) */}
      <Pressable
        style={[
          styles.save,
          (rating === null || saving) && styles.saveDisabled,
        ]}
        onPress={handleSave}
        disabled={rating === null || saving}
      >
        <Text style={styles.saveText}>{saving ? "..." : "Valider"}</Text>
      </Pressable>
      <Pressable onPress={() => onSave(null)} disabled={saving} hitSlop={8}>
        <Text style={styles.skip}>Sans note</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.card,
    backgroundColor: COLORS.grisSombre,
    borderWidth: BORDERS.width,
    borderColor: "rgba(255,170,43,0.25)",
  },
  cancel: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: RADII.round,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: COLORS.grisTexte,
    fontSize: 15,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: COLORS.grisTexte,
    textTransform: "uppercase",
  },
  feedback: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.ambreDore,
    minHeight: 20,
  },
  stars: {
    marginVertical: SPACING.xs,
  },
  save: {
    backgroundColor: COLORS.corailVif,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.huge,
    borderRadius: RADII.button,
    alignSelf: "stretch",
    alignItems: "center",
  },
  saveDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: "#fff",
  },
  skip: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    paddingVertical: SPACING.xs,
  },
});
