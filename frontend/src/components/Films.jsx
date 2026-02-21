import React from "react";
// Import du fichier CSS associé au composant
import "../styles/Films.css";

/**
 * Composant Film - Carte réutilisable affichant les informations d'un film ou d'une série.
 *
 * Ce composant est utilisé sur plusieurs pages de l'application :
 * - Page d'accueil (swipe)
 * - Liste des films likés
 * - Page des matchs
 *
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.title - Le titre du film ou de la série
 * @param {string} props.img - L'URL de l'affiche/image du film
 * @param {string} props.synopsis - Le résumé du film
 * @param {string[]} props.tags - Les genres/catégories (ex: ["Action", "Sci-Fi"])
 * @param {string[]} props.plateform - Les plateformes de streaming (ex: ["Netflix", "Disney+"])
 * @param {string} props.type - Le type de contenu : "Film" ou "Serie"
 * @param {string} props.main_actors - Les acteurs principaux
 * @param {number} props.release_year - L'année de sortie
 * @param {string} props.director - Le réalisateur
 * @returns {JSX.Element} La carte du film
 */
function Film({
  title,
  img,
  synopsis,
  tags,
  plateform,
  type,
  main_actors,
  release_year,
  director,
}) {
  return (
    // Conteneur principal de la carte
    <div className="film-card">

      {/* --- Section image --- */}
      <div className="film-card__image-wrapper">
        <img
          className="film-card__image"
          src={img}
          alt={`Affiche de ${title}`}
        />
      </div>

      {/* --- Section informations principales --- */}
      <div className="film-card__body">

        {/* Ligne du haut : badge type (Film/Serie) + année de sortie */}
        <div className="film-card__meta">
          {/* Le badge change de couleur selon le type (Film ou Serie) */}
          <span
            className={`film-card__type-badge ${
              type === "Film"
                ? "film-card__type-badge--film"
                : "film-card__type-badge--serie"
            }`}
          >
            {type}
          </span>

          {/* Année de sortie affichée à droite */}
          {release_year && (
            <span className="film-card__year">{release_year}</span>
          )}
        </div>

        {/* Titre du film */}
        <h2 className="film-card__title">{title}</h2>

        {/* Réalisateur (affiché seulement s'il est fourni) */}
        {director && (
          <p className="film-card__director">
            <span className="film-card__label">Réalisateur :</span> {director}
          </p>
        )}

        {/* Acteurs principaux (affichés seulement s'ils sont fournis) */}
        {main_actors && (
          <p className="film-card__actors">
            <span className="film-card__label">Acteurs :</span> {main_actors}
          </p>
        )}

        {/* Séparateur visuel */}
        <hr className="film-card__divider" />

        {/* Synopsis du film */}
        {synopsis && <p className="film-card__synopsis">{synopsis}</p>}

        {/* Séparateur visuel */}
        <hr className="film-card__divider" />

        {/* Liste des tags/genres affichés sous forme de badges */}
        {tags && tags.length > 0 && (
          <div className="film-card__tags">
            {tags.map((tag, index) => (
              // Chaque tag est un petit badge cliquable visuellement
              <span key={index} className="film-card__tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Liste des plateformes de streaming affichées sous forme de badges */}
        {plateform && plateform.length > 0 && (
          <div className="film-card__platforms">
            {plateform.map((plat, index) => (
              <span key={index} className="film-card__platform">
                {plat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Film;
