import { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * Input — champ de saisie du design system.
 *
 * Reproduit le `.form-input` du web : fond `grisSombre`, bordure
 * `grisMoyen`, coins arrondis (14) et, AU FOCUS, une bordure violette
 * avec une légère lueur. Comme le web, le placeholder est gris.
 *
 * Bonus mot de passe : si `secureTextEntry` est activé, un petit bouton
 * "œil" apparaît à droite pour afficher/masquer le texte (utile pour
 * les écrans de connexion / inscription en Phase 4).
 *
 * Toute prop non listée (ex : value, onChangeText, keyboardType,
 * autoCapitalize, placeholder...) est transmise telle quelle au
 * `<TextInput>` natif via `...rest`.
 *
 * @param {Object} props
 * @param {string} [props.placeholder] - texte indicatif quand le champ est vide
 * @param {boolean} [props.secureTextEntry=false] - masque le texte (mot de passe)
 * @param {Object|Object[]} [props.containerStyle] - style du conteneur extérieur
 * @param {Object|Object[]} [props.style] - style du champ texte lui-même
 * @returns {JSX.Element} Le champ de saisie
 */
export default function Input({
  placeholder,
  secureTextEntry = false,
  containerStyle,
  style,
  ...rest
}) {
  // Le champ a-t-il le focus ? (pour colorer la bordure comme sur le web)
  const [focused, setFocused] = useState(false);
  // Le mot de passe est-il visible ? (œil ouvert/fermé). Vrai = texte masqué.
  const [hidden, setHidden] = useState(true);

  // On masque réellement le texte seulement si c'est un mot de passe ET
  // que l'utilisateur n'a pas demandé à le voir.
  const isSecure = secureTextEntry && hidden;

  return (
    <View
      style={[
        styles.wrapper,
        focused && styles.wrapperFocused, // bordure + lueur au focus
        containerStyle,
      ]}
    >
      <TextInput
        style={[styles.input, secureTextEntry && styles.inputWithIcon, style]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.grisTexte} // placeholder gris, comme le web
        secureTextEntry={isSecure}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />

      {/* Bouton œil : présent uniquement pour les champs mot de passe */}
      {secureTextEntry && (
        <Pressable
          style={styles.eye}
          onPress={() => setHidden((prev) => !prev)} // bascule visible/masqué
          hitSlop={8} // agrandit la zone cliquable autour de l'icône
        >
          <Text style={styles.eyeText}>{hidden ? "👁" : "🙈"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row", // champ + œil sur une même ligne
    alignItems: "center",
    width: "100%",
    backgroundColor: COLORS.grisSombre,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
  },
  // État focus : on change UNIQUEMENT la couleur de bordure.
  // IMPORTANT : ne pas ajouter d'ombre ni d'`elevation` ici. Sur Android,
  // modifier l'`elevation` de la View parente d'un champ qui vient de prendre
  // le focus fait PERDRE le focus au TextInput → le curseur "saute" d'un champ
  // à l'autre en boucle et le clavier ne s'ouvre pas. La bordure suffit comme
  // retour visuel (et ne provoque aucun changement structurel de la vue).
  wrapperFocused: {
    borderColor: COLORS.violetNuit,
  },
  input: {
    flex: 1, // le champ prend toute la largeur dispo
    paddingVertical: SPACING.lg - 2, // ~14px
    paddingHorizontal: SPACING.lg,
    color: COLORS.blancDoux,
    fontFamily: FONTS.body, // Sora, comme le web
    fontSize: 15,
  },
  // Quand l'œil est présent, on laisse de la place à droite pour ne pas
  // que le texte passe sous l'icône.
  inputWithIcon: {
    paddingRight: SPACING.xs,
  },
  eye: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  eyeText: {
    fontSize: 18,
  },
});
