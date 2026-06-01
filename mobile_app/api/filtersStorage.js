/* ============================================================
   filtersStorage.js — Persistance des filtres de films
   ------------------------------------------------------------
   Sur le web, les filtres choisis (type, genres, plateformes, années)
   sont sauvegardés dans `localStorage` sous la clé "filmmatching_filters",
   pour les retrouver d'une page à l'autre (Home, Liste...).

   Sur mobile, il n'y a pas de localStorage. Pour des données NON
   sensibles comme des filtres, on n'a pas besoin du coffre-fort chiffré
   (réservé aux tokens, voir storage.js) : on utilise AsyncStorage, le
   stockage clé/valeur standard de React Native (décision ROADMAP).

   Comme AsyncStorage ne sait stocker que du TEXTE, on convertit l'objet
   filtres en chaîne JSON à l'écriture (JSON.stringify) et on le reconvertit
   en objet à la lecture (JSON.parse) — exactement comme le web.
   ============================================================ */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Même clé que le web pour rester cohérent (et faciliter la relecture).
const FILTERS_KEY = "filmmatching_filters";

/**
 * Valeur par défaut des filtres : aucun filtre actif.
 * Exportée pour que l'écran Home parte du même état initial.
 *
 * @type {{ type: string, genres: string[], plateforms: string[], yearMin: string, yearMax: string }}
 */
export const DEFAULT_FILTERS = {
  type: "",
  genres: [],
  plateforms: [],
  yearMin: "",
  yearMax: "",
};

/**
 * Lit les filtres sauvegardés (ou les valeurs par défaut s'il n'y a rien
 * ou si les données stockées sont corrompues).
 *
 * AsyncStorage est ASYNCHRONE : on doit donc faire `await loadFilters()`.
 *
 * @returns {Promise<Object>} Les filtres sauvegardés ou DEFAULT_FILTERS
 */
export async function loadFilters() {
  try {
    const saved = await AsyncStorage.getItem(FILTERS_KEY);
    if (!saved) {
      // Première utilisation : rien n'a encore été stocké.
      return { ...DEFAULT_FILTERS };
    }
    // On fusionne avec les valeurs par défaut : si une ancienne version
    // stockée n'avait pas tous les champs, on évite les `undefined`.
    return { ...DEFAULT_FILTERS, ...JSON.parse(saved) };
  } catch (error) {
    // JSON invalide ou erreur de lecture : on repart propre.
    console.error("Erreur lecture des filtres :", error);
    return { ...DEFAULT_FILTERS };
  }
}

/**
 * Sauvegarde les filtres choisis par l'utilisateur.
 *
 * @param {Object} filters - Les filtres à mémoriser
 * @returns {Promise<void>}
 */
export async function saveFilters(filters) {
  try {
    await AsyncStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error("Erreur sauvegarde des filtres :", error);
  }
}

/**
 * Compte le nombre de filtres actifs (pour le badge du bouton "Filtres").
 * Chaque genre et chaque plateforme compte pour 1 (même calcul que le web).
 *
 * @param {Object} filters - Les filtres actifs
 * @returns {number} Le nombre total de filtres actifs
 */
export function countActiveFilters(filters) {
  return (
    (filters.type ? 1 : 0) +
    filters.genres.length +
    filters.plateforms.length +
    (filters.yearMin ? 1 : 0) +
    (filters.yearMax ? 1 : 0)
  );
}
