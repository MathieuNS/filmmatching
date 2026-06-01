import { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { useDispatch } from "react-redux";
import { AuthLayout, Input, Button } from "../components";
import { login } from "../store/authSlice";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING } from "../constants/spacing";

/**
 * Login — écran de connexion (porté de Login_form.jsx du web).
 *
 * L'utilisateur saisit pseudo/email + mot de passe. Au submit, on
 * déclenche le thunk Redux `login`. En cas de succès, le `RootNavigator`
 * bascule AUTOMATIQUEMENT vers l'app (AppStack) car `isAuthenticated`
 * passe à true — donc pas de navigation manuelle ici.
 *
 * @param {Object} props
 * @param {Object} props.navigation - objet de navigation (React Navigation)
 * @returns {JSX.Element} L'écran de connexion
 */
export default function Login({ navigation }) {
  const dispatch = useDispatch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // État de chargement LOCAL (le bouton tourne sans démonter l'écran).
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Envoie les identifiants via le thunk login.
   * `.unwrap()` transforme un échec du thunk en exception qu'on attrape ici
   * pour afficher le message d'erreur renvoyé par le backend.
   */
  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await dispatch(login({ username, password })).unwrap();
      // Succès : rien à faire, le RootNavigator s'occupe de la bascule.
    } catch (message) {
      setError(typeof message === "string" ? message : "Erreur d'identifiants.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Connexion" subtitle="Retrouve tes matchs ciné">
      <Input
        placeholder="Pseudo ou email"
        value={username}
        onChangeText={setUsername}
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

      {/* Lien "mot de passe oublié" aligné à droite */}
      <Text style={styles.forgot} onPress={() => navigation.navigate("ForgotPassword")}>
        Mot de passe oublié ?
      </Text>

      {/* Message d'erreur sous le formulaire */}
      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title="Se connecter"
        onPress={handleSubmit}
        loading={submitting}
        style={styles.button}
      />

      <Text style={styles.link}>
        Pas encore de compte ?{" "}
        <Text style={styles.linkAccent} onPress={() => navigation.navigate("CreateLogin")}>
          Créer un compte
        </Text>
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.md,
  },
  forgot: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.violetNuit,
    textAlign: "right",
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
