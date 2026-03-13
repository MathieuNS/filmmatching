import { useState } from "react";
import "../styles/StarRating.css";

/**
 * Composant de notation par étoiles avec support des demi-étoiles.
 *
 * Affiche 5 étoiles cliquables. L'utilisateur peut cliquer sur la moitié
 * gauche d'une étoile pour donner une demi-note (ex: 3.5) ou sur la moitié
 * droite pour une note entière (ex: 4.0).
 *
 * Le score s'affiche à côté des étoiles (ex: "3.5/5").
 *
 * @param {Object} props
 * @param {number|null} props.value - La note actuelle (0.5 à 5, ou null si pas encore noté)
 * @param {Function} props.onChange - Fonction appelée quand l'utilisateur clique une étoile
 * @param {boolean} [props.readOnly=false] - Si true, les étoiles ne sont pas cliquables
 * @returns {JSX.Element} Le composant de notation
 */
function StarRating({ value, onChange, readOnly = false }) {
  // hoverValue : la note survolée (pour le preview au hover)
  // null quand la souris n'est pas sur les étoiles
  const [hoverValue, setHoverValue] = useState(null);

  // La valeur à afficher visuellement : soit le hover (preview), soit la vraie note
  const displayValue = hoverValue !== null ? hoverValue : (value || 0);

  /**
   * Calcule la note en fonction de la position du clic dans l'étoile.
   *
   * Chaque étoile est divisée en deux zones :
   * - Moitié gauche = demi-étoile (ex: étoile 3, moitié gauche = 2.5)
   * - Moitié droite = étoile pleine (ex: étoile 3, moitié droite = 3.0)
   *
   * On utilise getBoundingClientRect() pour connaître la position et la largeur
   * de l'étoile, puis on compare avec la position X du clic/survol.
   *
   * @param {Event} e - L'événement souris (click ou mousemove)
   * @param {number} starIndex - L'index de l'étoile (1 à 5)
   * @returns {number} La note calculée (0.5 à 5.0)
   */
  function getStarValue(e, starIndex) {
    // getBoundingClientRect() renvoie la position et taille de l'élément
    const rect = e.currentTarget.getBoundingClientRect();
    // clientX = position horizontale de la souris sur l'écran
    // rect.left = bord gauche de l'étoile
    // Si la souris est dans la première moitié → demi-étoile
    const isLeftHalf = (e.clientX - rect.left) < (rect.width / 2);
    return isLeftHalf ? starIndex - 0.5 : starIndex;
  }

  /**
   * Gère le clic sur une étoile.
   * Si l'utilisateur clique sur la même note qu'il avait déjà,
   * on supprime la note (remise à null).
   */
  function handleClick(e, starIndex) {
    if (readOnly) return;
    const newValue = getStarValue(e, starIndex);
    // Si on reclique sur la même note → on la supprime
    onChange(newValue === value ? null : newValue);
  }

  /**
   * Met à jour le preview au survol de la souris.
   */
  function handleMouseMove(e, starIndex) {
    if (readOnly) return;
    setHoverValue(getStarValue(e, starIndex));
  }

  /**
   * Quand la souris quitte la zone des étoiles, on retire le preview.
   */
  function handleMouseLeave() {
    if (readOnly) return;
    setHoverValue(null);
  }

  return (
    <div className="star-rating" onMouseLeave={handleMouseLeave}>
      {/* On crée 5 étoiles (index 1 à 5) */}
      <div className="star-rating__stars">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          // Calcule le "remplissage" de cette étoile :
          // - 100% si la note affichée >= starIndex (étoile pleine)
          // - 50% si la note affichée >= starIndex - 0.5 (demi-étoile)
          // - 0% sinon (étoile vide)
          const fillPercent =
            displayValue >= starIndex
              ? 100
              : displayValue >= starIndex - 0.5
              ? 50
              : 0;

          return (
            <span
              key={starIndex}
              className={`star-rating__star ${!readOnly ? "star-rating__star--interactive" : ""}`}
              onClick={(e) => handleClick(e, starIndex)}
              onMouseMove={(e) => handleMouseMove(e, starIndex)}
            >
              {/* Étoile de fond (vide, grise) */}
              <svg className="star-rating__svg" viewBox="0 0 24 24">
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="#2A2A32"
                />
              </svg>

              {/* Étoile de remplissage (dorée), masquée par clip-path selon le pourcentage.
                  clip-path: inset() permet de "couper" l'étoile horizontalement.
                  inset(0 50% 0 0) = on coupe la moitié droite → demi-étoile visible.
                  inset(0 0 0 0) = rien coupé → étoile complète visible. */}
              <svg
                className="star-rating__svg star-rating__svg--filled"
                viewBox="0 0 24 24"
                style={{
                  clipPath: `inset(0 ${100 - fillPercent}% 0 0)`,
                }}
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="#FFAA2B"
                />
              </svg>
            </span>
          );
        })}
      </div>

      {/* Affichage du score textuel (ex: "3.5/5") — seulement si une note existe */}
      {value !== null && value !== undefined && (
        <span className="star-rating__score">{value}/5</span>
      )}
    </div>
  );
}

export default StarRating;
