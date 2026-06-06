/**
 * Utilitaires liés aux URL YouTube.
 */

/**
 * Convertit une URL d'embed YouTube classique en version "sans cookie".
 *
 * Le domaine `youtube-nocookie.com` active le mode « confidentialité renforcée » :
 * YouTube ne dépose pas de cookies publicitaires tant que l'utilisateur n'a pas
 * lancé la vidéo, et réduit les appels de tracking (doubleclick, etc.). C'est
 * mieux pour la vie privée des visiteurs et la conformité RGPD.
 *
 * On réécrit ICI, au moment de l'affichage, plutôt que de dépendre uniquement du
 * backend : ça couvre aussi les films DÉJÀ en base (stockés en
 * `www.youtube.com/embed/...`) sans avoir à migrer les données.
 *
 * @param {string|null|undefined} url - URL d'embed (ex: https://www.youtube.com/embed/KEY).
 * @returns {string|null|undefined} L'URL en `youtube-nocookie.com`, ou la valeur
 *   d'origine si elle ne correspond pas (rien à convertir).
 */
export function toNoCookieEmbed(url) {
  if (!url) return url;
  // Remplace le domaine youtube.com (avec ou sans "www.") par youtube-nocookie.com.
  // On ne touche qu'au préfixe : l'identifiant de la vidéo (KEY) reste intact.
  return url.replace(
    /^https?:\/\/(www\.)?youtube\.com\/embed\//,
    "https://www.youtube-nocookie.com/embed/"
  );
}
