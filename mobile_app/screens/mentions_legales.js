import { View, Text, ScrollView, StyleSheet } from "react-native";
// Hook qui renvoie la taille des zones système (barre du bas, etc.). On ajoute
// insets.bottom au paddingBottom pour que le footer ne passe pas derrière les
// boutons du téléphone (le contenu est dans une ScrollView).
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StaticScreenHeader from "../components/StaticScreenHeader";
import TmdbAttribution from "../components/TmdbAttribution";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

/**
 * Contenu des mentions légales, sous forme de données (même texte que le web).
 * @type {Array<{title: string, paragraphs?: string[], bullets?: string[]}>}
 */
const SECTIONS = [
  {
    title: "1. Éditeur du site",
    paragraphs: ["Le site FilmMatching est édité par :"],
    bullets: ["Email de contact — contact@filmmatching.com"],
  },
  {
    title: "2. Hébergeur",
    paragraphs: ["Le site est hébergé par :"],
    bullets: ["Nom — Hostinger", "Site web — https://www.hostinger.com/"],
  },
  {
    title: "3. Propriété intellectuelle",
    paragraphs: [
      "Le code source de FilmMatching est la propriété de son auteur. Tous les éléments du site (textes, code, mise en page) sont protégés par le droit d'auteur.",
      "Les données sur les films et séries (titres, affiches, synopsis, etc.) proviennent de l'API de The Movie Database (TMDB) et sont la propriété de leurs ayants droit respectifs. Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.",
    ],
  },
  {
    title: "4. Données personnelles",
    paragraphs: [
      "La collecte et le traitement des données personnelles sont décrits dans notre politique de confidentialité.",
      "Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, rendez-vous sur la page « Mon compte » ou contactez-nous par email.",
    ],
  },
  {
    title: "5. Cookies et stockage local",
    paragraphs: ["FilmMatching n'utilise pas de cookies publicitaires."],
  },
  {
    title: "6. Limitation de responsabilité",
    paragraphs: [
      "FilmMatching est fourni « en l'état », sans garantie d'aucune sorte. L'éditeur ne saurait être tenu responsable des éventuels dysfonctionnements, interruptions de service ou inexactitudes dans les données affichées (provenant de TMDB).",
      "L'utilisateur est seul responsable de l'utilisation qu'il fait du service et de la confidentialité de ses identifiants de connexion.",
    ],
  },
  {
    title: "7. Droit applicable",
    paragraphs: [
      "Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.",
    ],
  },
];

/**
 * MentionsLegales — mentions légales (mobile).
 *
 * Port de `frontend/src/pages/mentions_legales.jsx`. Même structure que la
 * page RGPD (sections en ScrollView + footer). Accessible connecté ou non.
 *
 * @returns {JSX.Element} L'écran Mentions légales
 */
export default function MentionsLegales() {
  // Hauteur des zones système. insets.bottom = hauteur de la barre de
  // navigation du téléphone (0 si l'appareil n'en a pas).
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StaticScreenHeader title="Mentions légales" />

      <ScrollView
        // Style de base + paddingBottom dynamique (marge habituelle + hauteur
        // de la barre du bas) pour que le footer ne déborde pas dessous.
        contentContainerStyle={[
          styles.content,
          { paddingBottom: SPACING.xl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Dernière mise à jour : 9 mars 2026</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs?.map((p, i) => (
              <Text key={i} style={styles.text}>
                {p}
              </Text>
            ))}
            {section.bullets?.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

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
    // paddingBottom n'est PAS ici : il est calculé dans le composant
    // (SPACING.xl + insets.bottom) pour tenir compte de la barre du téléphone.
  },
  lastUpdated: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
    fontStyle: "italic",
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 17,
    color: COLORS.blancDoux,
    marginBottom: SPACING.sm,
  },
  text: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    lineHeight: 21,
    marginBottom: SPACING.sm,
  },
  bulletRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.xs + 2,
  },
  bulletDot: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.violetNuit,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    lineHeight: 21,
  },
});
