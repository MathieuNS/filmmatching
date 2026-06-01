import { View, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GradientText from "./GradientText";
import HamburgerMenu from "./HamburgerMenu";
import { COLORS, GRADIENTS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING, BORDERS } from "../constants/spacing";

/**
 * AppHeader — barre d'en-tête partagée des écrans connectés (AppStack).
 *
 * Logo FilmMatching à gauche, bouton/menu HamburgerMenu à droite.
 * Défini une seule fois et branché sur tous les écrans via les
 * `screenOptions` du navigateur, pour ne pas le réécrire par écran.
 *
 * React Navigation fournit la prop `route` (écran actuellement affiché) :
 * on transmet son nom au menu pour qu'il exclue la page courante.
 *
 * @param {Object} props
 * @param {Object} [props.route] - route active fournie par le navigateur
 * @returns {JSX.Element} La barre d'en-tête
 */
export default function AppHeader({ route }) {
  // On ajoute la hauteur de la zone "sûre" du haut (barre d'état / encoche)
  // au padding, pour que le header ne soit pas caché dessous.
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      {/* --- Logo (icône + nom en dégradé) --- */}
      <View style={styles.logoRow}>
        <Image
          style={styles.logoIcon}
          source={require("../assets/filmmatching-icon.png")}
          resizeMode="contain"
        />
        <GradientText colors={GRADIENTS.passion} style={styles.logoText}>
          FilmMatching
        </GradientText>
      </View>

      {/* --- Menu hamburger (reçoit le nom de la route pour s'auto-exclure) --- */}
      <HamburgerMenu currentRouteName={route?.name} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // logo à gauche, menu à droite
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.noirCinema,
    // Fine ligne en bas pour détacher le header du contenu
    borderBottomWidth: BORDERS.width,
    borderBottomColor: BORDERS.color,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  logoIcon: {
    width: 28,
    height: 28,
  },
  logoText: {
    fontFamily: FONTS.displayExtraBold,
    fontSize: 20,
  },
});
