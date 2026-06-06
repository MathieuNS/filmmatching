import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Linking,
  StyleSheet,
} from "react-native";
// Hook qui renvoie la taille des zones système (barre du bas, etc.). On ajoute
// insets.bottom au paddingBottom pour que le footer ne passe pas derrière les
// boutons du téléphone (le contenu est dans une ScrollView).
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StaticScreenHeader from "../components/StaticScreenHeader";
import Input from "../components/Input";
import Button from "../components/Button";
import TmdbAttribution from "../components/TmdbAttribution";
import { sendContact } from "../api/account";
import { getThrottleMessage } from "../api/throttle";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * Contact — formulaire de contact (mobile).
 *
 * Port de `frontend/src/pages/contact.jsx`. L'utilisateur remplit nom,
 * email, sujet et message ; à l'envoi, on POST `/api/contact/` (endpoint
 * public, pas besoin d'être connecté) et le backend transmet l'email.
 *
 * @returns {JSX.Element} L'écran Contact
 */
export default function Contact() {
  // Hauteur des zones système. insets.bottom = hauteur de la barre de
  // navigation du téléphone (0 si l'appareil n'en a pas).
  const insets = useSafeAreaInsets();

  // Champs du formulaire.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // États d'envoi.
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  /**
   * Envoie le formulaire à l'API.
   */
  async function handleSubmit() {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await sendContact({ name, email, subject, message });
      setSuccess(data.message || "Message envoyé !");
      // On vide le formulaire après un envoi réussi.
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      // 429 = limite de débit (trop de messages envoyés) → message dédié.
      setError(
        getThrottleMessage(err) ||
          err.response?.data?.error ||
          "Une erreur est survenue. Réessaie plus tard."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StaticScreenHeader title="Contacte-nous" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          // Style de base + paddingBottom dynamique (marge habituelle + hauteur
          // de la barre du bas) pour que le footer ne déborde pas dessous.
          contentContainerStyle={[
            styles.content,
            { paddingBottom: SPACING.xl + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            Une question, une suggestion ou un bug à signaler ? Remplis le
            formulaire et on te répond rapidement.
          </Text>

          {/* Nom */}
          <View style={styles.field}>
            <Text style={styles.label}>Ton nom</Text>
            <Input value={name} onChangeText={setName} placeholder="Ex : Alice" />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Ton email</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Ex : alice@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Sujet */}
          <View style={styles.field}>
            <Text style={styles.label}>Sujet</Text>
            <Input
              value={subject}
              onChangeText={setSubject}
              placeholder="Ex : Suggestion de fonctionnalité"
            />
          </View>

          {/* Message (zone de texte multiligne) */}
          <View style={styles.field}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.textarea}
              value={message}
              onChangeText={setMessage}
              placeholder="Décris ta question ou ton idée..."
              placeholderTextColor={COLORS.grisTexte}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Messages de succès / erreur */}
          {success ? <Text style={styles.success}>{success}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Bouton d'envoi */}
          <Button
            title="Envoyer"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          {/* Email alternatif */}
          <Text style={styles.alt}>
            Tu peux aussi nous écrire directement à{" "}
            <Text
              style={styles.altLink}
              onPress={() => Linking.openURL("mailto:contact@filmmatching.com")}
            >
              contact@filmmatching.com
            </Text>
          </Text>

          <TmdbAttribution />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    // paddingBottom n'est PAS ici : il est calculé dans le composant
    // (SPACING.xl + insets.bottom) pour tenir compte de la barre du téléphone.
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  field: {
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.grisTexte,
  },
  textarea: {
    minHeight: 120,
    backgroundColor: COLORS.grisSombre,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
    padding: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.blancDoux,
  },
  success: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.vertMatch,
    marginBottom: SPACING.sm,
  },
  error: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.corailVif,
    marginBottom: SPACING.sm,
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
  alt: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    textAlign: "center",
    marginTop: SPACING.xl,
    lineHeight: 19,
  },
  altLink: {
    color: COLORS.violetNuit,
    fontFamily: FONTS.bodyMedium,
  },
});
