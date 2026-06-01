import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

/**
 * Placeholder — écran générique "à venir".
 *
 * Pendant la phase 3 (navigation), beaucoup d'écrans ne sont pas
 * encore construits. On les branche tous sur ce composant temporaire
 * pour que la navigation fonctionne et soit testable dès maintenant.
 * À chaque phase suivante, on remplacera `component={Placeholder}` par
 * le vrai écran dans les fichiers de navigation.
 *
 * React Navigation passe automatiquement la prop `route` : on s'en sert
 * pour afficher le nom de l'écran courant.
 *
 * @param {Object} props
 * @param {Object} [props.route] - infos de route fournies par React Navigation
 * @returns {JSX.Element} Un écran centré affichant le nom de la route
 */
export default function Placeholder({ route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route?.name ?? "Écran"}</Text>
      <Text style={styles.subtitle}>Écran à venir</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: COLORS.blancDoux,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
  },
});
