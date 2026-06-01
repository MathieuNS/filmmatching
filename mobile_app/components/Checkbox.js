import { Pressable, View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

/**
 * Checkbox — case à cocher du design system (porte du `.form-checkbox` web).
 *
 * Une case carrée à gauche + un libellé à droite (qui peut contenir des
 * liens). Toute la ligne est cliquable. Cochée : fond violet + coche.
 *
 * @param {Object} props
 * @param {boolean} props.checked - état coché ou non
 * @param {(value: boolean) => void} props.onValueChange - appelé au clic avec le nouvel état
 * @param {React.ReactNode} props.children - libellé (texte, éventuellement avec des <Text> cliquables)
 * @returns {JSX.Element} La case à cocher
 */
export default function Checkbox({ checked, onValueChange, children }) {
  return (
    <Pressable style={styles.row} onPress={() => onValueChange(!checked)}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Text style={styles.check}>✓</Text>}
      </View>
      {/* Un seul <Text> parent : permet d'imbriquer des liens dedans. */}
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start", // la case reste alignée en haut du texte multi-lignes
    gap: 10,
    marginBottom: SPACING.md,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.grisMoyen,
    backgroundColor: COLORS.grisSombre,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  boxChecked: {
    backgroundColor: COLORS.violetNuit,
    borderColor: COLORS.violetNuit,
  },
  check: {
    color: "#fff",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    lineHeight: 16,
  },
  label: {
    flex: 1, // le libellé occupe le reste de la ligne (et passe à la ligne)
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
    lineHeight: 18,
  },
});
