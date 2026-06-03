import { View, Text, Pressable, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { TMDB_LOGO_XML } from "../assets/logos/tmdbLogo";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

// Dimensions du logo TMDB (ratio du viewBox d'origine : 185.04 x 133.4).
// On reste TRÈS petit, comme le site web (height: 10px) : le logo doit être
// discret, posé à gauche de la mention légale. On part d'une hauteur fixe et
// on calcule la largeur pour garder les proportions d'origine.
const TMDB_LOGO_HEIGHT = 14;
const TMDB_LOGO_WIDTH = Math.round((TMDB_LOGO_HEIGHT * 185.04) / 133.4); // ≈ 19

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
      {/* Bloc TMDB : logo + texte CÔTE À CÔTE (comme le `__tmdb` du web).
          flexDirection: "row" met le logo à gauche et le texte à sa droite. */}
      <View style={styles.tmdbBlock}>
        {/* Logo officiel TMDB (SVG) */}
        <SvgXml
          xml={TMDB_LOGO_XML}
          width={TMDB_LOGO_WIDTH}
          height={TMDB_LOGO_HEIGHT}
        />

        {/* Mention légale TMDB. flex: 1 lui fait prendre la largeur restante
            (le logo garde sa taille) et passer à la ligne proprement. */}
        <Text style={styles.tmdbText}>
          Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par
          TMDB.
        </Text>
      </View>

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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    paddingVertical: SPACING.sm, // resserré pour que la page tienne à l'écran
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
    opacity: 0.4, // footer volontairement discret, comme le web
  },
  // Bloc logo + texte : en ligne, logo à gauche, centré verticalement.
  tmdbBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    maxWidth: 320, // borne la largeur pour que le texte passe à la ligne
  },
  tmdbText: {
    flex: 1, // prend la largeur restante à droite du logo (et wrap)
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.grisTexte,
    textAlign: "left", // aligné à gauche, collé au logo
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
  separator: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.grisMoyen,
  },
});
