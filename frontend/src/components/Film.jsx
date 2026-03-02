import React from "react";
// Import du fichier CSS associé au composant
import "../styles/Films.css";

/**
 * Composant Film - Carte immersive affichant un film ou une série.
 *
 * L'affiche du film est utilisée en fond, avec un dégradé sombre
 * en bas pour rendre le texte lisible. Toutes les infos sont
 * superposées sur l'image (style Netflix/Tinder).
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
    // Conteneur principal : position relative pour superposer le contenu sur l'image
    <div className="film-card">

      {/* --- Image de fond (l'affiche du film) --- */}
      <img
        className="film-card__image"
        src={img}
        alt={`Affiche de ${title}`}
      />

      {/* --- Dégradé sombre superposé sur l'image --- */}
      {/* Ce dégradé part du transparent en haut vers le noir en bas,
          pour que le texte soit lisible sur l'image */}
      <div className="film-card__gradient" />

      {/* --- Contenu textuel superposé en bas de la carte --- */}
      <div className="film-card__overlay">

        {/* Ligne du haut : badge type (Film/Serie) + année de sortie */}
        <div className="film-card__meta">
          <span
            className={`film-card__type-badge ${
              type === "Film"
                ? "film-card__type-badge--film"
                : "film-card__type-badge--serie"
            }`}
          >
            {type}
          </span>

          {release_year && (
            <span className="film-card__year">{release_year}</span>
          )}
        </div>

        {/* Titre du film */}
        <h2 className="film-card__title">{title}</h2>

        {/* Synopsis (limité à 3 lignes pour rester compact) */}
        {synopsis && (
          <p className="film-card__synopsis">{synopsis}</p>
        )}

        {/* Réalisateur */}
        {director && (
          <p className="film-card__director">
            <span className="film-card__label">Réalisateur :</span> {director}
          </p>
        )}

        {/* Acteurs principaux */}
        {main_actors && (
          <p className="film-card__actors">
            <span className="film-card__label">Acteurs :</span> {main_actors}
          </p>
        )}

        {/* Tags / Genres */}
        {tags && tags.length > 0 && (
          <div className="film-card__tags">
            {tags.map((tag, index) => (
              <span key={index} className="film-card__tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Plateformes de streaming */}
        {plateform && plateform.length > 0 && (
          <div className="film-card__platforms">
            <span className="film-card__label">Disponible sur :</span>
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
