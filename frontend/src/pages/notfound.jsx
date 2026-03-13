import { Link } from "react-router-dom";
import TmdbAttribution from "../components/TmdbAttribution";
import "../styles/NotFound.css";

/**
 * NotFound — Page affichée quand l'URL n'existe pas (erreur 404).
 *
 * Affiche un message clair avec un bouton pour revenir à l'accueil,
 * plutôt que de laisser l'utilisateur bloqué sur une page vide.
 *
 * @returns {JSX.Element} La page 404
 */
function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        {/* Code d'erreur en grand pour que ce soit immédiatement clair */}
        <span className="notfound-code">404</span>

        <h1 className="notfound-title">Page introuvable</h1>

        <p className="notfound-text">
          On dirait que cette page n'existe pas ou a été déplacée.
        </p>

        {/* Boutons d'action */}
        <div className="notfound-actions">
          <Link to="/" className="notfound-button">
            Retour à l'accueil
          </Link>

          <div className="notfound-auth">
            <Link to="/login" className="notfound-auth__link">
              Se connecter
            </Link>
            <span className="notfound-auth__separator">ou</span>
            <Link to="/create-login" className="notfound-auth__link">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>

      <TmdbAttribution />
    </div>
  );
}

export default NotFound;
