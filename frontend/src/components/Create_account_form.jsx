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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();

    try {
      await api.post("api/users/create/", { email, username, password });
      navigate("/login");
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

        <button className="form-button" type="submit" disabled={loading}>
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
