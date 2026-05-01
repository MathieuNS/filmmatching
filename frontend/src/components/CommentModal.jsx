import { useState, useEffect } from "react";
import "../styles/CommentModal.css";

/**
 * Modale d'affichage / édition d'un commentaire sur un film "déjà vu".
 *
 * Deux modes selon la prop `readOnly` :
 *
 * - Mode édition (default) : l'utilisateur écrit/modifie son propre commentaire.
 *   Affiche un textarea + boutons Annuler/Enregistrer. `onSave` est appelée
 *   avec le nouveau texte au clic.
 *
 * - Mode lecture seule (readOnly=true) : utilisé pour voir le commentaire d'un
 *   ami dans sa filmothèque. Affiche le texte sans possibilité d'édition,
 *   avec le pseudo de l'auteur dans le titre. `onSave` n'est pas utilisée.
 *
 * On garde le texte saisi dans un state local (`draft`) pour ne déclencher
 * la sauvegarde qu'au clic sur "Enregistrer". Ça évite de spammer l'API
 * à chaque touche tapée et permet d'annuler facilement.
 *
 * @param {Object} props
 * @param {Object|null} props.swipe - Objet contenant le commentaire à afficher
 *   (null = modale fermée). En mode édition : { id, comment, film: { title } }.
 *   En mode lecture seule : { comment, film: { title } } suffit (id pas requis).
 * @param {Function} props.onClose - Appelée quand l'utilisateur ferme/annule.
 * @param {Function} [props.onSave] - Appelée avec le nouveau texte au clic
 *   "Enregistrer". Ignorée en mode readOnly.
 * @param {boolean} [props.readOnly=false] - Si true, affichage simple sans édition.
 * @param {string} [props.authorName] - Pseudo de l'auteur du commentaire,
 *   affiché dans le titre en mode readOnly (ex: "Commentaire de Alice").
 * @returns {JSX.Element|null} La modale ou null si pas de swipe.
 */
function CommentModal({
  swipe,
  onClose,
  onSave,
  readOnly = false,
  authorName,
}) {
  // draft = brouillon local du commentaire en cours d'édition.
  // On l'initialise avec le commentaire actuel du swipe (vide si jamais
  // commenté). Ce state est réinitialisé chaque fois qu'on ouvre la modale
  // sur un nouveau film via le useEffect ci-dessous.
  const [draft, setDraft] = useState("");

  // saving = true pendant l'appel API, pour désactiver le bouton et éviter
  // les double-clics qui enverraient deux PATCH d'affilée.
  const [saving, setSaving] = useState(false);

  // Quand swipe change (ouverture sur un autre film, ou réouverture après
  // modification), on resynchronise le brouillon avec le commentaire actuel.
  useEffect(() => {
    if (swipe) {
      setDraft(swipe.comment || "");
    }
  }, [swipe]);

  // Si aucun swipe en cours d'édition, la modale n'est pas affichée
  if (!swipe) return null;

  /**
   * Gère le clic sur "Enregistrer" : appelle onSave avec le texte trimé.
   *
   * `.trim()` retire les espaces en début et fin pour éviter les
   * commentaires composés uniquement d'espaces. Si le résultat est vide,
   * on envoie une chaîne vide qui sert à effacer le commentaire côté backend.
   */
  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft.trim());
      // La fermeture est gérée par le parent après succès
    } finally {
      // On remet saving à false même en cas d'erreur pour ne pas
      // bloquer le bouton si l'utilisateur veut réessayer.
      setSaving(false);
    }
  }

  // Texte du titre selon le mode :
  // - Édition : "Mon commentaire" (point de vue utilisateur)
  // - Lecture seule avec auteur : "Commentaire de Alice"
  // - Lecture seule sans auteur (cas marginal) : "Commentaire"
  const title = readOnly
    ? authorName
      ? `Commentaire de ${authorName}`
      : "Commentaire"
    : "Mon commentaire";

  return (
    // Le backdrop sombre couvre tout l'écran. Cliquer dessus ferme la modale.
    <div className="comment-modal-backdrop" onClick={onClose}>
      {/* stopPropagation : un clic dans la modale ne doit PAS fermer la modale.
          Sans ça, le clic remonterait jusqu'au backdrop et déclencherait onClose. */}
      <div
        className="comment-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="comment-modal__close"
          onClick={onClose}
          aria-label="Fermer"
        >
          ✕
        </button>

        <h2 className="comment-modal__title">{title}</h2>
        <p className="comment-modal__subtitle">{swipe.film.title}</p>

        {readOnly ? (
          // Mode lecture seule : on affiche le texte tel quel dans une boîte
          // au même look que le textarea, mais sans possibilité d'éditer.
          // whiteSpace via la classe CSS pour respecter les retours à la ligne.
          <div className="comment-modal__readonly">
            {swipe.comment || (
              <span className="comment-modal__empty">
                Aucun commentaire laissé sur ce film.
              </span>
            )}
          </div>
        ) : (
          <>
            <textarea
              className="comment-modal__textarea"
              placeholder="Ce que j'en ai pensé, une citation, une scène marquante..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              // autoFocus : le curseur est placé automatiquement dans le textarea
              // à l'ouverture pour que l'utilisateur puisse taper directement.
              autoFocus
              rows={6}
              // maxLength : protection raisonnable contre les commentaires
              // démesurés. 2000 caractères = environ 2 paragraphes.
              maxLength={2000}
            />

            {/* Compteur de caractères pour aider l'utilisateur à se situer */}
            <div className="comment-modal__counter">
              {draft.length} / 2000
            </div>
          </>
        )}

        <div className="comment-modal__actions">
          {readOnly ? (
            // En lecture seule, un seul bouton "Fermer" qui prend toute la largeur
            <button
              className="comment-modal__btn comment-modal__btn--cancel"
              onClick={onClose}
            >
              Fermer
            </button>
          ) : (
            <>
              <button
                className="comment-modal__btn comment-modal__btn--cancel"
                onClick={onClose}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="comment-modal__btn comment-modal__btn--save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommentModal;
