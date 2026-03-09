import { Link } from "react-router-dom";
import "../styles/TmdbAttribution.css";

/**
 * TmdbAttribution — Footer global affiché en bas de toutes les pages.
 *
 * Contient deux éléments :
 * - La mention légale TMDB (obligatoire selon leurs conditions d'utilisation)
 * - Un lien vers la page de politique de confidentialité (RGPD)
 *
 * Ce composant est volontairement discret : petit texte gris,
 * placé tout en bas de la page.
 *
 * @returns {JSX.Element} Le footer avec le logo TMDB, la mention et le lien RGPD
 */
function TmdbAttribution() {
  return (
    <footer className="tmdb-attribution">
      <div className="tmdb-attribution__tmdb">
        <img
          className="tmdb-attribution__logo"
          src="/tmdb-logo.svg"
          alt="Logo TMDB"
        />
        <p className="tmdb-attribution__text">
          Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.
        </p>
      </div>
      <span className="tmdb-attribution__separator">·</span>
      <Link to="/rgpd" className="tmdb-attribution__link">
        Politique de confidentialité
      </Link>
    </footer>
  );
}

export default TmdbAttribution;
