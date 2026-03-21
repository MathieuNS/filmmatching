import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import TmdbAttribution from "../components/TmdbAttribution";
import HamburgerMenu from "../components/HamburgerMenu";
import { AVATARS, getAvatarUrl } from "../utils/avatars";
import "../styles/UserAccount.css";

/**
 * Page "Mon compte" — Affiche les informations personnelles de l'utilisateur.
 *
 * Layout identique à la page FilmList : header avec flèche retour,
 * titre "Mon Compte", et menu hamburger à droite.
 * Affiche le pseudo et l'email, avec un bouton pour supprimer le compte.
 *
 * @returns {JSX.Element} La page compte utilisateur
 */
function UserAccount() {
  const navigate = useNavigate();

  // --- Données de l'utilisateur récupérées depuis l'API ---
  const [user, setUser] = useState(null);
  // true pendant le chargement des données
  const [loading, setLoading] = useState(true);
  // Contrôle l'affichage de la modale de confirmation de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // true pendant que la requête de suppression est en cours
  const [deleting, setDeleting] = useState(false);
  // --- State pour le sélecteur d'avatar ---
  // true quand le sélecteur d'avatar est visible
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // --- States pour l'édition du profil ---
  // Les valeurs des champs du formulaire d'édition
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordConfirm, setEditPasswordConfirm] = useState("");
  // true pendant que la requête de sauvegarde est en cours
  const [saving, setSaving] = useState(false);
  // Message de succès affiché temporairement après la sauvegarde
  const [successMessage, setSuccessMessage] = useState("");
  // Objet contenant les erreurs de validation renvoyées par l'API
  // ex: { username: "Ce pseudo est déjà utilisé." }
  const [errors, setErrors] = useState({});
  // Préférence de notifications email (true/false)
  const [editEmailNotifications, setEditEmailNotifications] = useState(false);

  // La liste des avatars est importée depuis utils/avatars.js
  // Elle se met à jour automatiquement quand on ajoute des SVG dans src/assets/avatars/

  /**
   * Récupère les informations de l'utilisateur connecté au chargement de la page.
   * L'API sait qui est l'utilisateur grâce au token JWT envoyé automatiquement
   * par l'intercepteur Axios dans api.js.
   */
  useEffect(() => {
    async function fetchUser() {
      try {
        // GET /api/users/me/ renvoie { id, username, email, avatar }
        const response = await api.get("/api/users/me/");
        setUser(response.data);
        // On pré-remplit les champs d'édition avec les valeurs actuelles
        // pour que l'utilisateur voie ses infos et ne modifie que ce qu'il veut
        setEditUsername(response.data.username || "");
        setEditEmail(response.data.email || "");
        setEditEmailNotifications(response.data.email_notifications || false);
      } catch (error) {
        console.error("Erreur lors du chargement du profil :", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  /**
   * Supprime le compte de l'utilisateur après confirmation.
   *
   * 1. Envoie une requête DELETE à l'API
   * 2. Vide le localStorage (tokens JWT)
   * 3. Redirige vers la page de login
   */
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      // DELETE /api/users/me/delete/ supprime le compte en BDD
      await api.delete("/api/users/me/delete/");
      // On vide le localStorage pour supprimer les tokens JWT
      // (sinon le navigateur essaierait d'utiliser un token d'un compte qui n'existe plus)
      localStorage.clear();
      // Redirection vers la page de login
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la suppression du compte :", error);
      setDeleting(false);
    }
  }

  /**
   * Change l'avatar de l'utilisateur.
   *
   * Envoie le nom du fichier avatar choisi à l'API via PATCH,
   * puis met à jour le state local pour que le changement
   * s'affiche immédiatement sans recharger la page.
   *
   * @param {string} avatarName - Le nom du fichier avatar (ex: "avatar-camera.svg")
   */
  async function handleAvatarChange(avatarName) {
    try {
      // PATCH /api/users/me/avatar/ met à jour l'avatar en BDD
      await api.patch("/api/users/me/avatar/", { avatar: avatarName });
      // Mise à jour locale : on modifie le user dans le state
      // pour que l'avatar s'affiche immédiatement
      setUser((prev) => ({ ...prev, avatar: avatarName }));
      // Fermer le sélecteur après le choix
      setShowAvatarPicker(false);
    } catch (error) {
      console.error("Erreur lors du changement d'avatar :", error);
    }
  }

  /**
   * Sauvegarde les modifications du profil (pseudo, email, mot de passe).
   *
   * On n'envoie que les champs qui ont été modifiés pour éviter
   * des validations inutiles côté backend. Par exemple, si l'utilisateur
   * ne change que son pseudo, on n'envoie pas l'email ni le mot de passe.
   */
  async function handleSaveProfile() {
    // On réinitialise les erreurs et le message de succès
    setErrors({});
    setSuccessMessage("");

    // On construit un objet avec uniquement les champs modifiés
    const data = {};

    // On compare avec les valeurs actuelles pour ne pas envoyer
    // des données identiques (ce qui déclencherait une erreur "déjà utilisé")
    if (editUsername && editUsername !== user.username) {
      data.username = editUsername;
    }
    if (editEmail && editEmail !== user.email) {
      data.email = editEmail;
    }
    // Pour le mot de passe, on l'envoie seulement s'il a été rempli
    if (editPassword) {
      data.password = editPassword;
      data.password_confirm = editPasswordConfirm;
    }
    // On compare avec la valeur actuelle pour ne pas envoyer si rien n'a changé
    if (editEmailNotifications !== user.email_notifications) {
      data.email_notifications = editEmailNotifications;
    }

    // Si rien n'a changé, on ne fait pas de requête
    if (Object.keys(data).length === 0) {
      return;
    }

    setSaving(true);
    try {
      // PATCH /api/users/me/update/ met à jour le profil en BDD
      const response = await api.patch("/api/users/me/update/", data);
      // On met à jour le state local avec les nouvelles données
      setUser(response.data);
      // On vide les champs de mot de passe après la sauvegarde
      setEditPassword("");
      setEditPasswordConfirm("");
      setSuccessMessage("Modifications enregistrées !");
      // Le message de succès disparaît après 3 secondes
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      // L'API renvoie les erreurs de validation dans error.response.data
      // ex: { username: ["Ce pseudo est déjà utilisé."] }
      if (error.response && error.response.data) {
        const apiErrors = error.response.data;
        // On transforme les tableaux d'erreurs en chaînes simples
        // car DRF renvoie les erreurs sous forme de tableaux
        const formattedErrors = {};
        for (const key in apiErrors) {
          formattedErrors[key] = Array.isArray(apiErrors[key])
            ? apiErrors[key][0]
            : apiErrors[key];
        }
        setErrors(formattedErrors);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="account">
      {/* Header : flèche retour + titre + hamburger menu */}
      <div className="account__header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="account__back-btn"
            onClick={() => navigate("/home")}
            aria-label="Retour à l'accueil"
          >
            ←
          </button>
          <h1 className="account__title">Mon Compte</h1>
        </div>

        {/* Menu hamburger — composant réutilisable */}
        <HamburgerMenu currentPage="compte" />
      </div>

      {/* Contenu principal */}
      {loading ? (
        <div className="account__loading">Chargement...</div>
      ) : (
        <div className="account__content">
          {/* Avatar SVG de l'utilisateur — cliquable pour changer */}
          <div
            className="account__avatar"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            title="Cliquer pour changer d'avatar"
          >
            <img
              className="account__avatar-img"
              src={getAvatarUrl(user?.avatar || "avatar-popcorn.svg")}
              alt="Avatar"
            />
            {/* Petit badge crayon pour indiquer que c'est modifiable */}
            <span className="account__avatar-edit">✎</span>
          </div>

          {/* Sélecteur d'avatar — visible quand on clique sur l'avatar */}
          {showAvatarPicker && (
            <div className="account__avatar-picker">
              <p className="account__avatar-picker-title">Choisis ton avatar</p>
              <div className="account__avatar-picker-grid">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.name}
                    className={`account__avatar-picker-item ${
                      user?.avatar === avatar.name ? "account__avatar-picker-item--active" : ""
                    }`}
                    onClick={() => handleAvatarChange(avatar.name)}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire d'édition du profil */}
          <div className="account__info">
            {/* Champ Pseudo — éditable */}
            <div className="account__info-item">
              <label className="account__info-label" htmlFor="edit-username">
                Pseudo
              </label>
              <input
                id="edit-username"
                className="account__input"
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
              {/* Message d'erreur affiché si le pseudo est déjà pris */}
              {errors.username && (
                <span className="account__error">{errors.username}</span>
              )}
            </div>

            {/* Champ Email — éditable */}
            <div className="account__info-item">
              <label className="account__info-label" htmlFor="edit-email">
                Email
              </label>
              <input
                id="edit-email"
                className="account__input"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
              {errors.email && (
                <span className="account__error">{errors.email}</span>
              )}
            </div>

            {/* Champ Nouveau mot de passe — optionnel */}
            <div className="account__info-item">
              <label className="account__info-label" htmlFor="edit-password">
                Nouveau mot de passe
              </label>
              <input
                id="edit-password"
                className="account__input"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Laisser vide pour ne pas changer"
              />
              {errors.password && (
                <span className="account__error">{errors.password}</span>
              )}
            </div>

            {/* Confirmation du mot de passe — visible uniquement si
                l'utilisateur a commencé à taper un nouveau mot de passe */}
            {editPassword && (
              <div className="account__info-item">
                <label className="account__info-label" htmlFor="edit-password-confirm">
                  Confirmer le mot de passe
                </label>
                <input
                  id="edit-password-confirm"
                  className="account__input"
                  type="password"
                  value={editPasswordConfirm}
                  onChange={(e) => setEditPasswordConfirm(e.target.value)}
                  placeholder="Retaper le mot de passe"
                />
                {errors.password_confirm && (
                  <span className="account__error">{errors.password_confirm}</span>
                )}
              </div>
            )}

            {/* Toggle switch notifications email */}
            <div className="account__toggle-row">
              <span className="account__toggle-label">
                Notifications email
              </span>
              <button
                type="button"
                className={`account__toggle ${editEmailNotifications ? "account__toggle--active" : ""}`}
                onClick={() => setEditEmailNotifications(!editEmailNotifications)}
                role="switch"
                aria-checked={editEmailNotifications}
                aria-label="Notifications email"
              >
                <span className="account__toggle-thumb" />
              </button>
            </div>
          </div>

          {/* Message de succès après sauvegarde */}
          {successMessage && (
            <span className="account__success">{successMessage}</span>
          )}

          {/* Bouton Sauvegarder */}
          <button
            className="account__save-btn"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>

          {/* Bouton de suppression du compte */}
          <button
            className="account__delete-btn"
            onClick={() => setShowDeleteModal(true)}
          >
            Supprimer mon compte
          </button>
        </div>
      )}

      <TmdbAttribution />

      {/* Modale de confirmation de suppression */}
      {showDeleteModal && (
        <div className="account__modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          {/* stopPropagation empêche le clic sur la modale de fermer le backdrop */}
          <div className="account__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="account__modal-title">Supprimer ton compte ?</h2>
            <p className="account__modal-text">
              Cette action est irréversible. Toutes tes données (films likés,
              amis, matchs) seront définitivement supprimées.
            </p>
            <div className="account__modal-actions">
              <button
                className="account__modal-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
              <button
                className="account__modal-confirm"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserAccount;
