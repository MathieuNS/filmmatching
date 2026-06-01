import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * CommentModal — affichage / édition d'un commentaire sur un film (mobile).
 *
 * Port de `frontend/src/components/CommentModal.jsx`. Deux modes :
 *
 * - **Lecture seule** (`readOnly`) : voir le commentaire d'un ami. Affiche
 *   le texte + un bouton "Fermer". `onSave` n'est pas utilisée.
 * - **Édition** (défaut) : écrire/modifier son propre commentaire. Affiche
 *   un `TextInput` multiligne + "Annuler"/"Enregistrer".
 *
 * Le texte saisi est gardé dans un brouillon local (`draft`) pour ne
 * déclencher la sauvegarde qu'au clic sur "Enregistrer".
 *
 * @param {Object} props
 * @param {Object|null} props.swipe - { comment, film:{ title } } (null = fermé)
 * @param {Function} props.onClose - Fermer / annuler
 * @param {Function} [props.onSave] - Appelée avec le texte trimé (mode édition)
 * @param {boolean} [props.readOnly=false] - Affichage simple sans édition
 * @param {string} [props.authorName] - Pseudo de l'auteur (titre, mode lecture)
 * @returns {JSX.Element|null} La modale ou null si pas de swipe
 */
export default function CommentModal({
  swipe,
  onClose,
  onSave,
  readOnly = false,
  authorName,
}) {
  // Brouillon local du commentaire en cours d'édition.
  const [draft, setDraft] = useState("");
  // true pendant l'appel API (bloque les doubles-clics).
  const [saving, setSaving] = useState(false);

  // À chaque ouverture sur un nouveau film, on resynchronise le brouillon.
  useEffect(() => {
    if (swipe) {
      setDraft(swipe.comment || "");
    }
  }, [swipe]);

  // Pas de swipe → modale fermée.
  if (!swipe) return null;

  /**
   * Clic "Enregistrer" : appelle onSave avec le texte sans espaces superflus.
   */
  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
    } finally {
      setSaving(false);
    }
  }

  // Titre selon le mode (édition vs lecture seule avec/ sans auteur).
  const title = readOnly
    ? authorName
      ? `Commentaire de ${authorName}`
      : "Commentaire"
    : "Mon commentaire";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Fond cliquable : ferme la modale */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* onPress vide : absorbe le tap pour ne pas fermer en cliquant dedans */}
        <Pressable style={styles.modal} onPress={() => {}}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{swipe.film.title}</Text>

          {readOnly ? (
            // Lecture seule : texte tel quel (ou message si vide).
            <ScrollView style={styles.readonly}>
              {swipe.comment ? (
                <Text style={styles.readonlyText}>{swipe.comment}</Text>
              ) : (
                <Text style={styles.empty}>
                  Aucun commentaire laissé sur ce film.
                </Text>
              )}
            </ScrollView>
          ) : (
            <>
              <TextInput
                style={styles.textarea}
                placeholder="Ce que j'en ai pensé, une citation, une scène marquante..."
                placeholderTextColor={COLORS.grisTexte}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />
              {/* Compteur de caractères */}
              <Text style={styles.counter}>{draft.length} / 2000</Text>
            </>
          )}

          <View style={styles.actions}>
            {readOnly ? (
              <Pressable
                style={[styles.btn, styles.btnCancel, styles.btnFull]}
                onPress={onClose}
              >
                <Text style={styles.btnCancelText}>Fermer</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={[styles.btn, styles.btnCancel]}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.btnCancelText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnSave]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.btnSaveText}>
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
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
    padding: SPACING.xl,
  },
  modal: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.modal,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    padding: SPACING.xxl,
  },
  close: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: RADII.round,
    backgroundColor: COLORS.grisSombre,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: COLORS.blancDoux,
    fontSize: 16,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 19,
    color: COLORS.blancDoux,
    marginRight: 36, // laisse la place à la croix
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    marginTop: 2,
    marginBottom: SPACING.lg,
  },
  // Mode lecture seule
  readonly: {
    maxHeight: 220,
    backgroundColor: COLORS.grisSombre,
    borderRadius: RADII.input,
    padding: SPACING.md,
  },
  readonlyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.blancDoux,
    lineHeight: 20,
  },
  empty: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    fontStyle: "italic",
  },
  // Mode édition
  textarea: {
    minHeight: 120,
    maxHeight: 220,
    backgroundColor: COLORS.grisSombre,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
    padding: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  counter: {
    alignSelf: "flex-end",
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.grisTexte,
    marginTop: SPACING.xs,
  },
  // Boutons
  actions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
    alignItems: "center",
  },
  btnFull: {
    flex: 1,
  },
  btnCancel: {
    backgroundColor: COLORS.grisSombre,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
  },
  btnCancelText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  btnSave: {
    backgroundColor: COLORS.corailVif,
  },
  btnSaveText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: "#fff",
  },
});
