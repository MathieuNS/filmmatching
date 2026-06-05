import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import GradientText from "./GradientText";
import Card from "./Card";
import { COLORS, GRADIENTS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

/**
 * AuthLayout — mise en page commune des écrans d'authentification.
 *
 * Reproduit la structure du web (`.form-page` + `.form-container`) :
 * plein écran sombre, carte centrée contenant le logo, un titre, un
 * sous-titre, puis le contenu de l'écran (champs, boutons, liens).
 *
 * Gère aussi le **clavier** : sur iOS, `KeyboardAvoidingView` remonte le
 * contenu quand le clavier s'ouvre ; le `ScrollView` permet de faire
 * défiler si le formulaire dépasse (petits écrans).
 *
 * @param {Object} props
 * @param {string} props.title - titre de l'écran (ex : "Connexion")
 * @param {string} [props.subtitle] - sous-titre optionnel
 * @param {React.ReactNode} props.children - contenu (champs, boutons, liens)
 * @returns {JSX.Element} La mise en page de l'écran d'auth
 */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        // "padding" sur iOS ; sur Android le redimensionnement natif suffit.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          // Laisse les boutons cliquables même quand le clavier est ouvert.
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.card}>
            {/* Logo en dégradé (comme le `.form-logo` du web) */}
            <GradientText colors={GRADIENTS.passion} style={styles.logo}>
              FilmMatching
            </GradientText>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {children}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1, // permet le centrage vertical tout en restant défilable
    justifyContent: "center",
    padding: SPACING.xl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  logo: {
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 28,
    color: COLORS.blancDoux,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    textAlign: "center",
    marginBottom: SPACING.xxl,
  },
});
