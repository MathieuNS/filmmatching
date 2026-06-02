import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from "react-native";
import StaticScreenHeader from "../components/StaticScreenHeader";
import TmdbAttribution from "../components/TmdbAttribution";
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
 * @returns {JSX.Element} L'écran Donation
 */
export default function Donation() {
  return (
    <View style={styles.screen}>
      <StaticScreenHeader title="Soutenir le projet" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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

        <TmdbAttribution />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    alignItems: "center",
  },
  emoji: {
    fontSize: 40,
    color: COLORS.corailVif,
    marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: COLORS.blancDoux,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: SPACING.xl,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.card,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: "center",
    gap: SPACING.sm,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: COLORS.blancDoux,
    textAlign: "center",
  },
  cardText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 19,
  },
  tipeeeBtn: {
    width: "100%",
    backgroundColor: COLORS.corailVif,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.button,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  tipeeeBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 16,
    color: "#fff",
  },
  thanks: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 19,
    marginTop: SPACING.xl,
  },
});
