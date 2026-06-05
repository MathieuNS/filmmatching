/* ============================================================
   colors.js — Thème de couleurs de l'application mobile
   ------------------------------------------------------------
   Sur le site web, les couleurs sont stockées dans des
   "variables CSS" (ex : --corail-vif) définies dans index.css.
   En React Native, les variables CSS n'existent pas : on les
   remplace par de simples objets JavaScript exportés ici.

   But : avoir UNE SEULE source de vérité pour les couleurs,
   réutilisable par tous les écrans et composants. Si une
   couleur change, on la modifie ici et c'est répercuté partout.
   ============================================================ */

/**
 * COLORS — palette de couleurs unies du thème (mode sombre).
 *
 * Reprend exactement les couleurs du site web (voir le bloc
 * `:root` dans frontend/src/index.css) pour que l'app mobile
 * et le site soient identiques.
 */
export const COLORS = {
  // ===== Couleurs de base =====
  noirCinema: "#0D0D0F", // fond principal
  noirCarte: "#16161A", // cartes, modales, badges
  grisSombre: "#1E1E24", // champs de saisie (inputs)
  grisMoyen: "#2A2A32", // bordures
  grisTexte: "#8B8B9E", // texte secondaire
  blancDoux: "#F0EEF2", // texte principal

  // ===== Accents sémantiques =====
  corailVif: "#FF4D6A", // like, bouton d'action principal
  ambreDore: "#FFAA2B", // déjà vu, badges
  violetNuit: "#7B5CFF", // profils, liens sociaux
  vertMatch: "#2EE0A1", // match confirmé, succès
};

/**
 * GRADIENTS — dégradés du thème.
 *
 * Sur le web, un dégradé s'écrit en une chaîne CSS
 * (`linear-gradient(...)`). En React Native, on utilise le
 * composant <LinearGradient> de expo-linear-gradient, qui
 * attend un TABLEAU de couleurs via sa prop `colors`.
 * On stocke donc chaque dégradé sous forme de tableau,
 * prêt à être passé tel quel :
 *
 *   <LinearGradient colors={GRADIENTS.passion} ... />
 *
 * L'angle 135° du web (haut-gauche -> bas-droite) se reproduit
 * avec les props start={{x:0,y:0}} end={{x:1,y:1}}.
 */
export const GRADIENTS = {
  passion: [COLORS.corailVif, COLORS.ambreDore], // like, CTA principal
  connexion: [COLORS.violetNuit, COLORS.corailVif], // liens / connexions
  match: [COLORS.vertMatch, COLORS.violetNuit], // animation de match
};
