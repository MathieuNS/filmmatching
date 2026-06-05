/* ============================================================
   avatars.js — Retrouver le SVG d'un avatar à partir de son nom
   ------------------------------------------------------------
   Équivalent mobile de `frontend/src/utils/avatars.js`. Le backend
   stocke le NOM du fichier choisi par l'utilisateur (ex :
   "avatar-reel.svg"). Cette fonction renvoie la chaîne SVG
   correspondante, prête à être passée à `SvgXml`.
   ============================================================ */

import { AVATARS_XML, DEFAULT_AVATAR } from "../assets/avatars/avatarsData";

/**
 * Liste de tous les avatars disponibles (pour un futur sélecteur
 * d'avatar dans "Mon compte", Phase 8).
 *
 * @type {Array<{ name: string, xml: string }>}
 */
export const AVATARS = Object.entries(AVATARS_XML).map(([name, xml]) => ({
  name,
  xml,
}));

/**
 * Renvoie le code SVG d'un avatar à partir de son nom de fichier.
 *
 * Contrairement au web (qui renvoie une URL), on renvoie ici la
 * CHAÎNE SVG, car `SvgXml` dessine à partir du texte du SVG.
 *
 * @param {string} avatarName - Nom du fichier (ex : "avatar-popcorn.svg")
 * @returns {string|null} Le SVG correspondant, ou null si introuvable
 *   (le composant Avatar affichera alors un repli "avatar-lettre").
 */
export function getAvatarXml(avatarName) {
  // Si le nom existe dans la table, on le renvoie ; sinon on tente le
  // défaut ; sinon null (l'appelant gère le repli).
  return AVATARS_XML[avatarName] || AVATARS_XML[DEFAULT_AVATAR] || null;
}
