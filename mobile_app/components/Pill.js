import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * Pill — petite pastille / badge en forme de "gélule" (tag).
 *
 * Reproduit les badges du web (type "FILM"/"SÉRIE", statuts, compteurs) :
 * forme totalement arrondie (rayon 100), petit texte, fond translucide.
 *
 * Astuce couleur : on passe une seule couleur d'accent via `color`
 * (ex : ambre, corail) et, si on ne précise pas de fond, on en dérive
 * un fond translucide léger de la même teinte — comme sur le web.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - contenu (texte du badge)
 * @param {string} [props.label] - alternative à children pour un simple texte
 * @param {string} [props.color=COLORS.grisTexte] - couleur du texte / accent
 * @param {string} [props.backgroundColor] - fond personnalisé (sinon dérivé de color)
 * @param {Object|Object[]} [props.style] - style supplémentaire du conteneur
 * @param {Object|Object[]} [props.textStyle] - style supplémentaire du texte
 * @returns {JSX.Element} La pastille
 */
export default function Pill({
  children,
  label,
  color = COLORS.grisTexte,
  backgroundColor,
  style,
  textStyle,
}) {
  // Contenu : on accepte `label` (raccourci texte) ou `children` (libre)
  const content = label ?? children;

  return (
    <View
      style={[
        styles.pill,
        // Fond fourni, sinon une version translucide de la couleur d'accent
        { backgroundColor: backgroundColor ?? withAlpha(color, 0.15) },
        style,
      ]}
    >
      <Text style={[styles.text, { color }, textStyle]}>{content}</Text>
    </View>
  );
}

/**
 * withAlpha — transforme une couleur hexadécimale (#RRGGBB) en rgba(...)
 * avec une transparence donnée. Sert à créer le fond translucide du badge.
 *
 * @param {string} hex - couleur au format "#RRGGBB"
 * @param {number} alpha - opacité voulue (0 = transparent, 1 = opaque)
 * @returns {string} la couleur au format "rgba(r, g, b, alpha)"
 */
function withAlpha(hex, alpha) {
  // Si ce n'est pas un hex classique, on renvoie tel quel (sécurité)
  if (typeof hex !== "string" || hex[0] !== "#" || hex.length !== 7) {
    return hex;
  }
  // On découpe les 2 chiffres hexa de chaque canal et on les convertit en nombre
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start", // la pastille ne prend que sa largeur de contenu
    paddingVertical: SPACING.xs / 2, // ~2px
    paddingHorizontal: SPACING.md, // ~12px
    borderRadius: RADII.pill,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
  },
  text: {
    fontFamily: FONTS.displayBold, // Outfit 700, comme les badges du web
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
