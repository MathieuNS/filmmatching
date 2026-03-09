import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import TmdbAttribution from "../components/TmdbAttribution";
import { AVATARS, getAvatarUrl } from "../utils/avatars";
import "../styles/UserAccount.css";
// On importe Home.css pour réutiliser les styles du menu hamburger
import "../styles/Home.css";

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
  // --- State pour le menu de navigation (hamburger) ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // --- State pour le sélecteur d'avatar ---
  // true quand le sélecteur d'avatar est visible
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
        // GET /api/users/me/ renvoie { id, username, email }
        const response = await api.get("/api/users/me/");
        setUser(response.data);
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

        {/* Menu hamburger — même composant que sur Home et FilmList */}
        <div className="home__menu-container">
          <button
            className="home__menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu de navigation"
          >
            <span className={`home__menu-icon ${isMenuOpen ? "home__menu-icon--open" : ""}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {isMenuOpen && (
            <>
              <div
                className="home__menu-backdrop"
                onClick={() => setIsMenuOpen(false)}
              />
              <nav className="home__menu-dropdown">
                <button
                  className="home__menu-item"
                  onClick={() => { navigate("/home"); setIsMenuOpen(false); }}
                >
                  <span className="home__menu-item-icon">👆</span>
                  Swiper
                </button>
                <button
                  className="home__menu-item"
                  onClick={() => { navigate("/liste"); setIsMenuOpen(false); }}
                >
                  <span className="home__menu-item-icon">📋</span>
                  Ma liste
                </button>
                <button
                  className="home__menu-item"
                  onClick={() => { navigate("/amis"); setIsMenuOpen(false); }}
                >
                  <span className="home__menu-item-icon">👥</span>
                  Mes Amis
                </button>
                <button
                  className="home__menu-item"
                  onClick={() => { navigate("/logout"); setIsMenuOpen(false); }}
                >
                  <span className="home__menu-item-icon">⏻</span>
                  Déconnexion
                </button>
              </nav>
            </>
          )}
        </div>
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

          {/* Bloc d'informations : pseudo + email */}
          <div className="account__info">
            <div className="account__info-item">
              <span className="account__info-label">Pseudo</span>
              <span className="account__info-value">
                {user?.username || "Inconnu"}
              </span>
            </div>

            <div className="account__info-item">
              <span className="account__info-label">Email</span>
              <span className="account__info-value">
                {user?.email || "Non renseigné"}
              </span>
            </div>
          </div>

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
