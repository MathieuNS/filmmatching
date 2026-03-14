import { useNavigate } from "react-router-dom";
import TmdbAttribution from "../components/TmdbAttribution";
import "../styles/RGPD.css";

/**
 * RGPD — Page de politique de confidentialité et protection des données.
 *
 * Cette page informe les utilisateurs sur :
 * - Les données personnelles collectées par FilmMatching
 * - Comment ces données sont utilisées
 * - Leurs droits (accès, modification, suppression)
 * - Les conditions de conservation des données
 *
 * C'est une obligation légale imposée par le Règlement Général sur
 * la Protection des Données (RGPD) de l'Union Européenne.
 *
 * @returns {JSX.Element} La page RGPD
 */
function RGPD() {
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
        <h1 className="rgpd__header-title">Politique de confidentialité</h1>
      </div>

      <div className="rgpd__content">
        <p className="rgpd__last-updated">Dernière mise à jour : 9 mars 2026</p>

        {/* 1. Introduction */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">1. Introduction</h2>
          <p className="rgpd__text">
            La présente politique de confidentialité vous informe sur la manière dont vos données personnelles
            sont collectées, utilisées et protégées conformément au Règlement Général sur
            la Protection des Données (RGPD — Règlement UE 2016/679).
          </p>
        </section>

        {/* 2. Responsable du traitement */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">2. Responsable du traitement</h2>
          <p className="rgpd__text">
            Le responsable du traitement des données est le développeur de FilmMatching.
            Pour toute question relative à vos données personnelles, vous pouvez nous
            contacter via la page{" "}
            <span
              className="rgpd__link"
              onClick={() => navigate("/contact")}
              role="link"
              tabIndex={0}
            >
              Contact
            </span>.
          </p>
        </section>

        {/* 3. Données collectées */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">3. Données collectées</h2>
          <p className="rgpd__text">
            FilmMatching collecte uniquement les données nécessaires au fonctionnement du service :
          </p>
          <ul className="rgpd__list">
            <li>
              <span className="rgpd__highlight">Nom d'utilisateur</span> — pour vous identifier
              auprès de vos amis
            </li>
            <li>
              <span className="rgpd__highlight">Adresse email</span> — pour la création de votre
              compte et la récupération d'accès
            </li>
            <li>
              <span className="rgpd__highlight">Mot de passe</span> — stocké sous forme chiffrée
              (hashé)
            </li>
            <li>
              <span className="rgpd__highlight">Préférences de swipe</span> — vos likes, dislikes
              et films déjà vus, nécessaires pour calculer les matchs avec vos amis
            </li>
            <li>
              <span className="rgpd__highlight">Relations d'amitié</span> — les liens entre votre
              compte et ceux de vos amis
            </li>
          </ul>
        </section>

        {/* 4. Finalité du traitement */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">4. Pourquoi ces données sont collectées</h2>
          <p className="rgpd__text">Vos données sont utilisées exclusivement pour :</p>
          <ul className="rgpd__list">
            <li>Vous permettre de créer et gérer votre compte</li>
            <li>Afficher des films et séries à swiper</li>
            <li>Calculer les matchs entre vous et vos amis (films aimés en commun)</li>
            <li>Afficher votre liste de films likés et vos matchs</li>
          </ul>
          <p className="rgpd__text">
            Aucune donnée n'est utilisée à des fins publicitaires, de profilage commercial
            ou revendue à des tiers.
          </p>
        </section>

        {/* 5. Base légale */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">5. Base légale du traitement</h2>
          <p className="rgpd__text">
            Le traitement de vos données repose sur votre <span className="rgpd__highlight">
            consentement</span> (article 6.1.a du RGPD), donné lors de la création de votre
            compte, ainsi que sur l'<span className="rgpd__highlight">exécution du service</span>{" "}
            (article 6.1.b) — les données sont nécessaires pour que l'application fonctionne.
          </p>
        </section>

        {/* 6. Partage des données */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">6. Partage des données</h2>
          <p className="rgpd__text">
            Vos données personnelles ne sont partagées avec aucun tiers. Seules les informations
            suivantes sont visibles par vos amis sur la plateforme :
          </p>
          <ul className="rgpd__list">
            <li>Votre nom d'utilisateur</li>
            <li>Les films que vous avez likés en commun (matchs)</li>
          </ul>
          <p className="rgpd__text">
            Vos dislikes et films marqués "déjà vu" restent privés et ne sont jamais visibles
            par d'autres utilisateurs.
          </p>
        </section>

        {/* 7. Données de TMDB */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">7. Données tierces (TMDB)</h2>
          <p className="rgpd__text">
            Les informations sur les films et séries (titres, affiches, synopsis, etc.)
            proviennent de l'API de <span className="rgpd__highlight">The Movie Database (TMDB)</span>.
            Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.
            Aucune de vos données personnelles n'est transmise à TMDB.
          </p>
        </section>

        {/* 8. Conservation */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">8. Durée de conservation</h2>
          <p className="rgpd__text">
            Vos données sont conservées tant que votre compte est actif. Si vous supprimez
            votre compte, toutes vos données personnelles (profil, swipes, relations d'amitié)
            sont supprimées définitivement et immédiatement de la base de données.
          </p>
        </section>

        {/* 9. Sécurité */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">9. Sécurité des données</h2>
          <p className="rgpd__text">
            FilmMatching met en place les mesures suivantes pour protéger vos données :
          </p>
          <ul className="rgpd__list">
            <li>Mots de passe hashés</li>
            <li>Authentification par tokens à durée limitée</li>
            <li>Accès aux données protégé par authentification sur chaque requête API</li>
          </ul>
        </section>

        {/* 10. Vos droits */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">10. Vos droits</h2>
          <p className="rgpd__text">
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul className="rgpd__list">
            <li>
              <span className="rgpd__highlight">Droit d'accès</span> — consulter les données
              que nous détenons sur vous (visibles dans "Mon compte")
            </li>
            <li>
              <span className="rgpd__highlight">Droit de rectification</span> — modifier vos
              informations personnelles
            </li>
            <li>
              <span className="rgpd__highlight">Droit à l'effacement</span> — supprimer votre
              compte et toutes les données associées (bouton disponible dans "Mon compte")
            </li>
            <li>
              <span className="rgpd__highlight">Droit à la portabilité</span> — récupérer vos
              données dans un format lisible
            </li>
            <li>
              <span className="rgpd__highlight">Droit de retrait du consentement</span> — vous
              pouvez à tout moment supprimer votre compte
            </li>
          </ul>
        </section>

        {/* 11. Cookies */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">11. Cookies et stockage local</h2>
          <p className="rgpd__text">
            FilmMatching n'utilise pas de cookies. Seuls des tokens d'authentification
            sont stockés dans le <span className="rgpd__highlight">localStorage</span> de votre
            navigateur pour maintenir votre session. Ces tokens sont automatiquement supprimés
            lors de la déconnexion.
          </p>
        </section>

        {/* 12. Modifications */}
        <section className="rgpd__section">
          <h2 className="rgpd__section-title">12. Modifications de cette politique</h2>
          <p className="rgpd__text">
            Cette politique de confidentialité peut être mise à jour. La date de dernière
            modification est indiquée en haut de cette page. En cas de changement significatif,
            les utilisateurs en seront informés.
          </p>
        </section>
      </div>

      <TmdbAttribution />
    </div>
  );
}

export default RGPD;
