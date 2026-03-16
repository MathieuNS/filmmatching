import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import TmdbAttribution from "./TmdbAttribution";
import "../styles/Forms.css";

/**
 * Formulaire de connexion.
 * Envoie les identifiants à l'API pour obtenir un JWT,
 * puis redirige vers /home si la connexion réussit.
 */
function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // true = le mot de passe est affiché en clair, false = masqué (●●●)
  const [showPassword, setShowPassword] = useState(false);
  // Message d'erreur affiché sous le formulaire (null = pas d'erreur)
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    setLoading(true);
    setErrorMessage(null);
    e.preventDefault();

    try {
      const res = await api.post("/api/token/", { username, password });
      // On stocke les tokens JWT dans le localStorage
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
      navigate("/home");
    } catch (error) {
      // Le backend renvoie un message différent selon le cas :
      // - 401 : identifiants incorrects
      // - 403 : compte non activé (l'utilisateur n'a pas cliqué sur le lien email)
      const serverMessage = error.response?.data?.error;
      setErrorMessage(serverMessage || "Erreur d'identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <form onSubmit={handleSubmit} className="form-container">
        {/* Nom de l'app en haut du formulaire */}
        <span className="form-logo">FilmMatching</span>
        <h1>Connexion</h1>
        <p className="form-subtitle">Retrouve tes matchs ciné</p>

        <input
          className="form-input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Pseudo"
        />
        {/* Wrapper du champ mot de passe : contient l'input + le bouton œil */}
        <div className="form-password-wrapper">
          <input
            className="form-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
          />
          {/* Bouton pour afficher/masquer le mot de passe.
              type="button" empêche le bouton de soumettre le formulaire */}
          <button
            type="button"
            className="form-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {/* Icône œil ouvert (visible) ou œil barré (masqué) */}
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Lien mot de passe oublié, placé juste sous le champ mot de passe */}
        <p className="form-forgot">
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </p>

        {/* Message d'erreur affiché en cas d'échec de connexion */}
        {errorMessage && (
          <p className="form-error">{errorMessage}</p>
        )}

        <button className="form-button" type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        {/* Lien vers la page de création de compte */}
        <p className="form-link">
          Pas encore de compte ? <Link to="/create-login">Créer un compte</Link>
        </p>
      </form>
      <TmdbAttribution />
    </div>
  );
}

export default LoginForm;
