import { View, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { RADII, SPACING, BORDERS, SHADOWS } from "../constants/spacing";

/**
 * Card — conteneur "carte" du design system (fond sombre, coins
 * arrondis, fine bordure et ombre douce).
 *
 * Reproduit le `.form-container` / les cartes du web :
 * fond `noirCarte`, rayon 20, bordure quasi invisible, ombre noire.
 * C'est la brique de base pour regrouper du contenu (formulaires,
 * sections, panneaux...).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - contenu à afficher dans la carte
 * @param {Object|Object[]} [props.style] - style supplémentaire (padding custom, etc.)
 * @returns {JSX.Element} La carte
 */
export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.card,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    padding: SPACING.xxl, // espacement intérieur confortable par défaut
    ...SHADOWS.card, // ombre douce sous la carte
  },
});
