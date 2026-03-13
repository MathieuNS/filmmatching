import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import TmdbAttribution from "./TmdbAttribution";
import "../styles/Forms.css";

/**
 * Formulaire de création de compte.
 * Envoie les infos (pseudo, email, mot de passe) à l'API,
 * puis redirige vers /login si l'inscription réussit.
 */
function CreateAccountForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Deuxième champ pour confirmer le mot de passe
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Case à cocher pour le consentement (politique de confidentialité + CGU)
  const [accepted, setAccepted] = useState(false);
  // Message d'erreur affiché sous le formulaire (null = pas d'erreur)
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Vérifier que les deux mots de passe sont identiques
    // avant d'envoyer la requête à l'API
    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne sont pas identiques.");
      return;
    }

    setLoading(true);

    try {
      await api.post("api/users/create/", { email, username, password });
      // Redirige vers la page "Vérifie ta boîte mail" au lieu de /login
      // car le compte n'est pas encore actif (il faut cliquer sur le lien)
      navigate("/check-email");
    } catch (error) {
      // L'API renvoie un objet avec les champs en erreur
      // ex: { "username": ["A user with that username already exists."] }
      // ex: { "email": ["Cet email est déjà utilisé."] }
      const data = error.response?.data;

      if (data?.username) {
        setErrorMessage("Ce pseudo est déjà pris.");
      } else if (data?.email) {
        setErrorMessage("Cette adresse email est déjà utilisée.");
      } else if (data?.password) {
        setErrorMessage("Le mot de passe est trop court ou trop simple.");
      } else {
        setErrorMessage("Une erreur est survenue. Vérifie tes informations.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <form onSubmit={handleSubmit} className="form-container">
        {/* Nom de l'app en haut du formulaire */}
        <span className="form-logo">FilmMatching</span>
        <h1>Créer un compte</h1>
        <p className="form-subtitle">Rejoins la communauté ciné</p>

        <input
          className="form-input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Pseudo"
        />
        <input
          className="form-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          className="form-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
        />
        <input
          className="form-input"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirmer le mot de passe"
        />

        {/* Case à cocher de consentement (obligatoire RGPD) */}
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span className="form-checkbox__text">
            J'accepte la{" "}
            <Link to="/rgpd" className="form-checkbox__link">
              politique de confidentialité
            </Link>{" "}
            et les{" "}
            <Link to="/mentions-legales" className="form-checkbox__link">
              mentions légales
            </Link>
          </span>
        </label>

        {/* Message d'erreur affiché en cas d'échec */}
        {errorMessage && (
          <p className="form-error">{errorMessage}</p>
        )}

        <button className="form-button" type="submit" disabled={loading || !accepted}>
          {loading ? "Création..." : "Créer un compte"}
        </button>

        {/* Lien vers la page de connexion */}
        <p className="form-link">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
      <TmdbAttribution />
    </div>
  );
}

export default CreateAccountForm;
