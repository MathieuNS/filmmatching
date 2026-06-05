import { View, Text, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { getAvatarXml } from "../utils/avatars";
import { GRADIENTS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII } from "../constants/spacing";

/**
 * Avatar — affiche l'avatar d'un utilisateur (version mobile).
 *
 * Le backend renvoie un NOM de fichier (ex : "avatar-reel.svg"). On
 * récupère le SVG correspondant via `getAvatarXml` et on le dessine
 * avec `SvgXml` (react-native-svg).
 *
 * Repli ("avatar-lettre") : si aucun SVG ne correspond (nom inconnu et
 * pas de défaut), on affiche une pastille dégradée avec la 1ʳᵉ lettre
 * du pseudo — comme le faisait provisoirement le MatchOverlay en Phase 5.
 *
 * @param {Object} props
 * @param {string} [props.name] - Nom du fichier avatar (ex : "avatar-popcorn.svg")
 * @param {number} [props.size=40] - Diamètre de l'avatar en pixels
 * @param {string} [props.fallbackLabel] - Pseudo, pour la lettre de repli
 * @returns {JSX.Element} L'avatar (SVG ou pastille-lettre)
 */
export default function Avatar({ name, size = 40, fallbackLabel = "" }) {
  // On tente de résoudre le SVG correspondant au nom donné.
  const xml = getAvatarXml(name);

  // Style commun : un cercle de `size` px (overflow caché par sécurité).
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: RADII.round,
    overflow: "hidden",
  };

  // Cas normal : on a un SVG → on le dessine à la taille demandée.
  if (xml) {
    return (
      <View style={containerStyle}>
        <SvgXml xml={xml} width={size} height={size} />
      </View>
    );
  }

  // Repli : pastille dégradée + 1ʳᵉ lettre du pseudo.
  const letter = fallbackLabel ? fallbackLabel.charAt(0).toUpperCase() : "?";
  return (
    <LinearGradient
      colors={GRADIENTS.connexion}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[containerStyle, styles.fallback]}
    >
      {/* On adapte la taille de la lettre à celle de l'avatar (~40%). */}
      <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
        {letter}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontFamily: FONTS.displayBold,
    color: "#fff",
  },
});
