import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import TmdbAttribution from "../components/TmdbAttribution";
import "../styles/Forms.css";

/**
 * ResetPassword — Page de réinitialisation du mot de passe.
 *
 * L'utilisateur arrive ici en cliquant sur le lien reçu par email.
 * L'URL contient deux paramètres :
 * - uid : l'ID de l'utilisateur encodé en base64
 * - token : un token unique généré par Django
 *
 * L'utilisateur entre son nouveau mot de passe deux fois
 * (pour éviter les fautes de frappe), puis le formulaire
 * envoie le nouveau mot de passe à l'API qui le met à jour.
 *
 * @returns {JSX.Element} Le formulaire de nouveau mot de passe
 */
function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // useParams() récupère les paramètres dynamiques de l'URL
  // Exemple : /reset-password/MQ/abc123 → { uid: "MQ", token: "abc123" }
  const { uid, token } = useParams();
  const navigate = useNavigate();

  /**
   * Vérifie que les mots de passe correspondent,
   * puis envoie le nouveau mot de passe à l'API.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Vérifier que les deux mots de passe sont identiques
    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne sont pas identiques.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(
        `/api/users/reset-password/${uid}/${token}/`,
        { password }
      );
      setSuccessMessage(res.data.message);

      // Rediriger vers la page de connexion après 2 secondes
      // pour que l'utilisateur ait le temps de lire le message
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error ||
          "Une erreur est survenue. Le lien est peut-être expiré."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <form onSubmit={handleSubmit} className="form-container">
        <span className="form-logo">FilmMatching</span>
        <h1>Nouveau mot de passe</h1>
        <p className="form-subtitle">
          Choisis un nouveau mot de passe pour ton compte
        </p>

        <input
          className="form-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nouveau mot de passe"
          required
        />
        <input
          className="form-input"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirmer le mot de passe"
          required
        />

        {/* Message de succès */}
        {successMessage && (
          <p className="form-success">{successMessage}</p>
        )}

        {/* Message d'erreur */}
        {errorMessage && (
          <p className="form-error">{errorMessage}</p>
        )}

        <button className="form-button" type="submit" disabled={loading}>
          {loading ? "Modification..." : "Modifier le mot de passe"}
        </button>
      </form>
      <TmdbAttribution />
    </div>
  );
}

export default ResetPassword;
