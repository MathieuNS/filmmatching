import { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { AuthLayout, Input, Button, Checkbox } from "../components";
import api from "../api/client";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

/**
 * CreateLogin — écran de création de compte (porté de Create_account_form.jsx).
 *
 * Saisie pseudo / email / mot de passe (+ confirmation) et 2 cases à cocher
 * (consentement RGPD obligatoire, notifications email optionnelles).
 * Au succès, on redirige vers `CheckEmail` : le compte n'est pas encore
 * actif, l'utilisateur doit cliquer sur le lien reçu par email (géré par
 * le site web, voir la décision projet).
 *
 * @param {Object} props
 * @param {Object} props.navigation - objet de navigation (React Navigation)
 * @returns {JSX.Element} L'écran de création de compte
 */
export default function CreateLogin({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Consentement RGPD (obligatoire pour activer le bouton)
  const [accepted, setAccepted] = useState(false);
  // Accepter les notifications email (optionnel)
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Valide la correspondance des mots de passe puis crée le compte.
   * Mappe les erreurs de champ renvoyées par l'API en messages lisibles.
   */
  async function handleSubmit() {
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne sont pas identiques.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/users/create/", {
        email,
        username,
        password,
        email_notifications: emailNotifications,
      });
      // Compte créé mais inactif -> on invite à vérifier sa boîte mail.
      navigation.navigate("CheckEmail");
    } catch (err) {
      // L'API renvoie un objet { champ: ["message"] } selon le champ fautif.
      const data = err.response?.data;
      if (data?.username) {
        setError("Ce pseudo est déjà pris.");
      } else if (data?.email) {
        setError("Cette adresse email est déjà utilisée.");
      } else if (data?.password) {
        setError("Le mot de passe est trop court ou trop simple.");
      } else {
        setError("Une erreur est survenue. Vérifie tes informations.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoins la communauté ciné">
      <Input
        placeholder="Pseudo"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={styles.field}
      />
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={styles.field}
      />
      <Input
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        containerStyle={styles.field}
      />
      <Input
        placeholder="Confirmer le mot de passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        containerStyle={styles.fieldLast}
      />

      {/* Consentement RGPD (obligatoire) avec liens vers les pages légales */}
      <Checkbox checked={accepted} onValueChange={setAccepted}>
        J'accepte la{" "}
        <Text style={styles.link} onPress={() => navigation.navigate("RGPD")}>
          politique de confidentialité
        </Text>{" "}
        et les{" "}
        <Text
          style={styles.link}
          onPress={() => navigation.navigate("MentionsLegales")}
        >
          mentions légales
        </Text>
      </Checkbox>

      {/* Notifications email (optionnel) */}
      <Checkbox
        checked={emailNotifications}
        onValueChange={setEmailNotifications}
      >
        J'accepte de recevoir des notifications par email
      </Checkbox>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title="Créer un compte"
        onPress={handleSubmit}
        loading={submitting}
        // Bouton désactivé tant que le consentement RGPD n'est pas coché.
        disabled={!accepted}
        style={styles.button}
      />

      <Text style={styles.bottomLink}>
        Déjà un compte ?{" "}
        <Text style={styles.linkAccent} onPress={() => navigation.navigate("Login")}>
          Se connecter
        </Text>
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.md,
  },
  fieldLast: {
    marginBottom: SPACING.lg,
  },
  // Lien inline dans le texte des cases à cocher (hérite de la taille du label)
  link: {
    color: COLORS.violetNuit,
    fontFamily: FONTS.bodyMedium,
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
  bottomLink: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    textAlign: "center",
    marginTop: SPACING.xl,
  },
  linkAccent: {
    color: COLORS.violetNuit,
    fontFamily: FONTS.bodyMedium,
  },
});
