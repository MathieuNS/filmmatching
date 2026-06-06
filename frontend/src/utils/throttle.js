/**
 * Outil partagé pour gérer les réponses 429 (rate limiting) du backend.
 *
 * Quand un endpoint protégé par une limite de débit est saturé, Django REST
 * Framework renvoie un statut HTTP 429 ("Too Many Requests"). Deux pièges :
 *   - le message texte est dans le champ `detail` (et en anglais), PAS dans
 *     `error` comme nos autres erreurs → si on ne le gère pas, le formulaire
 *     retombe sur un message générique trompeur ;
 *   - le délai d'attente est donné dans l'en-tête `Retry-After` (en secondes).
 *
 * On centralise ici la construction du message en français pour que tous les
 * formulaires (login, contact, mot de passe oublié, inscription) affichent
 * exactement le même texte.
 */

/**
 * Renvoie le message à afficher si l'erreur est un 429, sinon null.
 *
 * Usage typique dans un bloc catch :
 *   const throttled = getThrottleMessage(error);
 *   if (throttled) { setError(throttled); return; }
 *
 * @param {object} error - l'erreur axios attrapée dans le bloc catch
 * @returns {string|null} le message en français, ou null si ce n'est pas un 429
 */
export function getThrottleMessage(error) {
  // On ne gère que le cas 429 ; pour tout le reste, on laisse l'appelant
  // décider (en renvoyant null).
  if (error.response?.status !== 429) {
    return null;
  }

  // axios met les noms d'en-têtes en minuscules → "retry-after".
  // Cet en-tête n'est lisible côté web que parce que le backend l'expose
  // via CORS_EXPOSE_HEADERS (voir settings.py).
  const retryAfter = error.response.headers?.["retry-after"];

  return retryAfter
    ? `Trop de tentatives. Réessaie dans ${retryAfter} secondes.`
    : "Trop de tentatives. Réessaie dans quelques minutes.";
}
