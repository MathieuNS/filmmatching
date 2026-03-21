import { useState, useEffect, useRef } from "react";
// createPortal permet de rendre un élément React en dehors de son parent DOM.
// Ici, on l'utilise pour afficher la modale du trailer directement dans le <body>,
// afin d'éviter les conflits d'événements avec la carte film (swipe, clics, etc.).
import { createPortal } from "react-dom";
// Import du fichier CSS associé au composant
import "../styles/Films.css";

/**
 * Composant Film - Carte immersive affichant un film ou une série.
 *
 * L'affiche du film est utilisée en fond, avec un dégradé sombre
 * en bas pour rendre le texte lisible. Toutes les infos sont
 * superposées sur l'image (style Netflix/Tinder).
 *
 * Chaque section de texte (synopsis, acteurs, genres, plateformes)
 * détecte automatiquement si son contenu est tronqué. Si c'est le
 * cas, un lien "voir plus" apparaît pour déplier la section.
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
  trailer_url,
}) {
  // --- State pour afficher/masquer le lecteur de bande-annonce ---
  const [showTrailer, setShowTrailer] = useState(false);
  // --- State pour afficher/masquer l'overlay des plateformes ---
  const [showPlatforms, setShowPlatforms] = useState(false);

  // --- States pour savoir si chaque section est dépliée ---
  const [expanded, setExpanded] = useState({
    synopsis: false,
    actors: false,
    tags: false,
    platforms: false,
  });

  // --- States pour savoir si chaque section EST tronquée ---
  // (true = le contenu dépasse et est coupé → on affiche "voir plus")
  const [truncated, setTruncated] = useState({
    synopsis: false,
    actors: false,
    tags: false,
    platforms: false,
  });

  // --- Refs vers les éléments DOM pour mesurer la troncature ---
  // On compare scrollHeight (hauteur totale du contenu) avec
  // clientHeight (hauteur visible). Si scrollHeight > clientHeight,
  // le contenu est tronqué.
  const synopsisRef = useRef(null);
  const actorsRef = useRef(null);
  const tagsRef = useRef(null);
  const platformsRef = useRef(null);

  // Réinitialiser les sections dépliées quand le film change
  // (sinon le "voir plus" resterait ouvert d'un film à l'autre)
  useEffect(() => {
    setExpanded({
      synopsis: false,
      actors: false,
      tags: false,
      platforms: false,
    });
  }, [title, img]);

  // Vérifier la troncature après chaque rendu
  // On ne vérifie que les sections qui sont repliées (collapsed),
  // car une section dépliée a forcément scrollHeight === clientHeight
  useEffect(() => {
    const checks = {
      synopsis: synopsisRef,
      actors: actorsRef,
      tags: tagsRef,
      platforms: platformsRef,
    };

    setTruncated((prev) => {
      const next = { ...prev };
      for (const [key, ref] of Object.entries(checks)) {
        // Si la section est dépliée, on garde la valeur précédente
        // (on sait déjà qu'elle était tronquée puisqu'on l'a dépliée)
        if (!expanded[key] && ref.current) {
          next[key] = ref.current.scrollHeight > ref.current.clientHeight;
        }
      }
      return next;
    });
  }, [synopsis, main_actors, tags, plateform, expanded]);

  /**
   * Bascule l'état déplié/replié d'une section.
   *
   * @param {string} field - Le nom de la section ("synopsis", "actors", etc.)
   */
  function toggleExpand(field) {
    setExpanded((prev) => ({ ...prev, [field]: !prev[field] }));
  }

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

        {/* Boutons d'action : bande-annonce + où regarder */}
        <div className="film-card__action-buttons">
          {/* Bouton bande-annonce — visible uniquement si trailer_url existe */}
          {trailer_url && (
            <button
              className="film-card__trailer-btn"
              onClick={() => setShowTrailer(true)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              ▶ Bande-annonce
            </button>
          )}

          {/* Bouton "Où regarder" — visible uniquement si des plateformes existent */}
          {plateform && plateform.length > 0 && (
            <button
              className="film-card__platforms-btn"
              onClick={() => setShowPlatforms(true)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              📺 Regarder
            </button>
          )}
        </div>

        {/* Synopsis — tronqué à 3 lignes par défaut, dépliable */}
        {synopsis && (
          <div className="film-card__section">
            <p
              className={`film-card__synopsis ${
                expanded.synopsis ? "film-card__synopsis--expanded" : ""
              }`}
              ref={synopsisRef}
            >
              {synopsis}
            </p>
            {(truncated.synopsis || expanded.synopsis) && (
              <button
                className="film-card__see-more"
                onClick={() => toggleExpand("synopsis")}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {expanded.synopsis ? "voir moins" : "voir plus"}
              </button>
            )}
          </div>
        )}

        {/* Réalisateur */}
        {director && (
          <p className="film-card__director">
            <span className="film-card__label">Réalisateur :</span> {director}
          </p>
        )}

        {/* Acteurs principaux — tronqué à 1 ligne par défaut, dépliable */}
        {main_actors && (
          <div className="film-card__section">
            <p
              className={`film-card__actors ${
                expanded.actors ? "film-card__actors--expanded" : ""
              }`}
              ref={actorsRef}
            >
              <span className="film-card__label">Acteurs :</span> {main_actors}
            </p>
            {(truncated.actors || expanded.actors) && (
              <button
                className="film-card__see-more"
                onClick={() => toggleExpand("actors")}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {expanded.actors ? "voir moins" : "voir plus"}
              </button>
            )}
          </div>
        )}

        {/* Tags / Genres — tronqué à 1 ligne par défaut, dépliable */}
        {tags && tags.length > 0 && (
          <div className="film-card__section">
            <div
              className={`film-card__tags ${
                expanded.tags ? "film-card__tags--expanded" : ""
              }`}
              ref={tagsRef}
            >
              {tags.map((tag, index) => (
                <span key={index} className="film-card__tag">
                  {tag}
                </span>
              ))}
            </div>
            {(truncated.tags || expanded.tags) && (
              <button
                className="film-card__see-more"
                onClick={() => toggleExpand("tags")}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {expanded.tags ? "voir moins" : "voir plus"}
              </button>
            )}
          </div>
        )}

        {/* Plateformes de streaming — tronqué à 1 ligne par défaut, dépliable */}
        {plateform && plateform.length > 0 && (
          <div className="film-card__section">
            <div
              className={`film-card__platforms ${
                expanded.platforms ? "film-card__platforms--expanded" : ""
              }`}
              ref={platformsRef}
            >
              <span className="film-card__label">Disponible sur :</span>
              {/* plateform est maintenant un tableau d'objets {plateform, logo, link}
                  au lieu de simples strings. On affiche le nom de la plateforme. */}
              {plateform.map((plat, index) => (
                <span key={index} className="film-card__platform">
                  {plat.plateform}
                </span>
              ))}
            </div>
            {(truncated.platforms || expanded.platforms) && (
              <button
                className="film-card__see-more"
                onClick={() => toggleExpand("platforms")}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {expanded.platforms ? "voir moins" : "voir plus"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modale du lecteur YouTube — rendue dans le <body> via createPortal
          pour éviter les conflits d'événements avec le swipe de la carte */}
      {showTrailer && createPortal(
        <div
          className="film-card__trailer-backdrop"
          onClick={() => setShowTrailer(false)}
        >
          <div
            className="film-card__trailer-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton pour fermer la modale */}
            <button
              className="film-card__trailer-close"
              onClick={() => setShowTrailer(false)}
            >
              ✕
            </button>

            {/* Lecteur YouTube intégré via iframe.
                L'URL est déjà au format embed (ex: https://www.youtube.com/embed/xxxxx).
                allowFullScreen permet au lecteur de passer en plein écran. */}
            <iframe
              className="film-card__trailer-iframe"
              src={trailer_url}
              title={`Bande-annonce de ${title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>,
        document.body
      )}

      {/* Overlay des plateformes — liste des plateformes avec logo et lien.
          Rendu dans le <body> via createPortal (même raison que le trailer). */}
      {showPlatforms && createPortal(
        <div
          className="film-card__trailer-backdrop"
          onClick={() => setShowPlatforms(false)}
        >
          <div
            className="film-card__platforms-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <button
              className="film-card__trailer-close"
              onClick={() => setShowPlatforms(false)}
            >
              ✕
            </button>

            <h3 className="film-card__platforms-modal-title">Où regarder</h3>

            {/* Liste des plateformes cliquables */}
            <div className="film-card__platforms-list">
              {plateform.map((plat, index) => (
                <a
                  key={index}
                  href={plat.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`film-card__platform-link ${!plat.link ? "film-card__platform-link--disabled" : ""}`}
                  onClick={(e) => {
                    // Si pas de lien disponible, on empeche la navigation
                    if (!plat.link) e.preventDefault();
                  }}
                >
                  {/* Logo de la plateforme (ou placeholder si pas de logo) */}
                  {plat.logo ? (
                    <img
                      className="film-card__platform-logo"
                      src={plat.logo}
                      alt={plat.plateform}
                    />
                  ) : (
                    <div className="film-card__platform-logo-placeholder">
                      {plat.plateform.charAt(0)}
                    </div>
                  )}
                  <span className="film-card__platform-name">{plat.plateform}</span>
                </a>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Film;
