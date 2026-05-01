import { useState } from "react";
import Film from "./Film";
import StarRating from "./StarRating";
import RatingPrompt from "./RatingPrompt";
import { getAvatarUrl } from "../utils/avatars";
import "../styles/FilmDetailModal.css";
import "../styles/FriendAvatars.css";

/**
 * Modale qui affiche la fiche complète d'un film.
 *
 * Réutilise le composant Film (celui de la page Home) pour afficher
 * l'affiche, le synopsis, les genres, les plateformes, etc.
 *
 * 3 contextes d'utilisation :
 *
 * 1) Page "Ma liste" / "À l'affiche" : modale d'info pure, aucune action.
 * 2) Page "Matchs" (mode 1v1 ou groupe) : modale d'info + section
 *    "Aussi aimé par" si la prop `friends` est fournie.
 * 3) Page "Filmothèque d'un ami" (nouvel onglet) : modale d'info enrichie avec
 *    - la note de l'ami (read-only)
 *    - un badge "ton statut" si je l'ai déjà swipé
 *    - 2 boutons d'action si je n'ai jamais swipé ce film :
 *        • "Ajouter à ma watchlist" (= like)
 *        • "Je l'ai déjà vu aussi" (= seen, ouvre un mini RatingPrompt)
 *
 * Tous les nouveaux paramètres sont optionnels : la modale reste
 * compatible avec les usages existants.
 *
 * @param {Object} props
 * @param {Object|null} props.film - Le film à afficher (null = modale fermée)
 * @param {Function} props.onClose - Appelée quand l'utilisateur ferme la modale
 * @param {Array<{username: string, avatar: string}>} [props.friends] - Amis qui ont aussi liké ce film
 * @param {string} [props.friendName] - Pseudo de l'ami (filmothèque)
 * @param {number|null} [props.friendRating] - Note de l'ami sur ce film (0.5-5)
 * @param {string|null} [props.myStatus] - Mon statut sur ce film : "like", "dislike", "seen", ou null
 * @param {Function} [props.onAddToWatchlist] - Appelée quand on clique "Ajouter à ma watchlist"
 * @param {Function} [props.onMarkAsSeen] - Appelée avec (rating | null) quand on valide "Déjà vu aussi"
 * @returns {JSX.Element|null} La modale ou null si pas de film
 */
function FilmDetailModal({
  film,
  onClose,
  friends = [],
  friendName,
  friendRating = null,
  myStatus = null,
  onAddToWatchlist,
  onMarkAsSeen,
}) {
  // État du formulaire de notation : false = boutons d'action affichés,
  // true = le mini RatingPrompt est affiché (l'utilisateur a cliqué "Je l'ai déjà vu aussi").
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  // true pendant l'appel API d'enregistrement du swipe (bloque les doubles clics).
  const [saving, setSaving] = useState(false);

  // Si aucun film n'est sélectionné, on n'affiche rien
  if (!film) return null;

  /**
   * Texte du badge "mon statut" affiché dans la section filmothèque.
   * Renvoie null si aucun badge ne doit être affiché.
   */
  function getMyStatusBadge() {
    if (myStatus === "like") return { label: "Dans ta watchlist", icon: "❤️", className: "like" };
    if (myStatus === "seen") return { label: "Tu l'as déjà vu", icon: "👁️", className: "seen" };
    if (myStatus === "dislike") return { label: "Pas pour toi", icon: "✕", className: "dislike" };
    return null;
  }

  /**
   * Clic sur "Ajouter à ma watchlist" : crée un swipe "like" via le parent.
   * Le parent gère l'appel API et met à jour son state pour que le badge
   * apparaisse automatiquement (passe à my_status="like").
   */
  async function handleAddToWatchlist() {
    if (!onAddToWatchlist || saving) return;
    setSaving(true);
    try {
      await onAddToWatchlist(film);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Validation du RatingPrompt : crée un swipe "seen" avec ou sans note.
   * @param {number|null} rating - La note choisie (ou null si "Sans note")
   */
  async function handleConfirmSeen(rating) {
    if (!onMarkAsSeen || saving) return;
    setSaving(true);
    try {
      await onMarkAsSeen(film, rating);
      setShowRatingPrompt(false);
    } finally {
      setSaving(false);
    }
  }

  // Indique si on est dans le contexte "filmothèque d'un ami".
  // On affiche la section filmothèque seulement si au moins une de ces
  // props contextuelles est fournie (sinon la modale reste un info pure).
  const isFriendShelfContext =
    friendRating !== null ||
    myStatus !== null ||
    !!onAddToWatchlist ||
    !!onMarkAsSeen;

  const myBadge = getMyStatusBadge();

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
            trailer_url={film.trailer_url}
          />
        </div>

        {/* Section filmothèque : note de l'ami + badge mon statut + actions.
            Visible uniquement dans le contexte "filmothèque d'un ami". */}
        {isFriendShelfContext && (
          <div className="film-detail-modal__shelf">
            {/* Note de l'ami (read-only) */}
            {friendRating !== null && friendRating !== undefined && (
              <div className="film-detail-modal__shelf-row">
                <span className="film-detail-modal__shelf-label">
                  Note de {friendName || "ton ami"}
                </span>
                <StarRating value={parseFloat(friendRating)} onChange={() => {}} readOnly />
              </div>
            )}

            {/* Badge "mon statut" si déjà swipé */}
            {myBadge && (
              <div className={`film-detail-modal__my-badge film-detail-modal__my-badge--${myBadge.className}`}>
                <span className="film-detail-modal__my-badge-icon">{myBadge.icon}</span>
                <span>{myBadge.label}</span>
              </div>
            )}

            {/* Actions disponibles uniquement si le user n'a jamais swipé ce film.
                Le RatingPrompt remplace les boutons quand "Déjà vu aussi" est cliqué. */}
            {myStatus === null && !showRatingPrompt && (
              <div className="film-detail-modal__shelf-actions">
                {onAddToWatchlist && (
                  <button
                    type="button"
                    className="film-detail-modal__action film-detail-modal__action--like"
                    onClick={handleAddToWatchlist}
                    disabled={saving}
                  >
                    ❤️ Ajouter à ma watchlist
                  </button>
                )}
                {onMarkAsSeen && (
                  <button
                    type="button"
                    className="film-detail-modal__action film-detail-modal__action--seen"
                    onClick={() => setShowRatingPrompt(true)}
                    disabled={saving}
                  >
                    👁️ Je l'ai déjà vu aussi
                  </button>
                )}
              </div>
            )}

            {/* Mini stepper de notation inline. Apparaît à la place des boutons
                quand l'utilisateur a cliqué "Je l'ai déjà vu aussi". */}
            {myStatus === null && showRatingPrompt && (
              <RatingPrompt
                title="Quelle note tu lui mets ?"
                onSave={handleConfirmSeen}
                onCancel={() => setShowRatingPrompt(false)}
                saving={saving}
              />
            )}
          </div>
        )}

        {/* Section "Aussi aimé par" — visible seulement si des amis ont liké */}
        {friends.length > 0 && (
          <div className="film-detail-modal__friends">
            <div className="friend-likes-section">
              <span className="friend-likes-section__title">
                Aussi aimé par
              </span>
              <div className="friend-likes-section__list">
                {friends.map((friend, index) => (
                  <div key={index} className="friend-likes-section__chip">
                    <div className="friend-likes-section__chip-avatar">
                      <img
                        className="friend-likes-section__chip-img"
                        src={getAvatarUrl(friend.avatar)}
                        alt={friend.username}
                      />
                    </div>
                    <span className="friend-likes-section__chip-name">
                      {friend.username}
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
