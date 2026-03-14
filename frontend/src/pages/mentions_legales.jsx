import { useNavigate } from "react-router-dom";
import TmdbAttribution from "../components/TmdbAttribution";
import "../styles/RGPD.css";

/**
 * MentionsLegales — Page des mentions légales obligatoires.
 *
 * En France, tout site internet doit afficher des mentions légales
 * qui identifient le responsable du site et son hébergeur
 * (loi n° 2004-575 du 21 juin 2004 — LCEN).
 *
 * On réutilise le CSS de la page RGPD (même structure et même style).
 *
 * @returns {JSX.Element} La page mentions légales
 */
function MentionsLegales() {
  const navigate = useNavigate();

  return (
    <div className="rgpd">
      {/* Header avec bouton retour */}
      <div className="rgpd__header">
        <button
          className="rgpd__back-btn"
          onClick={() => navigate(-1)}
          aria-label="Retour"
        >
          ←
        </button>
        <h1 className="rgpd__header-title">Mentions légales</h1>
      </div>

      <div className="rgpd__content">
        <p className="rgpd__last-updated">Dernière mise à jour : 9 mars 2026</p>

        {/* 1. Éditeur du site */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">1. Éditeur du site</h2>
          <p className="rgpd__text">
            Le site <span className="rgpd__highlight">FilmMatching</span> édité par :
          </p>
          <ul className="rgpd__list">
            <li>
              <span className="rgpd__highlight">Email de contact</span> — [contact@filmmatching.com]
            </li>
          </ul>
        </section>

        {/* 2. Hébergeur */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">2. Hébergeur</h2>
          <p className="rgpd__text">
            Le site est hébergé par :
          </p>
          <ul className="rgpd__list">
            <li>
              <span className="rgpd__highlight">Nom</span> — [Hostinger]
            </li>
            <li>
              <span className="rgpd__highlight">Site web</span> — [https://www.hostinger.com/]
            </li>
          </ul>
        </section>

        {/* 3. Propriété intellectuelle */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">3. Propriété intellectuelle</h2>
          <p className="rgpd__text">
            Le code source de FilmMatching est la propriété de son auteur. Tous les éléments
            du site (textes, code, mise en page) sont protégés par le droit d'auteur.
          </p>
          <p className="rgpd__text">
            Les données sur les films et séries (titres, affiches, synopsis, etc.) proviennent
            de l'API de <span className="rgpd__highlight">The Movie Database (TMDB)</span> et
            sont la propriété de leurs ayants droit respectifs. Ce produit utilise l'API TMDB
            mais n'est ni approuvé ni certifié par TMDB.
          </p>
        </section>

        {/* 4. Données personnelles */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">4. Données personnelles</h2>
          <p className="rgpd__text">
            La collecte et le traitement des données personnelles sont décrits dans notre{" "}
            <span
              className="rgpd__link"
              onClick={() => navigate("/rgpd")}
              role="link"
              tabIndex={0}
            >
              Politique de confidentialité
            </span>.
          </p>
          <p className="rgpd__text">
            Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un
            droit d'accès, de rectification, de suppression et de portabilité de vos données.
            Pour exercer ces droits, rendez-vous sur la page "Mon compte" ou contactez-nous
            par email.
          </p>
        </section>

        {/* 5. Cookies */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">5. Cookies et stockage local</h2>
          <p className="rgpd__text">
            FilmMatching n'utilise pas de cookies.
          </p>
        </section>

        {/* 6. Responsabilité */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">6. Limitation de responsabilité</h2>
          <p className="rgpd__text">
            FilmMatching est fourni "en l'état", sans garantie d'aucune sorte. L'éditeur
            ne saurait être tenu responsable des éventuels dysfonctionnements, interruptions
            de service ou inexactitudes dans les données affichées (provenant de TMDB).
          </p>
          <p className="rgpd__text">
            L'utilisateur est seul responsable de l'utilisation qu'il fait du service et
            de la confidentialité de ses identifiants de connexion.
          </p>
        </section>

        {/* 7. Droit applicable */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">7. Droit applicable</h2>
          <p className="rgpd__text">
            Les présentes mentions légales sont régies par le droit français. En cas de litige,
            les tribunaux français seront seuls compétents.
          </p>
        </section>
      </div>

      <TmdbAttribution />
    </div>
  );
}

export default MentionsLegales;
