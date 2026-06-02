/* ============================================================
   account.js — Appels API liés au compte utilisateur & au contact
   ------------------------------------------------------------
   On regroupe ici les requêtes réseau de l'écran "Mon compte"
   (mise à jour du profil, de l'avatar, suppression du compte) et
   du formulaire de contact. C'est l'équivalent des appels dispersés
   dans `user_account.jsx` et `contact.jsx` du web, sortis dans un
   module dédié (comme `api/films.js` / `api/friends.js`).

   La lecture du profil (`fetchMe`) vit déjà dans `api/friends.js` :
   on la réutilise telle quelle plutôt que de la dupliquer.

   Toutes les fonctions utilisent l'instance axios `api` (api/client.js)
   qui injecte le token et gère le rafraîchissement automatique.
   ============================================================ */

import api from "./client";

/**
 * Met à jour le profil de l'utilisateur connecté.
 *
 * On envoie UNIQUEMENT les champs modifiés (PATCH = mise à jour partielle) :
 * l'appelant construit l'objet `data` avec les seules valeurs changées.
 * Champs possibles : username, email, password (+ password_confirm),
 * email_notifications, share_seen_with_friends.
 *
 * @param {Object} data - Les champs à mettre à jour
 * @returns {Promise<Object>} Le profil mis à jour ({ id, username, email, ... })
 */
export async function updateProfile(data) {
  const response = await api.patch("/api/users/me/update/", data);
  return response.data;
}

/**
 * Change l'avatar de l'utilisateur connecté.
 *
 * @param {string} avatarName - Nom du fichier avatar (ex : "avatar-camera.svg")
 * @returns {Promise<Object>} { avatar: "avatar-camera.svg" }
 */
export async function updateAvatar(avatarName) {
  const response = await api.patch("/api/users/me/avatar/", {
    avatar: avatarName,
  });
  return response.data;
}

/**
 * Supprime définitivement le compte de l'utilisateur connecté.
 *
 * ⚠️ Action irréversible : toutes les données liées (swipes, amitiés...)
 * sont supprimées en cascade côté backend. L'appelant doit ensuite
 * déconnecter l'utilisateur (`dispatch(logout())`).
 *
 * @returns {Promise<void>}
 */
export async function deleteAccount() {
  await api.delete("/api/users/me/delete/");
}

/**
 * Envoie un message via le formulaire de contact (endpoint public :
 * pas besoin d'être connecté).
 *
 * @param {Object} payload - { name, email, subject, message }
 * @returns {Promise<Object>} { message: "..." } renvoyé par l'API
 */
export async function sendContact(payload) {
  const response = await api.post("/api/contact/", payload);
  return response.data;
}
