import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import Input from "../components/Input";
import Button from "../components/Button";
import TmdbAttribution from "../components/TmdbAttribution";
import { fetchMe } from "../api/friends";
import { updateProfile, updateAvatar, deleteAccount } from "../api/account";
import { AVATARS } from "../utils/avatars";
import { logout } from "../store/authSlice";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * UserAccount — "Mon Compte" (mobile).
 *
 * Port de `frontend/src/pages/user_account.jsx`. Permet de :
 *  - changer son avatar (grille de choix → PATCH /api/users/me/avatar/) ;
 *  - modifier pseudo / email / mot de passe (PATCH /api/users/me/update/) ;
 *  - régler 2 préférences (notifications email, partage de la filmothèque) ;
 *  - supprimer son compte (DELETE → déconnexion).
 *
 * On garde l'`AppHeader` (logo + menu) fourni par l'AppStack : le titre
 * "Mon Compte" est rendu ici, dans le corps de la page (comme films_list).
 *
 * @returns {JSX.Element} L'écran "Mon Compte"
 */
export default function UserAccount() {
  const dispatch = useDispatch();
  // Zone "sûre" du bas (home indicator iOS) : on l'ajoute au padding pour que
  // le footer ne soit pas collé au bord / masqué sur cet écran plein écran.
  const insets = useSafeAreaInsets();

  // --- Données utilisateur ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Sélecteur d'avatar ---
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // --- Champs d'édition (pré-remplis depuis le profil) ---
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordConfirm, setEditPasswordConfirm] = useState("");
  const [editEmailNotifications, setEditEmailNotifications] = useState(false);
  const [editShareSeen, setEditShareSeen] = useState(true);

  // --- Feedback de sauvegarde ---
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // Erreurs de validation renvoyées par l'API ({ username: "...", ... }).
  const [errors, setErrors] = useState({});

  // --- Suppression de compte ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Chargement du profil au montage.
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMe();
        setUser(data);
        // On pré-remplit les champs avec les valeurs actuelles.
        setEditUsername(data.username || "");
        setEditEmail(data.email || "");
        setEditEmailNotifications(data.email_notifications || false);
        // share_seen_with_friends vaut true par défaut côté backend.
        setEditShareSeen(
          data.share_seen_with_friends !== undefined
            ? data.share_seen_with_friends
            : true
        );
      } catch (error) {
        console.error("Erreur chargement du profil :", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /**
   * Change l'avatar (PATCH) + mise à jour locale immédiate.
   * @param {string} avatarName - Nom du fichier avatar choisi
   */
  async function handleAvatarChange(avatarName) {
    try {
      await updateAvatar(avatarName);
      setUser((prev) => ({ ...prev, avatar: avatarName }));
      setShowAvatarPicker(false);
    } catch (error) {
      console.error("Erreur changement d'avatar :", error);
    }
  }

  /**
   * Sauvegarde le profil : on n'envoie QUE les champs réellement modifiés
   * (sinon le backend renverrait "pseudo déjà utilisé" sur sa propre valeur).
   */
  async function handleSaveProfile() {
    setErrors({});
    setSuccessMessage("");

    const data = {};
    if (editUsername && editUsername !== user.username) {
      data.username = editUsername;
    }
    if (editEmail && editEmail !== user.email) {
      data.email = editEmail;
    }
    if (editPassword) {
      data.password = editPassword;
      data.password_confirm = editPasswordConfirm;
    }
    if (editEmailNotifications !== user.email_notifications) {
      data.email_notifications = editEmailNotifications;
    }
    if (editShareSeen !== user.share_seen_with_friends) {
      data.share_seen_with_friends = editShareSeen;
    }

    // Rien n'a changé → pas de requête.
    if (Object.keys(data).length === 0) return;

    setSaving(true);
    try {
      const updated = await updateProfile(data);
      setUser(updated);
      setEditPassword("");
      setEditPasswordConfirm("");
      setSuccessMessage("Modifications enregistrées !");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      // DRF renvoie les erreurs sous forme de tableaux : on garde le 1er message.
      if (error.response && error.response.data) {
        const apiErrors = error.response.data;
        const formatted = {};
        for (const key in apiErrors) {
          formatted[key] = Array.isArray(apiErrors[key])
            ? apiErrors[key][0]
            : apiErrors[key];
        }
        setErrors(formatted);
      }
    } finally {
      setSaving(false);
    }
  }

  /**
   * Supprime le compte puis déconnecte (bascule vers l'AuthStack).
   */
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      // logout() vide les tokens et fait basculer RootNavigator sur l'AuthStack.
      dispatch(logout());
    } catch (error) {
      console.error("Erreur suppression du compte :", error);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Plein écran (pas de défilement) : le contenu se répartit sur la
          hauteur disponible. KeyboardAvoidingView évite que le clavier
          recouvre les champs sur iOS. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[styles.content, { paddingBottom: insets.bottom + SPACING.md }]}
        >
          <Text style={styles.pageTitle}>Mon Compte</Text>

          {/* Avatar cliquable (ouvre le sélecteur en modale) */}
          <Pressable
            style={styles.avatarWrapper}
            onPress={() => setShowAvatarPicker(true)}
          >
            <Avatar
              name={user?.avatar || "avatar-popcorn.svg"}
              size={88}
              fallbackLabel={user?.username}
            />
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>✎</Text>
            </View>
          </Pressable>

          {/* Formulaire d'édition */}
          <View style={styles.form}>
          {/* Pseudo */}
          <View style={styles.field}>
            <Text style={styles.label}>Pseudo</Text>
            <Input
              value={editUsername}
              onChangeText={setEditUsername}
              autoCapitalize="none"
            />
            {errors.username ? (
              <Text style={styles.error}>{errors.username}</Text>
            ) : null}
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Input
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.error}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Nouveau mot de passe */}
          <View style={styles.field}>
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <Input
              value={editPassword}
              onChangeText={setEditPassword}
              secureTextEntry
              placeholder="Laisser vide pour ne pas changer"
            />
            {errors.password ? (
              <Text style={styles.error}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Confirmation (visible seulement si un nouveau mdp est saisi) */}
          {editPassword ? (
            <View style={styles.field}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <Input
                value={editPasswordConfirm}
                onChangeText={setEditPasswordConfirm}
                secureTextEntry
                placeholder="Retaper le mot de passe"
              />
              {errors.password_confirm ? (
                <Text style={styles.error}>{errors.password_confirm}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Toggle notifications email */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Notifications email</Text>
            <Switch
              value={editEmailNotifications}
              onValueChange={setEditEmailNotifications}
              trackColor={{ false: COLORS.grisMoyen, true: COLORS.violetNuit }}
              thumbColor={COLORS.blancDoux}
            />
          </View>

          {/* Toggle partage de la filmothèque */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              Partager ma filmothèque avec mes amis
            </Text>
            <Switch
              value={editShareSeen}
              onValueChange={setEditShareSeen}
              trackColor={{ false: COLORS.grisMoyen, true: COLORS.violetNuit }}
              thumbColor={COLORS.blancDoux}
            />
          </View>
        </View>

        {/* Message de succès */}
        {successMessage ? (
          <Text style={styles.success}>{successMessage}</Text>
        ) : null}

        {/* Bouton Sauvegarder */}
        <Button
          title="Sauvegarder"
          onPress={handleSaveProfile}
          loading={saving}
          style={styles.saveBtn}
        />

        {/* Bouton Supprimer mon compte */}
        <Pressable
          style={styles.deleteBtn}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={styles.deleteBtnText}>Supprimer mon compte</Text>
        </Pressable>

          {/* Pousse le footer en bas de l'écran (plein écran sans scroll). */}
          <View style={styles.spacer} />

          <TmdbAttribution />
        </View>
      </KeyboardAvoidingView>

      {/* === Modale du sélecteur d'avatar === */}
      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAvatarPicker(false)}
        >
          <Pressable style={styles.pickerModal} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Choisis ton avatar</Text>
            <View style={styles.pickerGrid}>
              {AVATARS.map((avatar) => (
                <Pressable
                  key={avatar.name}
                  style={[
                    styles.pickerItem,
                    user?.avatar === avatar.name && styles.pickerItemActive,
                  ]}
                  onPress={() => handleAvatarChange(avatar.name)}
                >
                  <Avatar name={avatar.name} size={56} />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* === Modale de confirmation de suppression === */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDeleteModal(false)}
        >
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Supprimer ton compte ?</Text>
            <Text style={styles.modalText}>
              Cette action est irréversible. Toutes tes données (films likés,
              amis, matchs) seront définitivement supprimées.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                <Text style={styles.modalConfirmText}>
                  {deleting ? "Suppression..." : "Supprimer"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  loadingText: {
    color: COLORS.grisTexte,
    fontFamily: FONTS.body,
    fontSize: 15,
    textAlign: "center",
    paddingVertical: SPACING.huge,
  },
  // Plein écran : on remplit la hauteur, le footer est poussé en bas (spacer).
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    alignItems: "center",
  },
  // Espace élastique qui pousse le footer tout en bas de l'écran.
  spacer: {
    flexGrow: 1,
  },
  pageTitle: {
    alignSelf: "flex-start",
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.blancDoux,
    marginBottom: SPACING.md,
  },

  // Avatar
  avatarWrapper: {
    marginBottom: SPACING.md,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: RADII.round,
    backgroundColor: COLORS.violetNuit,
    borderWidth: 3,
    borderColor: COLORS.noirCinema,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditIcon: {
    color: "#fff",
    fontSize: 13,
  },

  // Sélecteur d'avatar (carte de modale centrée via modalBackdrop)
  pickerModal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.modal,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    padding: SPACING.xl,
  },
  pickerTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.blancDoux,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.md,
  },
  pickerItem: {
    padding: 4,
    borderRadius: RADII.round,
    borderWidth: 2,
    borderColor: "transparent",
  },
  pickerItemActive: {
    borderColor: COLORS.violetNuit,
  },

  // Formulaire
  form: {
    width: "100%",
    gap: SPACING.sm,
  },
  field: {
    gap: SPACING.xs + 2,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.grisTexte,
  },
  error: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.corailVif,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  toggleLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.blancDoux,
  },

  // Feedback + boutons
  success: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.vertMatch,
    marginTop: SPACING.lg,
    textAlign: "center",
  },
  saveBtn: {
    width: "100%",
    marginTop: SPACING.md,
  },
  deleteBtn: {
    width: "100%",
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
    borderWidth: BORDERS.width,
    borderColor: "rgba(255,77,106,0.4)",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  deleteBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.corailVif,
  },

  // Modale de suppression
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.modal,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    padding: SPACING.xxl,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 19,
    color: COLORS.blancDoux,
    marginBottom: SPACING.sm,
  },
  modalText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADII.button,
    alignItems: "center",
  },
  modalCancel: {
    backgroundColor: COLORS.grisSombre,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
  },
  modalCancelText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  modalConfirm: {
    backgroundColor: COLORS.corailVif,
  },
  modalConfirmText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: "#fff",
  },
});
