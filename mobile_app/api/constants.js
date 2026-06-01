/* ============================================================
   constants.js — Clés de stockage des tokens JWT
   ------------------------------------------------------------
   Identiques au web (frontend/src/constants.js) pour garder la
   même logique. Ce sont les "noms de tiroir" sous lesquels on
   range les deux jetons d'authentification dans le coffre-fort
   sécurisé (expo-secure-store) au lieu du localStorage du web.
   ============================================================ */

/** Jeton d'accès (durée de vie courte : 30 min). Envoyé à chaque requête. */
export const ACCESS_TOKEN = "access";

/** Jeton de rafraîchissement (durée de vie longue : 1 jour). Sert à
 *  obtenir un nouveau jeton d'accès quand l'ancien expire. */
export const REFRESH_TOKEN = "refresh";
