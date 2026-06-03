import { View, Text, Image, Pressable, StyleSheet } from "react-native";
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
 * `rightActions` permet à un écran d'injecter des boutons SPÉCIFIQUES à
 * droite, juste avant le menu hamburger (ex : la loupe + les filtres de la
 * page Home). Les écrans qui ne passent rien gardent simplement le menu.
 *
 * Bouton retour : React Navigation fournit la prop `back` (définie seulement
 * s'il y a un écran précédent dans la pile). Quand elle existe (ex : Friends,
 * MatchList ouverts depuis le menu), on affiche une flèche ← à gauche du logo.
 * Plutôt qu'un simple "retour en arrière" (`goBack`), la flèche ramène
 * directement à l'écran d'accueil `Home` (le swipe), pour un comportement
 * prévisible quel que soit le chemin emprunté. L'écran Home lui-même force
 * `back` à undefined → pas de flèche dessus.
 *
 * @param {Object} props
 * @param {Object} [props.route] - route active fournie par le navigateur
 * @param {Object} [props.navigation] - objet de navigation (pour goBack)
 * @param {Object} [props.back] - présent s'il y a un écran précédent
 * @param {React.ReactNode} [props.rightActions] - boutons optionnels à droite
 * @returns {JSX.Element} La barre d'en-tête
 */
export default function AppHeader({ route, navigation, back, rightActions }) {
  // On ajoute la hauteur de la zone "sûre" du haut (barre d'état / encoche)
  // au padding, pour que le header ne soit pas caché dessous.
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      {/* --- Bouton retour (si on peut revenir en arrière) + logo --- */}
      <View style={styles.logoRow}>
        {back && (
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.navigate("Home")}
            hitSlop={8}
            accessibilityLabel="Retour à l'accueil"
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        )}
        <Image
          style={styles.logoIcon}
          source={require("../assets/filmmatching-icon.png")}
          resizeMode="contain"
        />
        <GradientText
          colors={GRADIENTS.passion}
          style={styles.logoText}
          // 1 seule ligne : si la place manque (petit écran), le nom se tronque
          // proprement au lieu de DÉBORDER sous la loupe/les filtres.
          numberOfLines={1}
        >
          FilmMatching
        </GradientText>
      </View>

      {/* --- Cluster de droite : actions optionnelles + menu hamburger --- */}
      <View style={styles.rightCluster}>
        {rightActions}
        <HamburgerMenu currentRouteName={route?.name} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // logo à gauche, menu à droite
    paddingHorizontal: SPACING.lg, // resserré (xl->lg) pour libérer de la place
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.noirCinema,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    // Permet au logo de se rétrécir si les actions de droite prennent de la
    // place, au lieu de pousser le hamburger hors de l'écran.
    flexShrink: 1,
    // minWidth:0 est INDISPENSABLE : sans ça, un enfant flex refuse de passer
    // sous sa largeur "naturelle" et le nom déborderait quand même.
    minWidth: 0,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.noirCarte,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
  },
  backIcon: {
    color: COLORS.blancDoux,
    fontSize: 18,
    fontFamily: FONTS.displayBold,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm + 2, // ~10px entre les boutons et le menu
    // Le cluster d'actions garde TOUJOURS sa taille : c'est le logo qui cède,
    // pas la loupe/les filtres/le menu.
    flexShrink: 0,
  },
  logoIcon: {
    width: 28,
    height: 28,
  },
  logoText: {
    fontFamily: FONTS.displayExtraBold,
    fontSize: 20,
    // Autorise le texte à se rétrécir à l'intérieur de logoRow (sinon il garde
    // sa largeur intrinsèque et chevauche le cluster de droite).
    flexShrink: 1,
  },
});
