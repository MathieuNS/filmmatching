/**
 * Outil partagé pour gérer les réponses 429 (rate limiting) du backend.
 *
 * Quand un endpoint protégé par une limite de débit est saturé, Django REST
 * Framework renvoie un statut HTTP 429 ("Too Many Requests"). Le message texte
 * est dans le champ `detail` (en anglais), PAS dans `error` comme nos autres
 * erreurs ; le délai d'attente est dans l'en-tête `Retry-After` (en secondes).
 *
 * On centralise ici la construction du message en français pour que tous les
 * écrans (login, contact, mot de passe oublié, inscription) affichent
 * exactement le même texte.
 *
 * Note : sur une app native (pas un navigateur), il n'y a pas de CORS, donc
 * l'en-tête Retry-After est toujours lisible.
 */

/**
 * Renvoie le message à afficher si l'erreur est un 429, sinon null.
 *
 * @param {object} error - l'erreur axios attrapée dans le bloc catch
 * @returns {string|null} le message en français, ou null si ce n'est pas un 429
 */
export function getThrottleMessage(error) {
  if (error.response?.status !== 429) {
    return null;
  }

  // axios met les noms d'en-têtes en minuscules → "retry-after".
  const retryAfter = error.response.headers?.["retry-after"];

  return retryAfter
    ? `Trop de tentatives. Réessaie dans ${retryAfter} secondes.`
    : "Trop de tentatives. Réessaie dans quelques minutes.";
}
