import { View, Text, Pressable, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { TMDB_LOGO_XML } from "../assets/logos/tmdbLogo";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

// Dimensions du logo TMDB (ratio du viewBox d'origine : 185.04 x 133.4).
const TMDB_LOGO_WIDTH = 56;
const TMDB_LOGO_HEIGHT = Math.round((TMDB_LOGO_WIDTH * 133.4) / 185.04); // ≈ 40

/**
 * TmdbAttribution — footer global (version mobile).
 *
 * Port de `frontend/src/components/TmdbAttribution.jsx`. Affiche la mention
 * légale TMDB (obligatoire selon leurs conditions) + des liens discrets vers
 * les pages légales et la page de soutien. C'est le **point d'entrée** vers
 * RGPD / Mentions légales / Contact sur mobile (il n'y a pas de footer de
 * navigateur comme sur le web).
 *
 * La navigation passe par React Navigation (`useNavigation`) au lieu des
 * `<Link>` du web. Les noms de routes (RGPD, MentionsLegales, Contact,
 * Donation) existent dans l'AuthStack ET l'AppStack, donc le footer
 * fonctionne qu'on soit connecté ou non.
 *
 * Le logo officiel TMDB est rendu en SVG (`assets/logos/tmdbLogo.js`) via
 * `SvgXml`, au-dessus de la mention texte (Phase 9).
 *
 * @returns {JSX.Element} Le footer
 */
export default function TmdbAttribution() {
  const navigation = useNavigation();

  return (
    <View style={styles.footer}>
      {/* Logo officiel TMDB (SVG) */}
      <SvgXml
        xml={TMDB_LOGO_XML}
        width={TMDB_LOGO_WIDTH}
        height={TMDB_LOGO_HEIGHT}
      />

      {/* Mention légale TMDB */}
      <Text style={styles.tmdbText}>
        Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par
        TMDB.
      </Text>

      {/* Liens vers les pages légales / soutien */}
      <View style={styles.links}>
        <Pressable onPress={() => navigation.navigate("RGPD")} hitSlop={6}>
          <Text style={styles.link}>Politique de confidentialité</Text>
        </Pressable>
        <Text style={styles.separator}>·</Text>
        <Pressable
          onPress={() => navigation.navigate("MentionsLegales")}
          hitSlop={6}
        >
          <Text style={styles.link}>Mentions légales</Text>
        </Pressable>
        <Text style={styles.separator}>·</Text>
        <Pressable onPress={() => navigation.navigate("Contact")} hitSlop={6}>
          <Text style={styles.link}>Contact</Text>
        </Pressable>
        <Text style={styles.separator}>·</Text>
        <Pressable onPress={() => navigation.navigate("Donation")} hitSlop={6}>
          <Text style={[styles.link, styles.linkDonation]}>
            Soutenir le projet
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  tmdbText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 16,
  },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.xs + 2,
  },
  link: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.grisTexte,
  },
  linkDonation: {
    color: COLORS.corailVif,
  },
  separator: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.grisMoyen,
  },
});
