import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING, BORDERS } from "../constants/spacing";

/**
 * StaticScreenHeader — en-tête minimal « ← + titre » des pages statiques.
 *
 * Les pages légales et de soutien (RGPD, Mentions légales, Contact, Donation)
 * n'utilisent PAS l'`AppHeader` (logo + menu) : sur le web, elles ont juste une
 * flèche retour, et elles doivent fonctionner aussi bien connecté (AppStack)
 * que déconnecté (AuthStack). On leur donne donc cet en-tête léger autonome.
 *
 * On gère soi-même la zone "sûre" du haut (encoche/barre d'état) via les
 * insets, car ces écrans tournent avec `headerShown: false`.
 *
 * Bouton retour : la flèche ramène à l'accueil `Home` (comportement voulu pour
 * ces pages secondaires). MAIS ces écrans existent aussi déconnecté (AuthStack),
 * pile dans laquelle « Home » n'existe pas — on n'y va donc QUE s'il fait
 * partie des écrans de la pile courante ; sinon on fait un simple retour arrière.
 *
 * @param {Object} props
 * @param {string} props.title - Le titre affiché à droite de la flèche
 * @returns {JSX.Element} L'en-tête
 */
export default function StaticScreenHeader({ title }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  /**
   * Gère le tap sur la flèche retour.
   *
   * `getState().routeNames` = la liste des écrans déclarés dans la pile où se
   * trouve cet écran. Si « Home » y est (cas connecté, AppStack), on y va ;
   * sinon (cas déconnecté, AuthStack) on revient à l'écran précédent.
   */
  const handleBack = () => {
    if (navigation.getState().routeNames.includes("Home")) {
      navigation.navigate("Home");
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      <Pressable
        style={styles.backBtn}
        onPress={handleBack}
        hitSlop={8}
        accessibilityLabel="Retour"
      >
        <Text style={styles.backIcon}>←</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.noirCinema,
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
  title: {
    flex: 1,
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    color: COLORS.blancDoux,
  },
});
