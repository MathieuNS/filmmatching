/**
 * Utilitaire pour gérer les avatars dynamiquement.
 *
 * Grâce à `import.meta.glob`, Vite scanne automatiquement tous les fichiers
 * .svg dans le dossier `src/assets/avatars/` au moment du build.
 * Résultat : quand tu ajoutes un nouveau SVG dans ce dossier, il apparaît
 * automatiquement dans le sélecteur d'avatar — pas besoin de toucher au code !
 *
 * import.meta.glob retourne un objet dont les clés sont les chemins des fichiers
 * et les valeurs sont les URLs résolues par Vite (avec hash pour le cache).
 * Exemple : { "../assets/avatars/avatar-popcorn.svg": "/assets/avatar-popcorn-abc123.svg" }
 */

// `eager: true` charge tous les fichiers immédiatement (pas de lazy loading)
// `query: "?url"` dit à Vite de retourner l'URL du fichier, pas son contenu
const avatarModules = import.meta.glob("../assets/avatars/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

/**
 * Liste de tous les avatars disponibles.
 * Chaque élément contient :
 * - `name` : le nom du fichier (ex: "avatar-popcorn.svg") — stocké en BDD
 * - `url`  : l'URL résolue par Vite — utilisée dans les balises <img>
 *
 * @type {Array<{ name: string, url: string }>}
 */
export const AVATARS = Object.entries(avatarModules).map(([path, url]) => ({
  // On extrait juste le nom du fichier depuis le chemin complet
  // "../assets/avatars/avatar-popcorn.svg" → "avatar-popcorn.svg"
  name: path.split("/").pop(),
  url,
}));

/**
 * Trouve l'URL d'un avatar à partir de son nom de fichier.
 *
 * Utilisé pour afficher l'avatar de l'utilisateur : le backend stocke
 * le nom du fichier (ex: "avatar-popcorn.svg"), et cette fonction
 * retourne l'URL Vite correspondante.
 *
 * @param {string} avatarName - Le nom du fichier avatar (ex: "avatar-popcorn.svg")
 * @returns {string} L'URL de l'avatar, ou l'avatar par défaut si non trouvé
 */
export function getAvatarUrl(avatarName) {
  // On cherche l'avatar dans la liste
  const avatar = AVATARS.find((a) => a.name === avatarName);
  // Si trouvé, on retourne son URL ; sinon on prend le premier avatar disponible
  return avatar ? avatar.url : AVATARS[0]?.url || "";
}
