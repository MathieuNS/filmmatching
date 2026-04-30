import { useState } from "react";
import StarRating from "./StarRating";
import "../styles/RatingPrompt.css";

/**
 * Mappe une note (0.5 à 5, par pas de 0.5) à un label émotionnel court.
 *
 * Le label sert de retour visuel immédiat à l'utilisateur quand il choisit
 * une note : il voit instantanément la "signification" de son choix, ce qui
 * rend l'interaction plus engageante qu'un simple chiffre.
 *
 * On regroupe les 10 valeurs possibles en 5 paliers émotionnels :
 *  - 0.5–1 : "Pas pour moi"
 *  - 1.5–2 : "Mouais"
 *  - 2.5–3 : "Pas mal"
 *  - 3.5–4 : "Vraiment bien"
 *  - 4.5–5 : "Coup de cœur"
 *
 * @param {number|null} rating - La note actuelle, ou null si pas encore choisie
 * @returns {string} Le label correspondant (ou chaîne vide si rating est null)
 */
function getFeedbackLabel(rating) {
  if (rating === null || rating === undefined) return "";
  if (rating <= 1) return "Pas pour moi";
  if (rating <= 2) return "Mouais";
  if (rating <= 3) return "Pas mal";
  if (rating <= 4) return "Vraiment bien";
  return "Coup de cœur";
}

/**
 * Composant réutilisable pour demander une note à l'utilisateur après une action.
 *
 * Style "Cinéma Premium" : carte en verre dépoli (glassmorphism) avec un halo
 * ambre diffus en haut, évoquant un projecteur de cinéma. Un label émotionnel
 * dynamique apparaît dès qu'une note est sélectionnée, donnant vie à l'interaction.
 *
 * Layout :
 * - Croix d'annulation en haut à droite (si onCancel fourni)
 * - Petit titre en majuscules ("Quelle note ?")
 * - Label dynamique en ambre ("Coup de cœur", "Vraiment bien"...)
 * - 5 étoiles cliquables (30px) avec halo ambre sur les pleines
 * - Bouton primaire "Valider" (corail, plein largeur)
 * - Lien discret "Sans note" sous le bouton
 *
 * Le composant garde sa propre note en interne (state local) jusqu'à ce que
 * l'utilisateur valide. La validation appelle onSave(rating) avec la valeur
 * choisie ou null si "Sans note" est cliqué.
 *
 * Utilisé dans :
 * - FilmDetailModal quand l'utilisateur clique "Je l'ai déjà vu aussi"
 *   depuis la filmothèque d'un ami.
 * - (à venir) page Home après un swipe "déjà vu", dans une 2e itération.
 *
 * @param {Object} props
 * @param {Function} props.onSave - Appelée avec (rating | null) à la validation
 * @param {Function} [props.onCancel] - Appelée si l'utilisateur annule (ferme)
 * @param {string} [props.title="Quelle note ?"] - Texte au-dessus des étoiles
 * @param {boolean} [props.saving=false] - true pendant l'appel API : bloque les actions
 * @returns {JSX.Element} Le composant de notation
 */
function RatingPrompt({ onSave, onCancel, title = "Quelle note ?", saving = false }) {
  // La note choisie par l'utilisateur (null = pas encore noté)
  const [rating, setRating] = useState(null);

  // Label émotionnel calculé à partir de la note. Affiché en ambre
  // au-dessus des étoiles dès qu'une valeur est sélectionnée.
  const feedbackLabel = getFeedbackLabel(rating);

  /**
   * Valide la note : appelle onSave avec la note choisie.
   * Si l'utilisateur n'a pas noté, on ne fait rien (le bouton est désactivé).
   */
  function handleSave() {
    if (rating === null) return;
    onSave(rating);
  }

  /**
   * "Sans note" : appelle onSave avec null pour enregistrer le swipe
   * sans rating. Permet à l'utilisateur de skipper la notation.
   */
  function handleSkip() {
    onSave(null);
  }

  return (
    <div className="rating-prompt">
      {/* Croix d'annulation : positionnée en absolu en haut à droite,
          rendue avant les autres contenus pour faciliter le clic
          sans recouvrement par le halo. */}
      {onCancel && (
        <button
          type="button"
          className="rating-prompt__cancel"
          onClick={onCancel}
          disabled={saving}
          aria-label="Annuler"
        >
          ✕
        </button>
      )}

      <p className="rating-prompt__title">{title}</p>

      {/* Label émotionnel dynamique. La classe --empty masque le label
          mais réserve l'espace pour éviter un saut de layout. */}
      <p
        className={`rating-prompt__feedback ${
          feedbackLabel ? "" : "rating-prompt__feedback--empty"
        }`}
        aria-live="polite"
      >
        {feedbackLabel || " "}
      </p>

      {/* Composant StarRating existant, en mode interactif */}
      <div className="rating-prompt__stars">
        <StarRating value={rating} onChange={setRating} />
      </div>

      {/* Boutons d'action : "Valider" en avant, "Sans note" en lien discret */}
      <div className="rating-prompt__actions">
        <button
          type="button"
          className="rating-prompt__save"
          onClick={handleSave}
          disabled={rating === null || saving}
        >
          {saving ? "..." : "Valider"}
        </button>
        <button
          type="button"
          className="rating-prompt__skip"
          onClick={handleSkip}
          disabled={saving}
        >
          Sans note
        </button>
      </div>
    </div>
  );
}

export default RatingPrompt;
