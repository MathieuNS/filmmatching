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
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();

    try {
      const res = await api.post("/api/token/", { username, password });
      // On stocke les tokens JWT dans le localStorage
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
      navigate("/home");
    } catch (error) {
      alert(error);
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
        <input
          className="form-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
        />

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
