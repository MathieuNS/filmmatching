import { useState } from "react";
import StarRating from "./StarRating";
import FriendRatingsSheet from "./FriendRatingsSheet";
import "../styles/FriendRatings.css";

/**
 * Badge compact affiché sur les cartes de la page /liste (onglets "À voir"
 * et "Pas pour moi"). Format ramassé pour ne pas alourdir la grille.
 *
 * Format (cf. Q11 du grill-me) :
 *   ★★★★☆ (3) >        ← cas avec note moyenne
 *   👁 Vu (2) >          ← cas "vu sans note" (aucune note moyenne dispo)
 *
 * Au clic, ouvre le même bottom sheet partagé que sur Home.
 *
 * @param {Object} props
 * @param {Object|null} props.friendRatings - Le payload du backend.
 *   Si null, le composant ne rend rien.
 * @param {string} [props.filmTitle] - Titre du film, transmis au bottom sheet
 *   pour qu'il s'affiche en header ("Tes amis ont noté <titre>").
 * @returns {JSX.Element|null} Le badge ou null
 */
function FriendRatingsBadge({ friendRatings, filmTitle }) {
  // État local : feuille ouverte ou pas
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Garde de bord : pas de payload OU des amis ont vu sans noter (average null).
  // Dans ce cas on n'affiche rien — la moyenne étoiles est l'info clé du badge,
  // pas l'info "X amis ont vu".
  if (!friendRatings || friendRatings.average === null) return null;

  const { average, friends } = friendRatings;
  const seenCount = friends.length;

  /**
   * Stoppe la propagation du clic vers la carte parente. Sans ça, cliquer
   * sur le badge déclencherait l'ouverture de la modale film.
   */
  function handleClick(e) {
    e.stopPropagation();
    setIsSheetOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className="friend-ratings-badge"
        onClick={handleClick}
        aria-label={`Voir le détail des notes des amis (${seenCount})`}
      >
        <span className="friend-ratings-badge__stars">
          <StarRating value={average} readOnly />
        </span>
        <span className="friend-ratings-badge__chevron" aria-hidden="true">
          ›
        </span>
      </button>

      {/* Bottom sheet partagé — même composant que sur Home */}
      <FriendRatingsSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        friendRatings={friendRatings}
        filmTitle={filmTitle}
      />
    </>
  );
}

export default FriendRatingsBadge;
