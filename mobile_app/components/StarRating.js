import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

// Forme d'une étoile (même tracé `d` que le SVG du web, viewBox 0 0 24 24).
const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
// Couleurs des étoiles (identiques au web).
const EMPTY_COLOR = "#2A2A32"; // étoile vide (gris bordure)
const FILL_COLOR = COLORS.ambreDore; // étoile pleine (ambre doré)

/**
 * Une étoile unique : une étoile vide grise, recouverte d'une étoile
 * pleine dorée "coupée" horizontalement selon `fillPercent`.
 *
 * Sur le web la coupe se fait avec `clip-path: inset(...)`. En React
 * Native, on met l'étoile pleine dans une `View` de largeur réduite
 * avec `overflow:"hidden"` : tout ce qui dépasse est masqué → on ne
 * voit que la portion voulue (0 %, 50 % ou 100 %).
 *
 * @param {Object} props
 * @param {number} props.size - Taille de l'étoile en pixels
 * @param {number} props.fillPercent - Remplissage : 0, 50 ou 100
 * @returns {JSX.Element} L'étoile dessinée
 */
function Star({ size, fillPercent }) {
  return (
    <View style={{ width: size, height: size }}>
      {/* Étoile vide (fond) */}
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR_PATH} fill={EMPTY_COLOR} />
      </Svg>
      {/* Étoile pleine, coupée à `fillPercent` % via overflow hidden */}
      {fillPercent > 0 && (
        <View
          style={[
            styles.fillClip,
            { width: (size * fillPercent) / 100, height: size },
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d={STAR_PATH} fill={FILL_COLOR} />
          </Svg>
        </View>
      )}
    </View>
  );
}

/**
 * StarRating — notation par étoiles avec demi-étoiles (version mobile).
 *
 * Port du composant web `frontend/src/components/StarRating.jsx`.
 * Affiche 5 étoiles. En mode interactif, taper la MOITIÉ GAUCHE d'une
 * étoile donne une demi-note (ex : 3,5) et la moitié droite la note
 * entière (ex : 4). Retaper la même note l'efface (remet à null),
 * comme sur le web.
 *
 * Différence avec le web : pas de "hover" (pas de souris sur mobile),
 * et on calcule la moitié gauche/droite à partir de `locationX`
 * (position du tap à l'intérieur de l'étoile) au lieu de
 * `getBoundingClientRect`.
 *
 * @param {Object} props
 * @param {number|null} props.value - Note actuelle (0,5 à 5) ou null
 * @param {Function} [props.onChange] - Appelée avec la nouvelle note (interactif)
 * @param {boolean} [props.readOnly=false] - Si true, étoiles non cliquables
 * @param {number} [props.size=18] - Taille d'une étoile en pixels
 * @param {boolean} [props.showScore=true] - Afficher le texte "x/5" à droite
 * @returns {JSX.Element} La rangée d'étoiles (+ score optionnel)
 */
export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 18,
  showScore = true,
}) {
  // La note à afficher visuellement (0 si pas encore notée).
  const displayValue = value || 0;

  /**
   * Gère le tap sur une étoile : déduit demi/entier selon la position
   * horizontale du doigt, puis remonte la nouvelle note au parent.
   *
   * @param {Object} event - L'événement de press (donne nativeEvent.locationX)
   * @param {number} starIndex - L'index de l'étoile (1 à 5)
   */
  function handlePress(event, starIndex) {
    if (readOnly || !onChange) return;
    // locationX = position du tap DANS l'étoile (0 = bord gauche).
    const { locationX } = event.nativeEvent;
    const isLeftHalf = locationX < size / 2;
    const newValue = isLeftHalf ? starIndex - 0.5 : starIndex;
    // Retaper la même note l'efface (remet à null), comme sur le web.
    onChange(newValue === value ? null : newValue);
  }

  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((starIndex) => {
          // Remplissage de cette étoile : 100 % pleine, 50 % demie, 0 % vide.
          const fillPercent =
            displayValue >= starIndex
              ? 100
              : displayValue >= starIndex - 0.5
              ? 50
              : 0;

          // En lecture seule, pas de Pressable (juste l'affichage).
          if (readOnly) {
            return <Star key={starIndex} size={size} fillPercent={fillPercent} />;
          }

          return (
            <Pressable
              key={starIndex}
              onPress={(e) => handlePress(e, starIndex)}
            >
              <Star size={size} fillPercent={fillPercent} />
            </Pressable>
          );
        })}
      </View>

      {/* Score textuel "x/5" — seulement si une note existe et si demandé */}
      {showScore && value !== null && value !== undefined && (
        <Text style={[styles.score, { fontSize: Math.max(11, size * 0.7) }]}>
          {value}/5
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  // L'étoile pleine est positionnée par-dessus l'étoile vide et coupée.
  fillClip: {
    position: "absolute",
    top: 0,
    left: 0,
    overflow: "hidden",
  },
  score: {
    fontFamily: FONTS.bodyMedium,
    color: COLORS.ambreDore,
  },
});
