import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import TmdbAttribution from "../components/TmdbAttribution";
import "../styles/Forms.css";

/**
 * ForgotPassword — Page "Mot de passe oublié".
 *
 * L'utilisateur entre son adresse email. Si elle existe en BDD,
 * l'API envoie un email avec un lien pour réinitialiser le mot de passe.
 *
 * Pour des raisons de sécurité, le message de succès est toujours
 * le même, que l'email existe ou non (on ne veut pas révéler
 * quels emails sont inscrits sur la plateforme).
 *
 * @returns {JSX.Element} Le formulaire de demande de réinitialisation
 */
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  /**
   * Envoie l'email à l'API pour déclencher l'envoi du lien de réinitialisation.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await api.post("/api/users/forgot-password/", { email });
      // Afficher le message de confirmation renvoyé par l'API
      setSuccessMessage(res.data.message);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error ||
          "Une erreur est survenue. Réessaie plus tard."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <form onSubmit={handleSubmit} className="form-container">
        <span className="form-logo">FilmMatching</span>
        <h1>Mot de passe oublié</h1>
        <p className="form-subtitle">
          Entre ton adresse email pour recevoir un lien de réinitialisation
        </p>

        <input
          className="form-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ton adresse email"
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
          {loading ? "Envoi en cours..." : "Envoyer le lien"}
        </button>

        {/* Lien pour retourner à la connexion */}
        <p className="form-link">
          <Link to="/login">Retour à la connexion</Link>
        </p>
      </form>
      <TmdbAttribution />
    </div>
  );
}

export default ForgotPassword;
