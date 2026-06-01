/* ============================================================
   films.js — Appels API liés aux films (deck de swipe + recherche)
   ------------------------------------------------------------
   On regroupe ici toutes les requêtes réseau de l'écran Home pour
   garder le composant `screens/home.js` concentré sur l'affichage
   et le geste. C'est l'équivalent des fonctions `buildFilmUrl`,
   `initializeFilms`, `prefetchNext` et de la recherche du web
   (frontend/src/pages/home.jsx), mais sorties dans un module dédié.

   Toutes les fonctions utilisent l'instance axios `api` (api/client.js)
   qui injecte automatiquement le token et gère le rafraîchissement.
   ============================================================ */

import api from "./client";

/**
 * Construit le chemin de l'API /api/films/random/ avec les filtres actifs.
 *
 * Sur le web on utilise `URLSearchParams`. En React Native cet objet
 * existe aussi, mais pour rester simple et lisible on assemble nous-mêmes
 * la liste des paramètres `clé=valeur`, puis on les joint avec `&`.
 * `encodeURIComponent` protège les valeurs (accents, espaces, virgules).
 *
 * @param {Object} filters - Les filtres à appliquer
 * @param {string} filters.type - "Film", "Série" ou "" (aucun)
 * @param {string[]} filters.genres - Genres sélectionnés (ex: ["Action"])
 * @param {string[]} filters.plateforms - Plateformes sélectionnées
 * @param {string} filters.yearMin - Année minimum (ou "")
 * @param {string} filters.yearMax - Année maximum (ou "")
 * @param {number|null} [excludeId] - ID d'un film à exclure (le film affiché)
 * @returns {string} Le chemin complet (ex: "/api/films/random/?type=Film")
 */
export function buildFilmUrl(filters, excludeId = null) {
  // Tableau de morceaux "clé=valeur" qu'on assemblera à la fin.
  const params = [];

  if (excludeId) {
    params.push(`exclude=${excludeId}`);
  }
  if (filters.type) {
    params.push(`type=${encodeURIComponent(filters.type)}`);
  }
  if (filters.genres.length > 0) {
    // join(",") transforme ["Action", "Comédie"] en "Action,Comédie"
    params.push(`genres=${encodeURIComponent(filters.genres.join(","))}`);
  }
  if (filters.plateforms.length > 0) {
    params.push(`plateforms=${encodeURIComponent(filters.plateforms.join(","))}`);
  }
  if (filters.yearMin) {
    params.push(`year_min=${encodeURIComponent(filters.yearMin)}`);
  }
  if (filters.yearMax) {
    params.push(`year_max=${encodeURIComponent(filters.yearMax)}`);
  }

  // S'il y a des paramètres, on les colle après un "?" ; sinon rien.
  const queryString = params.join("&");
  return `/api/films/random/${queryString ? `?${queryString}` : ""}`;
}

/**
 * Récupère UN film aléatoire correspondant aux filtres.
 *
 * Le backend renvoie un code HTTP 204 (No Content) quand il n'y a plus
 * aucun film à proposer. axios ne lève pas d'erreur pour un 204 : on doit
 * donc tester `response.status` nous-mêmes. On renvoie `null` dans ce cas
 * pour que l'appelant sache qu'il n'y a plus de film.
 *
 * @param {Object} filters - Les filtres actifs
 * @param {number|null} [excludeId] - ID du film à exclure
 * @returns {Promise<Object|null>} Le film, ou null s'il n'y en a plus
 */
export async function fetchRandomFilm(filters, excludeId = null) {
  const url = buildFilmUrl(filters, excludeId);
  const response = await api.get(url);

  // 204 = "plus de films" : pas de corps de réponse à lire.
  if (response.status === 204) {
    return null;
  }
  return response.data;
}

/**
 * Recherche des films par titre (autocomplétion de la barre de recherche).
 *
 * @param {string} query - Le texte tapé par l'utilisateur
 * @returns {Promise<Array>} Liste de films { id, title, img, release_year, ... }
 */
export async function searchFilms(query) {
  const response = await api.get(
    `/api/films/search/?q=${encodeURIComponent(query)}`
  );
  return response.data;
}

/**
 * Enregistre un swipe (like / dislike / déjà vu) sur un film.
 *
 * La réponse contient `matched_friends` : la liste des amis qui ont
 * AUSSI liké ce film. Si elle n'est pas vide après un "like", l'écran
 * Home déclenche l'animation "It's a Match !".
 *
 * @param {number} filmId - L'ID du film swipé
 * @param {string} status - "like", "dislike" ou "seen"
 * @returns {Promise<Object>} La réponse du backend (avec matched_friends)
 */
export async function sendSwipe(filmId, status) {
  const response = await api.post("/api/swipes/", {
    film: filmId,
    status,
  });
  return response.data;
}

/**
 * Charge en parallèle la liste des genres et des plateformes
 * disponibles (pour remplir les chips du panneau de filtres).
 *
 * Promise.all lance les deux requêtes en même temps (plus rapide qu'à
 * la suite) et attend que les deux soient terminées.
 *
 * @returns {Promise<{ genres: Array, plateforms: Array }>}
 */
export async function fetchFilterOptions() {
  const [genresRes, plateformsRes] = await Promise.all([
    api.get("/api/genres/"),
    api.get("/api/platforms/"),
  ]);
  return {
    genres: genresRes.data,
    plateforms: plateformsRes.data,
  };
}
