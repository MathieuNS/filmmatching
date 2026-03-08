import Film from "./Film";
import "../styles/FilmDetailModal.css";
import "../styles/FriendAvatars.css";

/**
 * Modale qui affiche la fiche complète d'un film.
 *
 * Réutilise le composant Film (celui de la page Home) pour afficher
 * l'affiche, le synopsis, les genres, les plateformes, etc.
 * Si des noms d'amis sont fournis (friendNames), une section
 * "Aussi aimé par" s'affiche en bas de la modale.
 *
 * @param {Object} props
 * @param {Object|null} props.film - Le film à afficher (null = modale fermée)
 * @param {Function} props.onClose - Appelée quand l'utilisateur ferme la modale
 * @param {string[]} [props.friendNames] - Liste des pseudos d'amis qui ont aussi liké ce film
 * @returns {JSX.Element|null} La modale ou null si pas de film
 */
function FilmDetailModal({ film, onClose, friendNames = [] }) {
  // Si aucun film n'est sélectionné, on n'affiche rien
  if (!film) return null;

  return (
    <div className="film-detail-backdrop" onClick={onClose}>
      {/* stopPropagation empêche le clic sur la carte de fermer la modale */}
      <div
        className="film-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer en haut à droite */}
        <button
          className="film-detail-modal__close"
          onClick={onClose}
          aria-label="Fermer"
        >
          ✕
        </button>

        {/* Le composant Film existant, identique à celui de la page Home */}
        <div className="film-detail-modal__card">
          <Film
            title={film.title}
            img={film.img}
            synopsis={film.synopsis}
            tags={film.genres}
            plateform={film.plateforms}
            type={film.type}
            main_actors={film.main_actors ? film.main_actors.join(", ") : ""}
            release_year={film.release_year}
            director={film.director}
          />
        </div>

        {/* Section "Aussi aimé par" — visible seulement si des amis ont liké */}
        {friendNames.length > 0 && (
          <div className="film-detail-modal__friends">
            <div className="friend-likes-section">
              <span className="friend-likes-section__title">
                Aussi aimé par
              </span>
              <div className="friend-likes-section__list">
                {friendNames.map((name, index) => (
                  <div key={index} className="friend-likes-section__chip">
                    <div className="friend-likes-section__chip-avatar">
                      <span className="friend-likes-section__chip-letter">
                        {name.charAt(0)}
                      </span>
                    </div>
                    <span className="friend-likes-section__chip-name">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilmDetailModal;
