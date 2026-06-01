/* ============================================================
   client.js — Instance axios + authentification automatique
   ------------------------------------------------------------
   Équivalent mobile de frontend/src/api.js, en plus complet.

   Deux "intercepteurs" (des fonctions qu'axios exécute
   automatiquement autour de chaque appel réseau) :

   1) Intercepteur de REQUÊTE : avant chaque envoi, il colle le
      jeton d'accès dans l'en-tête `Authorization` (comme le web).

   2) Intercepteur de RÉPONSE : si le serveur répond 401 (jeton
      expiré), il rafraîchit le jeton puis REJOUE la requête, sans
      que l'utilisateur ne voie d'erreur. Le web ne fait pas ça
      (il ne rafraîchit qu'à l'ouverture d'une page protégée).
   ============================================================ */

import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./storage";

// Instance axios partagée par toute l'app. La baseURL vient de la variable
// d'environnement Expo (mobile_app/.env). `EXPO_PUBLIC_*` est injectée au build.
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

/* ------------------------------------------------------------------
   Pont vers Redux (sans dépendance circulaire)
   ------------------------------------------------------------------
   Quand le rafraîchissement échoue (refresh token mort), il faut
   prévenir l'app pour la déconnecter. Mais importer le store Redux
   ici créerait une boucle (store -> client -> store). On expose donc
   une simple fonction que le store viendra "brancher" au démarrage.
   ------------------------------------------------------------------ */
let onSessionExpired = null;

/**
 * Branche la fonction appelée quand la session expire pour de bon
 * (refresh impossible). Le store Redux l'utilise pour déconnecter.
 *
 * @param {() => void} handler - fonction à exécuter à l'expiration définitive
 */
export function setOnSessionExpired(handler) {
  onSessionExpired = handler;
}

/* ------------------------------------------------------------------
   1) Intercepteur de REQUÊTE : injecte le jeton d'accès
   ------------------------------------------------------------------ */
api.interceptors.request.use(async (config) => {
  // Lecture ASYNCHRONE du token (secure-store), d'où le `await`.
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ------------------------------------------------------------------
   2) Intercepteur de RÉPONSE : rafraîchissement automatique sur 401
   ------------------------------------------------------------------
   Problème à gérer : si 5 requêtes partent en même temps et reçoivent
   toutes un 401, on ne veut PAS lancer 5 rafraîchissements. On en lance
   UN SEUL, et les autres requêtes attendent dans une "file d'attente"
   le nouveau jeton, puis se rejouent.
   ------------------------------------------------------------------ */

// Un rafraîchissement est-il déjà en cours ?
let isRefreshing = false;
// File des requêtes en attente du nouveau jeton (chacune via une fonction callback).
let pendingQueue = [];

/** Ajoute une requête à la file d'attente du rafraîchissement en cours. */
function subscribe(callback) {
  pendingQueue.push(callback);
}

/** Réveille toutes les requêtes en attente avec le nouveau jeton (ou null si échec). */
function flushQueue(newToken) {
  pendingQueue.forEach((callback) => callback(newToken));
  pendingQueue = [];
}

api.interceptors.response.use(
  // Réponse OK : on la laisse passer telle quelle.
  (response) => response,
  // Réponse en erreur : c'est ici qu'on gère le 401.
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // On ne tente le rafraîchissement QUE si :
    // - c'est bien un 401 (jeton expiré/invalide),
    // - cette requête n'a pas DÉJÀ été rejouée (flag `_retry`, anti-boucle),
    // - et ce n'est pas l'appel de rafraîchissement lui-même (sinon boucle infinie).
    const isRefreshCall = originalRequest?.url?.includes("/api/token/refresh/");
    if (status !== 401 || originalRequest._retry || isRefreshCall) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    // Si un rafraîchissement est DÉJÀ en cours, on met cette requête en attente.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribe((newToken) => {
          if (!newToken) {
            // Le rafraîchissement a échoué : on abandonne cette requête aussi.
            reject(error);
            return;
          }
          // On rejoue la requête avec le nouveau jeton.
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    // Sinon, c'est NOUS qui lançons le rafraîchissement.
    isRefreshing = true;
    try {
      const refresh = await getRefreshToken();
      if (!refresh) {
        throw new Error("Aucun jeton de rafraîchissement.");
      }

      // Appel au backend pour obtenir un nouveau jeton d'accès.
      const response = await api.post("/api/token/refresh/", { refresh });
      const newAccess = response.data.access;

      // On le stocke, on réveille les requêtes en attente, puis on rejoue la nôtre.
      await setTokens({ access: newAccess });
      flushQueue(newAccess);
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Le rafraîchissement a échoué (refresh token expiré au bout d'1 jour) :
      // on vide les tokens, on réveille la file en mode "échec", et on déconnecte.
      flushQueue(null);
      await clearTokens();
      if (onSessionExpired) {
        onSessionExpired();
      }
      return Promise.reject(refreshError);
    } finally {
      // Dans tous les cas, le rafraîchissement est terminé.
      isRefreshing = false;
    }
  }
);

export default api;
