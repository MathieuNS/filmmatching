import { useState } from "react";
import { createPortal } from "react-dom";
import StarRating from "./StarRating";
import CommentModal from "./CommentModal";
import { getAvatarUrl } from "../utils/avatars";
import "../styles/FriendRatings.css";

/**
 * Construit la ligne de récap "X amis sur Y ont noté".
 *
 * Adapte la formulation selon trois cas :
 * - Tous les amis ont noté : "3 amis ont noté ce film"
 * - Aucun ami n'a noté (que des "vu sans note") : "2 amis l'ont vu, sans note"
 * - Mixte : "3 amis sur 5 ont noté"
 *
 * Gère le singulier/pluriel à la française.
 *
 * @param {number} ratedCount - Nombre d'amis ayant donné une note
 * @param {number} seenCount - Nombre total d'amis ayant vu le film
 * @returns {string} La phrase de récap
 */
function getCountLine(ratedCount, seenCount) {
  if (ratedCount === 0) {
    if (seenCount === 1) {
      return "1 ami l'a vu, sans note";
    }
    return `${seenCount} amis l'ont vu, sans note`;
  }
  if (ratedCount === seenCount) {
    if (ratedCount === 1) {
      return "1 ami a noté ce film";
    }
    return `${ratedCount} amis ont noté ce film`;
  }
  // Cas mixte : certains ont noté, d'autres juste vu
  const verbe = ratedCount === 1 ? "a" : "ont";
  return `${ratedCount} ami${ratedCount > 1 ? "s" : ""} sur ${seenCount} ${verbe} noté`;
}

/**
 * Bottom sheet partagé qui affiche le détail des notes données par les amis.
 *
 * Réutilisé sur la page Home (cliqué depuis FriendRatingsSection sur la carte film)
 * et sur la page /liste (cliqué depuis FriendRatingsBadge sur les onglets À voir
 * et Pas pour moi).
 *
 * Structure (cf. Q12 du grill-me) :
 * - Header avec titre "Tes amis ont noté" + croix de fermeture
 * - Hero : moyenne héroïque (étoiles violet 32px + nombre)
 * - Phrase de récap "X amis sur Y ont noté"
 * - Liste : avatar 32px + username + étoiles violet (ou texte "Vu, sans note")
 *
 * Tri (cf. Q7) : déjà appliqué côté backend dans get_friend_ratings.
 *
 * Fermeture : croix OU clic sur le backdrop. Le clic sur le contenu lui-même
 * est stoppé pour ne pas remonter au backdrop.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Si true, la feuille est visible
 * @param {Function} props.onClose - Appelée pour fermer la feuille
 * @param {Object|null} props.friendRatings - Le payload friend_ratings du film,
 *   format {average, friends: [{username, avatar, rating, friendship_id}]}.
 *   Si null, on n'affiche rien.
 * @param {string} [props.filmTitle] - Titre du film, affiché dans le header
 *   sous la mention "Tes amis ont noté" pour donner le contexte. Optionnel
 *   par sécurité si un appelant l'oublie : on retombe alors sur le format court.
 * @returns {JSX.Element|null} Le bottom sheet ou null
 */
function FriendRatingsSheet({ isOpen, onClose, friendRatings, filmTitle }) {
  // Ami dont on consulte le commentaire (null = aucune modale ouverte).
  // On garde l'objet ami complet pour avoir accès à son username (titre)
  // et à son commentaire (corps de la modale).
  // ⚠️ Le useState DOIT être appelé avant tout `return` conditionnel,
  // sinon les Hooks ne sont pas appelés dans le même ordre à chaque rendu
  // et React lève une erreur "Rendered fewer hooks than expected".
  const [viewingCommentFriend, setViewingCommentFriend] = useState(null);

  // Garde de bord : pas ouvert ou pas de données → on ne rend rien
  if (!isOpen || !friendRatings) return null;

  const { average, friends } = friendRatings;

  // Compteurs dérivés du payload (pas envoyés par le backend, cf. Q9)
  const ratedCount = friends.filter((f) => f.rating !== null).length;
  const seenCount = friends.length;

  /**
   * Ferme la sheet ET stoppe la propagation de l'événement.
   *
   * Pourquoi stopPropagation : avec createPortal, le DOM est rendu dans
   * <body> mais React fait remonter les événements dans l'arbre React,
   * donc le clic sur le backdrop remonterait jusqu'à la carte film
   * parente (qui a un onClick pour ouvrir FilmDetailModal). Sans ce
   * stop, fermer la sheet ouvrirait la modale du film derrière.
   */
  function handleBackdropClick(e) {
    e.stopPropagation();
    onClose();
  }

  // Rendu via createPortal directement dans <body> : indispensable car les
  // composants parents (cartes /liste, carte film Home) ont des `transform`
  // et `overflow: hidden` qui créent un nouveau stacking context et piègent
  // la position: fixed à l'intérieur du parent. Le portal garantit que
  // backdrop + sheet couvrent toute la viewport.
  return createPortal(
    <>
      {/* Backdrop semi-transparent : clic dessus ferme la feuille
          (via handleBackdropClick qui stop la propagation React) */}
      <div
        className="friend-ratings-backdrop"
        onClick={handleBackdropClick}
      />

      {/* Le panneau lui-même : on stoppe la propagation des clics
          pour ne pas déclencher la fermeture quand on tap dedans,
          et pour ne pas remonter dans l'arbre React vers la carte parente */}
      <div
        className="friend-ratings-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée visuelle (mimétique des bottom sheets natifs iOS) */}
        <div className="friend-ratings-sheet__handle">
          <div className="friend-ratings-sheet__handle-bar" />
        </div>

        {/* Header : label "Tes amis ont noté" en petit + titre du film en
            grand sur la ligne du dessous + croix de fermeture à droite.
            Format deux-lignes pour éviter qu'un titre de film long ne pousse
            la croix hors de l'écran. */}
        <div className="friend-ratings-sheet__header">
          <div className="friend-ratings-sheet__heading">
            <p className="friend-ratings-sheet__label">Tes amis ont noté</p>
            {filmTitle && (
              <h3 className="friend-ratings-sheet__title">{filmTitle}</h3>
            )}
          </div>
          <button
            type="button"
            className="friend-ratings-sheet__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Zone scrollable : tout ce qui suit peut défiler si la liste est longue */}
        <div className="friend-ratings-sheet__body">
          {/* Hero : la moyenne en grand, n'apparaît que si au moins un ami a noté */}
          {average !== null && (
            <div className="friend-ratings-sheet__hero">
              <div className="friend-ratings-sheet__hero-stars">
                <StarRating value={average} readOnly />
              </div>
              <p className="friend-ratings-sheet__hero-number">{average}/5</p>
            </div>
          )}

          {/* Ligne de récap (X amis sur Y ont noté) */}
          <p className="friend-ratings-sheet__count">
            {getCountLine(ratedCount, seenCount)}
          </p>

          {/* Liste détaillée : un ami par ligne */}
          <ul className="friend-ratings-sheet__list">
            {friends.map((friend, index) => (
              <li
                // L'API ne garantit pas l'unicité du friendship_id (peut être null
                // pour un cas dégradé), donc on combine username + index.
                key={`${friend.username}-${index}`}
                className="friend-ratings-sheet__row"
              >
                <img
                  className="friend-ratings-sheet__avatar"
                  src={getAvatarUrl(friend.avatar)}
                  alt=""
                />
                <span className="friend-ratings-sheet__username">
                  {friend.username}
                </span>
                {friend.rating !== null ? (
                  <div className="friend-ratings-sheet__row-stars">
                    <StarRating value={friend.rating} readOnly />
                  </div>
                ) : (
                  <span className="friend-ratings-sheet__unrated">
                    Vu, sans note
                  </span>
                )}

                {/* Pastille 💬 placée APRÈS les étoiles (ou "Vu, sans note").
                    Affichée dès qu'un commentaire existe, peu importe que
                    l'ami ait noté ou non. Cliquer ouvre la modale en mode
                    lecture seule (le user ne peut pas modifier un commentaire
                    qui n'est pas le sien). stopPropagation : empêche le clic
                    de remonter à la sheet ou au backdrop derrière. */}
                {friend.comment && (
                  <button
                    type="button"
                    className="friend-ratings-sheet__comment-btn"
                    aria-label={`Voir le commentaire de ${friend.username}`}
                    title={`Voir le commentaire de ${friend.username}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingCommentFriend(friend);
                    }}
                  >
                    💬
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modale d'affichage du commentaire de l'ami sélectionné.
          On adapte la forme attendue par CommentModal :
          { comment, film: { title } }. Le filmTitle vient de la prop parente
          car la sheet ne dispose pas du film entier. authorName affiche
          "Commentaire de {username}" dans le header de la modale. */}
      <CommentModal
        swipe={
          viewingCommentFriend
            ? {
                comment: viewingCommentFriend.comment,
                film: { title: filmTitle || "" },
              }
            : null
        }
        onClose={() => setViewingCommentFriend(null)}
        readOnly
        authorName={viewingCommentFriend?.username}
      />
    </>,
    document.body,
  );
}

export default FriendRatingsSheet;
