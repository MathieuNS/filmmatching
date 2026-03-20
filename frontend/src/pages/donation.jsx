import { Link } from "react-router-dom";
// Import du fichier CSS dédié à la page de donation
import "../styles/Donation.css";

/**
 * Donation — Page de soutien / don via Tipeee.
 *
 * Cette page explique pourquoi FilmMatching est gratuit,
 * que le projet est maintenu par une seule personne,
 * et invite les utilisateurs à soutenir le projet
 * via un don sur Tipeee (paiement par carte via Stripe).
 *
 * Pas besoin d'être connecté pour accéder à cette page.
 *
 * @returns {JSX.Element} La page de donation
 */
function Donation() {
  return (
    <div className="donation-page">
      {/* Bouton retour vers l'accueil */}
      <Link to="/" className="donation-page__back">
        &larr; Retour
      </Link>

      {/* En-tête avec titre et message principal */}
      <div className="donation-page__header">
        <span className="donation-page__emoji">&#9829;</span>
        <h1 className="donation-page__title">Tu m'offres un café?</h1>
        <p className="donation-page__subtitle">
          FilmMatching est <strong>100% gratuit</strong>. Le site et l'application mobile sont
          {" "}<strong>développés et maintenus par une seule personne</strong>{" "}
          sur son temps libre. <strong>Chaque don, chaque centime, est une énorme source de motivation</strong>{" "}
        </p>
      </div>

      {/* Les 2 raisons de soutenir le projet */}
      <div className="donation-page__reasons">

        {/* Raison 1 : Projet passion solo */}
        <div className="donation-page__reason-card">
          <span className="donation-page__reason-icon">&#128187;</span>
          <h3 className="donation-page__reason-title">Un projet passion</h3>
          <p className="donation-page__reason-text">
            Design, code, serveurs, support — tout est fait par une seule
            personne. Chaque don encourage à continuer le projet.
          </p>
        </div>

        {/* Raison 2 : Les serveurs coûtent */}
        <div className="donation-page__reason-card">
          <span className="donation-page__reason-icon">&#9889;</span>
          <h3 className="donation-page__reason-title">Les coûts de fonctionnement</h3>
          <p className="donation-page__reason-text">
            Hébergement, nom de domaine, base de données... Les dons
            permettent de couvrir ces frais et de garder FilmMatching gratuit
            pour tout le monde.
          </p>
        </div>
      </div>

      {/* Bouton CTA vers Tipeee — ouvre la page dans un nouvel onglet */}
      <a
        href="https://fr.tipeee.com/filmmatching/"
        target="_blank"
        rel="noopener noreferrer"
        className="donation-page__tipeee-button"
      >
        Soutenir sur Tipeee
      </a>

      {/* Message de remerciement */}
      <p className="donation-page__thanks">
        Merci du fond du coeur. Chaque contribution, même petite, fait une vraie
        différence.
      </p>
    </div>
  );
}

export default Donation;
