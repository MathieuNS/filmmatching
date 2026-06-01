/* ============================================================
   storage.js — Coffre-fort des tokens (remplace localStorage)
   ------------------------------------------------------------
   Sur le web, les tokens JWT sont rangés dans `localStorage`
   (en clair). Sur mobile, il n'y a pas de localStorage et on veut
   plus de sécurité : on utilise `expo-secure-store`, qui chiffre
   les données via le coffre-fort du système (Keychain sur iOS,
   Keystore sur Android).

   DIFFÉRENCE IMPORTANTE avec le web : localStorage est SYNCHRONE
   (`localStorage.getItem(...)` renvoie tout de suite). Ici, toutes
   les fonctions sont ASYNCHRONES (elles renvoient une Promise) :
   il faut donc écrire `await getAccessToken()` partout.
   ============================================================ */

import * as SecureStore from "expo-secure-store";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";

/**
 * Lit le jeton d'accès stocké (ou null s'il n'y en a pas).
 *
 * @returns {Promise<string|null>} le jeton d'accès ou null
 */
export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN);
}

/**
 * Lit le jeton de rafraîchissement stocké (ou null).
 *
 * @returns {Promise<string|null>} le jeton de rafraîchissement ou null
 */
export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN);
}

/**
 * Enregistre les tokens dans le coffre-fort sécurisé.
 *
 * Le `refresh` est optionnel : lors d'un rafraîchissement, le backend
 * ne renvoie qu'un nouveau `access`. On ne réécrit donc que ce qui
 * est fourni, pour ne pas effacer le refresh par erreur.
 *
 * @param {Object} tokens
 * @param {string} [tokens.access] - nouveau jeton d'accès
 * @param {string} [tokens.refresh] - nouveau jeton de rafraîchissement
 * @returns {Promise<void>}
 */
export async function setTokens({ access, refresh } = {}) {
  if (access) {
    await SecureStore.setItemAsync(ACCESS_TOKEN, access);
  }
  if (refresh) {
    await SecureStore.setItemAsync(REFRESH_TOKEN, refresh);
  }
}

/**
 * Supprime les deux tokens (à la déconnexion ou si la session est morte).
 *
 * @returns {Promise<void>}
 */
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN);
}
