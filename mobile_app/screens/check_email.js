import { Text, View, StyleSheet } from "react-native";
import { AuthLayout, Button } from "../components";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING, RADII, BORDERS } from "../constants/spacing";

/**
 * CheckEmail — écran affiché après la création d'un compte (porté de check_email.jsx).
 *
 * Écran statique : indique de vérifier sa boîte mail et de cliquer sur le
 * lien d'activation (géré par le site web). Donne quelques conseils (spam)
 * et un bouton pour aller à la connexion.
 *
 * @param {Object} props
 * @param {Object} props.navigation - objet de navigation (React Navigation)
 * @returns {JSX.Element} L'écran "Vérifie ta boîte mail"
 */
export default function CheckEmail({ navigation }) {
  return (
    <AuthLayout
      title="Vérifie ta boîte mail"
      subtitle="Un email de confirmation a été envoyé à ton adresse. Clique sur le lien dans l'email pour activer ton compte."
    >
      {/* Grande icône email */}
      <Text style={styles.icon}>✉️</Text>

      {/* Encart de conseils si l'email n'arrive pas */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>Tu ne trouves pas l'email ?</Text>
        <Text style={styles.tip}>• Vérifie ton dossier spam / indésirables</Text>
        <Text style={styles.tip}>• L'email peut mettre quelques minutes à arriver</Text>
      </View>

      {/* Incitation à ajouter des amis */}
      <Text style={styles.hint}>
        Une fois connecté, pense à ajouter tes amis pour découvrir les films et
        séries que vous aimez en commun !
      </Text>

      <Button
        title="Aller à la connexion"
        onPress={() => navigation.navigate("Login")}
        style={styles.button}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  tips: {
    backgroundColor: COLORS.grisSombre,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  tipsTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.blancDoux,
    marginBottom: SPACING.sm,
  },
  tip: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    lineHeight: 20,
  },
  hint: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  button: {
    marginTop: SPACING.sm,
  },
});
