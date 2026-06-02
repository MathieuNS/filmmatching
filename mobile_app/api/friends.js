/* ============================================================
   friends.js — Appels API liés au social (amis & matchs)
   ------------------------------------------------------------
   On regroupe ici toutes les requêtes réseau des écrans Friends et
   MatchList, pour garder les composants concentrés sur l'affichage.
   C'est l'équivalent des appels dispersés dans `Friends.jsx` et
   `match_list.jsx` du web, sortis dans un module dédié (comme
   `api/films.js`).

   Toutes les fonctions utilisent l'instance axios `api` (api/client.js)
   qui injecte le token et gère le rafraîchissement automatique.
   ============================================================ */

import api from "./client";

/**
 * Récupère l'utilisateur connecté (on a surtout besoin de son `id`
 * pour savoir, dans une amitié, si on est l'expéditeur ou le destinataire).
 *
 * @returns {Promise<Object>} { id, username, ... }
 */
export async function fetchMe() {
  const response = await api.get("/api/users/me/");
  return response.data;
}

/**
 * Récupère toutes les amitiés de l'utilisateur (envoyées ET reçues,
 * en attente ET acceptées). Le tri par catégorie se fait côté écran.
 *
 * @returns {Promise<Array>} Liste d'objets amitié
 */
export async function fetchFriendships() {
  const response = await api.get("/api/friends/");
  return response.data;
}

/**
 * Recherche des utilisateurs par pseudo (autocomplétion d'ajout d'ami).
 *
 * @param {string} query - Le texte tapé
 * @returns {Promise<Array>} [{ id, username, avatar }, ...]
 */
export async function searchUsers(query) {
  const response = await api.get(
    `/api/users/search/?q=${encodeURIComponent(query)}`
  );
  return response.data;
}

/**
 * Envoie une demande d'ami.
 *
 * @param {number} receiverId - L'ID de l'utilisateur destinataire
 * @returns {Promise<Object>} L'amitié créée
 */
export async function sendFriendRequest(receiverId) {
  const response = await api.post("/api/friends/", { receiver: receiverId });
  return response.data;
}

/**
 * Accepte une demande d'ami reçue (passe `accepted` à true).
 *
 * @param {number} friendshipId - L'ID de l'amitié
 * @returns {Promise<Object>} La réponse du backend
 */
export async function acceptFriend(friendshipId) {
  const response = await api.patch(`/api/friends/${friendshipId}/accept/`);
  return response.data;
}

/**
 * Supprime une amitié OU annule/refuse une demande en attente.
 *
 * @param {number} friendshipId - L'ID de l'amitié
 * @returns {Promise<void>}
 */
export async function deleteFriend(friendshipId) {
  await api.delete(`/api/friends/${friendshipId}/delete/`);
}

/**
 * Récupère les films likés en commun avec UN ami (mode 1v1).
 *
 * @param {number} friendshipId - L'ID de l'amitié
 * @returns {Promise<Array>} Liste de films
 */
export async function fetchMatches(friendshipId) {
  const response = await api.get(`/api/friends/${friendshipId}/matches/`);
  return response.data;
}

/**
 * Récupère les films likés en commun avec PLUSIEURS amis (mode groupe).
 *
 * @param {string} ids - Les IDs d'amitiés séparés par des virgules ("12,34")
 * @returns {Promise<Object>} { films: [...], friends: [{username, avatar}, ...] }
 */
export async function fetchGroupMatches(ids) {
  const response = await api.get(`/api/friends/group-matches/?ids=${ids}`);
  return response.data;
}

/**
 * Récupère la "filmothèque" d'un ami (films qu'il a marqués déjà vus).
 *
 * ⚠️ Le backend renvoie un statut 403 avec `{ error: "private" }` si l'ami
 * a désactivé le partage. On laisse l'appelant intercepter cette erreur
 * pour afficher un écran "filmothèque privée" plutôt qu'une vraie erreur.
 *
 * @param {number} friendshipId - L'ID de l'amitié
 * @returns {Promise<Array>} [{ film, friend_rating, friend_comment, my_status, my_rating }, ...]
 */
export async function fetchFriendSeen(friendshipId) {
  const response = await api.get(`/api/friends/${friendshipId}/seen/`);
  return response.data;
}

/**
 * Récupère, pour chaque film que J'AI liké, la liste des amis qui l'ont
 * AUSSI liké (sert à empiler leurs avatars sur les cartes de "Ma liste").
 *
 * Le backend ne renvoie que les films ayant au moins un ami en commun.
 * Format : { "42": [{username, avatar}, ...], "87": [{username, avatar}] }
 * (les clés sont des IDs de film sous forme de chaîne).
 *
 * @returns {Promise<Object>} Dictionnaire { filmId: [{username, avatar}, ...] }
 */
export async function fetchCommonLikes() {
  const response = await api.get("/api/friends/common-likes/");
  return response.data;
}

/**
 * Ajoute un film à MA watchlist (= crée un swipe "like").
 *
 * @param {number} filmId - L'ID du film
 * @returns {Promise<Object>} La réponse du backend
 */
export async function addToWatchlist(filmId) {
  const response = await api.post("/api/swipes/", {
    film: filmId,
    status: "like",
  });
  return response.data;
}

/**
 * Marque un film comme "déjà vu" par moi, avec une note optionnelle
 * (= crée un swipe "seen", éventuellement accompagné d'un `rating`).
 *
 * @param {number} filmId - L'ID du film
 * @param {number|null} rating - La note (0,5 à 5) ou null
 * @returns {Promise<Object>} La réponse du backend
 */
export async function markAsSeen(filmId, rating) {
  const payload = { film: filmId, status: "seen" };
  // On n'ajoute `rating` au corps que s'il y en a un (évite d'envoyer null).
  if (rating !== null && rating !== undefined) {
    payload.rating = rating;
  }
  const response = await api.post("/api/swipes/", payload);
  return response.data;
}
