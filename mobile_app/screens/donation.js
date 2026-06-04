import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
// Hook qui renvoie la taille des zones système (barre du bas, etc.). On ajoute
// insets.bottom au paddingBottom pour que le contenu ne passe pas derrière les
// boutons du téléphone (l'écran remplit toute la hauteur, sans scroll).
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StaticScreenHeader from "../components/StaticScreenHeader";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

// Lien de la page Tipeee (ouvert dans le navigateur via Linking).
const TIPEEE_URL = "https://fr.tipeee.com/filmmatching/";

/**
 * Donation — page de soutien / don via Tipeee (mobile).
 *
 * Port de `frontend/src/pages/donation.jsx`. Explique pourquoi FilmMatching
 * est gratuit et invite à soutenir le projet. Le bouton ouvre la page Tipeee
 * dans le navigateur (`Linking.openURL`). Accessible connecté ou non.
 *
 * Mise en page : l'écran occupe TOUTE la hauteur sans défilement. Au lieu
 * d'une `ScrollView`, on utilise une `View` en `flex: 1`. Le contenu textuel
 * reste en haut, et le footer TMDB est poussé tout en bas grâce à
 * `marginTop: "auto"` (l'espace restant est absorbé au-dessus de lui).
 * Les tailles/espacements sont resserrés pour que tout tienne à l'écran.
 *
 * @returns {JSX.Element} L'écran Donation
 */
export default function Donation() {
  // Hauteur des zones système. insets.bottom = hauteur de la barre de
  // navigation du téléphone (0 si l'appareil n'en a pas).
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StaticScreenHeader title="Soutenir le projet" />

      {/* Conteneur plein écran (flex: 1) à la place de la ScrollView. Le
          paddingBottom suit la barre du bas du téléphone pour que le footer
          ne passe pas derrière les boutons système. */}
      <View
        style={[
          styles.content,
          { paddingBottom: SPACING.md + insets.bottom },
        ]}
      >
        {/* En-tête */}
        <Text style={styles.emoji}>♥</Text>
        <Text style={styles.title}>Tu m'offres un café ?</Text>
        <Text style={styles.subtitle}>
          FilmMatching est 100% gratuit. Le site et l'application mobile sont
          développés et maintenus par une seule personne sur son temps libre.
          Chaque don, chaque centime, est une énorme source de motivation.
        </Text>

        {/* Les 2 raisons de soutenir */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>💻</Text>
          <Text style={styles.cardTitle}>Un projet passion</Text>
          <Text style={styles.cardText}>
            Design, code, serveurs, support — tout est fait par une seule
            personne. Chaque don encourage à continuer le projet.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>⚡</Text>
          <Text style={styles.cardTitle}>Les coûts de fonctionnement</Text>
          <Text style={styles.cardText}>
            Hébergement, nom de domaine, base de données... Les dons permettent
            de couvrir ces frais et de garder FilmMatching gratuit pour tout le
            monde.
          </Text>
        </View>

        {/* Bouton CTA Tipeee */}
        <Pressable
          style={styles.tipeeeBtn}
          onPress={() => Linking.openURL(TIPEEE_URL)}
        >
          <Text style={styles.tipeeeBtnText}>Soutenir sur Tipeee</Text>
        </Pressable>

        {/* Remerciement */}
        <Text style={styles.thanks}>
          Merci du fond du cœur. Chaque contribution, même petite, fait une
          vraie différence.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
  },
  content: {
    flex: 1, // remplit toute la hauteur restante sous l'en-tête (plus de scroll)
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    alignItems: "center",
    // paddingBottom n'est PAS ici : il est calculé dans le composant
    // (SPACING.md + insets.bottom) pour tenir compte de la barre du téléphone.
  },
  emoji: {
    fontSize: 34,
    color: COLORS.corailVif,
    marginBottom: SPACING.xs,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.blancDoux,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.card,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: "center",
    gap: SPACING.xs,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: COLORS.blancDoux,
    textAlign: "center",
  },
  cardText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 17,
  },
  tipeeeBtn: {
    width: "100%",
    backgroundColor: COLORS.corailVif,
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  tipeeeBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: "#fff",
  },
  thanks: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 17,
    marginTop: SPACING.md,
  },
});
