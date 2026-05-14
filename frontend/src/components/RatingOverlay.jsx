import { useState, useEffect, useCallback } from "react";
import api from "../api";
import RatingPrompt from "./RatingPrompt";
import "../styles/RatingOverlay.css";

/**
 * Carte flottante non-bloquante affichée après un swipe "déjà vu".
 *
 * Apparaît en position fixe en haut de l'écran, par-dessus le swipe
 * suivant déjà visible. L'utilisateur peut noter le film qu'il vient
 * de marquer comme vu, ou ignorer l'overlay sans interrompre le rythme
 * du swipe.
 *
 * Cycle de vie :
 * 1. Montage : slide-in depuis le haut.
 * 2. Auto-dismiss : si l'utilisateur ne fait rien pendant 12 secondes,
 *    l'overlay se ferme silencieusement (le swipe reste sans note).
 * 3. Validation : PATCH /api/swipes/<id>/ avec la note choisie,
 *    puis slide-out.
 * 4. "Sans note" ou croix : slide-out sans PATCH.
 *
 * Quand un nouveau swipe "déjà vu" arrive avant que celui-ci soit noté,
 * Home démonte ce composant (via le changement de key={swipeId}) et en
 * monte un nouveau. Le timer de 12s est annulé automatiquement grâce au
 * cleanup du useEffect.
 *
 * @param {Object}   props
 * @param {number}   props.swipeId  - L'ID du swipe créé (pour le PATCH)
 * @param {Object}   props.film     - Le film swipé (on utilise .title)
 * @param {Function} props.onRated  - Appelée après un PATCH réussi
 * @param {Function} props.onDismiss - Appelée quand l'overlay se ferme sans note
 * @returns {JSX.Element}
 */
function RatingOverlay({ swipeId, film, onRated, onDismiss }) {
  // true pendant l'appel PATCH (bloque les boutons pour éviter le double-clic)
  const [saving, setSaving] = useState(false);

  // true quand l'animation de sortie est en cours (slide-out vers le haut)
  const [dismissing, setDismissing] = useState(false);

  /**
   * Déclenche l'animation de sortie puis notifie le parent.
   * On attend 300ms (durée de l'animation CSS) avant d'appeler onDismiss,
   * pour que le slide-out soit visible avant le démontage du composant.
   */
  const triggerDismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => onDismiss(), 300);
  }, [onDismiss]);

  // Auto-dismiss après 12 secondes d'inaction.
  // Le cleanup annule le timer si l'utilisateur interagit avant ou si
  // le composant est démonté (nouveau swipe "déjà vu" arrivé avant).
  useEffect(() => {
    const timer = setTimeout(() => triggerDismiss(), 12000);
    return () => clearTimeout(timer);
  }, [triggerDismiss]);

  /**
   * Gère le clic sur "Valider" (avec note) ou "Sans note" (rating === null).
   *
   * - rating fourni → PATCH le swipe existant avec la note, puis notifie onRated
   * - rating null   → simple fermeture sans modifier le swipe en BDD
   *
   * @param {number|null} rating - La note choisie (0.5 à 5) ou null
   */
  async function handleSave(rating) {
    if (rating === null) {
      // L'utilisateur a cliqué "Sans note" → on ferme sans PATCH
      triggerDismiss();
      return;
    }

    setSaving(true);
    try {
      // Met à jour le swipe créé juste avant avec la note choisie
      await api.patch(`/api/swipes/${swipeId}/`, { rating });
      // Le PATCH a réussi : on notifie le parent (qui videra pendingRating)
      onRated(rating);
    } catch (err) {
      console.error("Erreur lors de la notation du swipe :", err);
      // En cas d'erreur réseau on remet le bouton actif (l'utilisateur peut réessayer)
      setSaving(false);
    }
  }

  return (
    <div className={`rating-overlay${dismissing ? " rating-overlay--out" : ""}`}>
      {/* Texte introductif : identifie le film concerné par la note */}
      <p className="rating-overlay__headline">
        Tu as vu <em className="rating-overlay__film-title">{film.title}</em>
      </p>

      {/*
        RatingPrompt réutilisable (itération 1 de la feature filmothèque ami).
        - onSave    → appelée avec la note (ou null pour "Sans note")
        - onCancel  → croix en haut à droite, ferme sans noter
        - saving    → bloque les actions pendant le PATCH
        On ne passe pas de `title` pour garder le "Quelle note ?" par défaut.
      */}
      <RatingPrompt
        onSave={handleSave}
        onCancel={triggerDismiss}
        saving={saving}
      />
    </div>
  );
}

export default RatingOverlay;
