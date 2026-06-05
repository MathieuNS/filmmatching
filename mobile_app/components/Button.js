import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, GRADIENTS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, glow } from "../constants/spacing";

/**
 * Button — bouton principal à dégradé du design system.
 *
 * Reproduit le `.form-button` du web (dégradé + lueur colorée +
 * coins arrondis). Le dégradé est configurable : par défaut "Connexion"
 * (violet → corail) comme les formulaires, mais on peut passer
 * `GRADIENTS.passion` pour le CTA de la landing, etc.
 *
 * La lueur sous le bouton reprend automatiquement la 1ʳᵉ couleur du
 * dégradé, pour rester cohérente avec lui.
 *
 * @param {Object} props
 * @param {string} props.title - le texte du bouton
 * @param {() => void} props.onPress - fonction appelée au clic
 * @param {string[]} [props.gradient=GRADIENTS.connexion] - couleurs du dégradé
 * @param {boolean} [props.disabled=false] - désactive le bouton (grisé, non cliquable)
 * @param {boolean} [props.loading=false] - affiche un spinner à la place du texte
 * @param {Object|Object[]} [props.style] - style supplémentaire du conteneur
 * @param {Object|Object[]} [props.textStyle] - style supplémentaire du texte
 * @returns {JSX.Element} Le bouton
 */
export default function Button({
  title,
  onPress,
  gradient = GRADIENTS.connexion,
  disabled = false,
  loading = false,
  style,
  textStyle,
}) {
  // On bloque le clic si le bouton est désactivé OU en cours de chargement
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      // La lueur prend la 1ʳᵉ couleur du dégradé (ex : violet pour "Connexion")
      style={({ pressed }) => [
        styles.container,
        glow(gradient[0]),
        // Léger retour visuel à l'appui (comme :active sur le web)
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          // Spinner natif pendant un chargement (ex : envoi du formulaire)
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.text, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADII.button,
    overflow: "hidden", // pour que le dégradé respecte les coins arrondis
  },
  gradient: {
    paddingVertical: SPACING.lg, // ~14-16px de hauteur de clic confortable
    paddingHorizontal: SPACING.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: FONTS.displaySemiBold, // Outfit 600, comme le web
    fontSize: 16,
    color: "#fff",
  },
  pressed: {
    opacity: 0.9, // léger assombrissement à l'appui
  },
  disabled: {
    opacity: 0.5, // grisé quand inactif
  },
});
