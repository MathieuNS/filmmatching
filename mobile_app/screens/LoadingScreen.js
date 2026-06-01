import { View, Image, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLORS, GRADIENTS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";
import GradientText from "../components/GradientText";

/**
 * LoadingScreen — écran de chargement affiché au démarrage.
 *
 * Tant que `bootstrapAuth` n'a pas fini de vérifier si l'utilisateur est
 * connecté (status "idle"/"loading"), on affiche le logo et un petit
 * indicateur d'activité, au lieu de faire clignoter le mauvais écran.
 *
 * @returns {JSX.Element} L'écran de chargement
 */
export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image
        style={styles.logo}
        source={require("../assets/filmmatching-icon.png")}
        resizeMode="contain"
      />
      <GradientText colors={GRADIENTS.passion} style={styles.title}>
        FilmMatching
      </GradientText>
      {/* Roue de chargement native, teintée corail (couleur d'accent) */}
      <ActivityIndicator
        color={COLORS.corailVif}
        style={styles.spinner}
        size="large"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.displayExtraBold,
    fontSize: 30,
  },
  spinner: {
    marginTop: SPACING.xxl,
  },
});
