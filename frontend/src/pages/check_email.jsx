import { Link } from "react-router-dom";
import "../styles/Forms.css";
import "../styles/CheckEmail.css";

/**
 * Page affichée après la création d'un compte.
 *
 * Indique à l'utilisateur qu'il doit vérifier sa boîte mail
 * et cliquer sur le lien d'activation avant de pouvoir se connecter.
 */
function CheckEmail() {
  return (
    <div className="form-page">
      <div className="form-container check-email-container">
        <span className="form-logo">FilmMatching</span>

        {/* Icône email */}
        <div className="check-email-icon">&#9993;</div>

        <h1>Vérifie ta boîte mail</h1>
        <p className="form-subtitle">
          Un email de confirmation a été envoyé à ton adresse.
          Clique sur le lien dans l'email pour activer ton compte.
        </p>

        <div className="check-email-tips">
          <p>Tu ne trouves pas l'email ?</p>
          <ul>
            <li>Vérifie ton dossier <strong>spam / indésirables</strong></li>
            <li>L'email peut mettre quelques minutes à arriver</li>
          </ul>
        </div>

        <Link to="/login" className="form-button" style={{ textDecoration: "none", textAlign: "center" }}>
          Aller à la connexion
        </Link>
      </div>
    </div>
  );
}

export default CheckEmail;
