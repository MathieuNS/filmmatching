import { View, Text, ScrollView, StyleSheet } from "react-native";
// useSafeAreaInsets : hook qui renvoie la taille des zones "système" (barre
// d'état en haut, barre de navigation en bas). On l'utilise au lieu de
// SafeAreaView car le contenu est dans une ScrollView : on ajoute la hauteur
// de la barre du bas au paddingBottom pour que le footer ne passe pas dessous.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StaticScreenHeader from "../components/StaticScreenHeader";
import TmdbAttribution from "../components/TmdbAttribution";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

/**
 * Contenu de la politique de confidentialité, sous forme de données.
 * Chaque section a un titre, des paragraphes et/ou une liste à puces.
 * On garde le même texte que la page web (`rgpd.jsx`).
 * @type {Array<{title: string, paragraphs?: string[], bullets?: string[]}>}
 */
const SECTIONS = [
  {
    title: "1. Introduction",
    paragraphs: [
      "La présente politique de confidentialité vous informe sur la manière dont vos données personnelles sont collectées, utilisées et protégées conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679).",
    ],
  },
  {
    title: "2. Responsable du traitement",
    paragraphs: [
      "Le responsable du traitement des données est le développeur de FilmMatching. Pour toute question relative à vos données personnelles, vous pouvez nous contacter via la page Contact.",
    ],
  },
  {
    title: "3. Données collectées",
    paragraphs: [
      "FilmMatching collecte uniquement les données nécessaires au fonctionnement du service :",
    ],
    bullets: [
      "Nom d'utilisateur — pour vous identifier auprès de vos amis",
      "Adresse email — pour la création de votre compte et la récupération d'accès",
      "Mot de passe — stocké sous forme chiffrée (hashé)",
      "Préférences de swipe — vos likes, dislikes et films déjà vus, nécessaires pour calculer les matchs",
      "Relations d'amitié — les liens entre votre compte et ceux de vos amis",
    ],
  },
  {
    title: "4. Pourquoi ces données sont collectées",
    paragraphs: ["Vos données sont utilisées exclusivement pour :"],
    bullets: [
      "Vous permettre de créer et gérer votre compte",
      "Afficher des films et séries à swiper",
      "Calculer les matchs entre vous et vos amis (films aimés en commun)",
      "Afficher votre liste de films likés et vos matchs",
    ],
  },
  {
    title: "5. Base légale du traitement",
    paragraphs: [
      "Le traitement de vos données repose sur votre consentement (article 6.1.a du RGPD), donné lors de la création de votre compte, ainsi que sur l'exécution du service (article 6.1.b) — les données sont nécessaires pour que l'application fonctionne.",
    ],
  },
  {
    title: "6. Partage des données",
    paragraphs: [
      "Vos données personnelles ne sont partagées avec aucun tiers. Seules les informations suivantes sont visibles par vos amis sur la plateforme :",
    ],
    bullets: [
      "Votre nom d'utilisateur",
      "Les films que vous avez likés en commun (matchs)",
    ],
  },
  {
    title: "7. Données tierces (TMDB)",
    paragraphs: [
      "Les informations sur les films et séries (titres, affiches, synopsis, etc.) proviennent de l'API de The Movie Database (TMDB). Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB. Aucune de vos données personnelles n'est transmise à TMDB.",
    ],
  },
  {
    title: "8. Durée de conservation",
    paragraphs: [
      "Vos données sont conservées tant que votre compte est actif. Si vous supprimez votre compte, toutes vos données personnelles (profil, swipes, relations d'amitié) sont supprimées définitivement et immédiatement de la base de données.",
    ],
  },
  {
    title: "9. Sécurité des données",
    paragraphs: [
      "FilmMatching met en place les mesures suivantes pour protéger vos données :",
    ],
    bullets: [
      "Mots de passe hashés",
      "Authentification par tokens à durée limitée",
      "Accès aux données protégé par authentification sur chaque requête API",
    ],
  },
  {
    title: "10. Vos droits",
    paragraphs: ["Conformément au RGPD, vous disposez des droits suivants :"],
    bullets: [
      "Droit d'accès — consulter les données que nous détenons sur vous (dans « Mon compte »)",
      "Droit de rectification — modifier vos informations personnelles",
      "Droit à l'effacement — supprimer votre compte et toutes les données associées",
      "Droit à la portabilité — récupérer vos données dans un format lisible",
      "Droit de retrait du consentement — vous pouvez à tout moment supprimer votre compte",
    ],
  },
  {
    title: "11. Cookies et stockage local",
    paragraphs: [
      "L'application ne dépose pas de cookies publicitaires. Seuls des tokens d'authentification sont stockés de façon sécurisée sur votre appareil pour maintenir votre session. Ces tokens sont supprimés lors de la déconnexion.",
    ],
  },
  {
    title: "12. Modifications de cette politique",
    paragraphs: [
      "Cette politique de confidentialité peut être mise à jour. La date de dernière modification est indiquée en haut de cette page. En cas de changement significatif, les utilisateurs en seront informés.",
    ],
  },
];

/**
 * RGPD — politique de confidentialité (mobile).
 *
 * Port de `frontend/src/pages/rgpd.jsx`. Affiche les sections légales dans
 * une `ScrollView`. Accessible connecté ou non (footer + StaticScreenHeader).
 *
 * @returns {JSX.Element} L'écran RGPD
 */
export default function RGPD() {
  // Hauteur des zones système. insets.bottom = hauteur de la barre de
  // navigation Android (0 si l'appareil n'en a pas).
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StaticScreenHeader title="Confidentialité" />

      <ScrollView
        // On combine le style de base + un paddingBottom dynamique : la marge
        // habituelle (SPACING.xl) PLUS la hauteur de la barre du bas. Comme
        // cette valeur dépend de l'appareil, elle ne peut pas vivre dans le
        // StyleSheet (calculée à l'exécution) — c'est l'usage prévu.
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
