/* ============================================================
   spacing.js — Rayons, espacements et ombres du thème
   ------------------------------------------------------------
   Sur le web, ces valeurs sont éparpillées dans les fichiers CSS
   (border-radius: 20px, padding: 16px, box-shadow: ...).
   En React Native, on les regroupe ici en objets JavaScript pour
   avoir UNE SEULE source de vérité, réutilisable par tous les
   écrans et composants.

   Pourquoi des "tokens" (valeurs nommées) plutôt que des nombres
   en dur ? Pour rester cohérent : si on décide que les cartes ont
   un rayon de 24 au lieu de 20, on change une seule ligne ici et
   c'est répercuté partout.
   ============================================================ */

/**
 * RADII — rayons d'arrondi des coins (border-radius).
 *
 * Reprend les "UI tokens" du design system :
 * cartes 20, boutons/inputs 14, pastilles 100 (arrondi total).
 */
export const RADII = {
  sm: 6, // petits éléments (case à cocher)
  input: 14, // champs de saisie
  button: 14, // boutons
  card: 20, // cartes
  modal: 24, // modales / grandes surfaces
  pill: 100, // tags / badges (forme "gélule")
  round: 999, // cercle parfait (avatars, icônes rondes)
};

/**
 * SPACING — échelle d'espacements (marges, paddings, gaps).
 *
 * Une échelle régulière évite les valeurs au hasard (13px, 17px...)
 * et garde un rythme visuel cohérent dans toute l'app.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

/**
 * BORDERS — couleur et épaisseur des bordures fines.
 *
 * Le design system demande `border: 1px solid rgba(255,255,255,0.04)`
 * pour les cartes : une bordure quasi invisible qui détache juste
 * l'élément du fond.
 */
export const BORDERS = {
  width: 1, // épaisseur standard (StyleSheet.hairlineWidth est parfois trop fin)
  color: "rgba(255,255,255,0.04)", // bordure standard (cartes, badges)
  colorStrong: "rgba(255,255,255,0.06)", // variante un peu plus visible (cartes de film)
};

/**
 * SHADOWS — ombres récurrentes prêtes à l'emploi.
 *
 * Différence avec le web : la propriété CSS `box-shadow` n'existe pas
 * en React Native. On la remplace par plusieurs props séparées :
 *   - shadowColor / shadowOpacity / shadowRadius / shadowOffset (iOS)
 *   - elevation (Android — gère à la fois l'ombre ET l'ordre d'empilement)
 * On fournit donc les DEUX pour que l'ombre s'affiche sur les deux OS.
 */
export const SHADOWS = {
  // Ombre douce et sombre sous une carte (équiv. box-shadow noir du web)
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

/**
 * glow — fabrique une ombre COLORÉE (effet de "lueur" sous un élément).
 *
 * Sur le web, les boutons ont une lueur via
 * `box-shadow: 0 4px 24px <accent-glow>`. Ici on génère le même effet
 * à partir d'une couleur d'accent (corail, violet...). C'est une
 * "fonction usine" : on l'appelle pour obtenir un objet de style.
 *
 * @param {string} color - couleur de la lueur (ex : COLORS.corailVif)
 * @param {Object} [options] - réglages optionnels
 * @param {number} [options.opacity=0.3] - intensité de la lueur (0 à 1)
 * @param {number} [options.radius=24] - flou de la lueur (en px)
 * @param {number} [options.offsetY=4] - décalage vertical de l'ombre
 * @param {number} [options.elevation=8] - équivalent Android
 * @returns {Object} un objet de style à étaler dans un StyleSheet
 *
 * @example
 * // Dans un style : { ...glow(COLORS.corailVif) }
 */
export function glow(
  color,
  { opacity = 0.3, radius = 24, offsetY = 4, elevation = 8 } = {}
) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
    elevation, // Android
  };
}
