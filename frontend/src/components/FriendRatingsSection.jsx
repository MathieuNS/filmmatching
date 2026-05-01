import { useState } from "react";
import StarRating from "./StarRating";
import FriendRatingsSheet from "./FriendRatingsSheet";
import "../styles/FriendRatings.css";

/**
 * Section inline affichée sur la carte Film de la page Home, entre le synopsis
 * et le réalisateur. Donne un aperçu compact des notes données par les amis
 * et ouvre un bottom sheet détaillé au clic.
 *
 * Structure (cf. Q5 du grill-me) :
 *   "Tes amis ont noté"
 *   ★★★★☆  4.2 · 3 amis  >
 *
 * Cas particulier "vu sans note" (cf. Q2) : si aucun ami n'a donné de note
 * mais que certains ont vu, on affiche "Tes amis ont vu · 2 amis >" sans étoiles.
 *
 * Important : on stoppe la propagation des événements de pointer/touch pour
 * éviter de déclencher le swipe de la carte film quand l'utilisateur tap sur
 * la section. Le composant Film est dans un wrapper avec drag handlers.
 *
 * @param {Object} props
 * @param {Object|null} props.friendRatings - Le payload du backend.
 *   Si null, le composant ne rend rien (cas "aucun ami n'a vu ce film").
 * @param {string} [props.filmTitle] - Titre du film, transmis au bottom sheet
 *   pour qu'il s'affiche en header ("Tes amis ont noté <titre>").
 * @returns {JSX.Element|null} La section ou null
 */
function FriendRatingsSection({ friendRatings, filmTitle }) {
  // État local : la feuille de détail est-elle ouverte ?
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Garde de bord : pas de données OU des amis ont vu sans noter (average null).
  // Dans ce cas, on n'affiche rien — la moyenne est l'info principale, sans elle
  // la section perd son intérêt.
  if (!friendRatings || friendRatings.average === null) return null;

  const { average, friends } = friendRatings;
  const seenCount = friends.length;

  // Texte du compteur compact : "3 amis" / "1 ami"
  const countText = `${seenCount} ami${seenCount > 1 ? "s" : ""}`;

  return (
    <>
      <div
        className="friend-ratings-section"
        onClick={() => setIsSheetOpen(true)}
        // Stop propagation au pointer pour ne pas déclencher le drag/swipe
        // de la carte Film. Sans ça, tap sur la section démarre un swipe.
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        role="button"
        tabIndex={0}
        aria-label="Voir le détail des notes des amis"
      >
        {/* Label inline aligné sur les autres ("Réalisateur :", "Acteurs :",
            "Disponible sur :") via la classe partagée .film-card__label. */}
        <span className="film-card__label">Tes amis ont noté :</span>
        <div className="friend-ratings-section__stars">
          <StarRating value={average} readOnly />
        </div>
        <span className="friend-ratings-section__average">{average}/5</span>
        <span className="friend-ratings-section__count">· {countText}</span>
        <span className="friend-ratings-section__chevron" aria-hidden="true">
          ›
        </span>
      </div>

      {/* Bottom sheet partagé : ouvert au clic sur la section */}
      <FriendRatingsSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        friendRatings={friendRatings}
        filmTitle={filmTitle}
      />
    </>
  );
}

export default FriendRatingsSection;
