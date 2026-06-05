import { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { AuthLayout, Input, Button } from "../components";
import api from "../api/client";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

/**
 * ForgotPassword — écran "Mot de passe oublié" (porté de forgot_password.jsx).
 *
 * L'utilisateur saisit son email ; l'API envoie un lien de réinitialisation
 * (qui ouvre le SITE WEB, voir la décision projet). Pour la sécurité, le
 * message de succès est le même que l'email existe ou non.
 *
 * @param {Object} props
 * @param {Object} props.navigation - objet de navigation (React Navigation)
 * @returns {JSX.Element} L'écran de demande de réinitialisation
 */
export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Envoie l'email à l'API pour déclencher l'envoi du lien de réinitialisation.
   */
  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await api.post("/api/users/forgot-password/", { email });
      setSuccess(res.data.message);
    } catch (err) {
      setError(
        err.response?.data?.error || "Une erreur est survenue. Réessaie plus tard."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Entre ton adresse email pour recevoir un lien de réinitialisation"
    >
      <Input
        placeholder="Ton adresse email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={styles.field}
      />

      {success && <Text style={styles.success}>{success}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title="Envoyer le lien"
        onPress={handleSubmit}
        loading={submitting}
        style={styles.button}
      />

      <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
        Retour à la connexion
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.md,
  },
  success: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.vertMatch,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  error: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.corailVif,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  button: {
    marginTop: SPACING.sm,
  },
  link: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.violetNuit,
    textAlign: "center",
    marginTop: SPACING.xl,
  },
});
