/**
 * Configuration Babel de l'app mobile.
 *
 * Babel est le "traducteur" qui transforme le code moderne (JSX, etc.) en
 * JavaScript que le téléphone comprend. Expo fournit déjà un preset complet
 * (`babel-preset-expo`) ; on ne fait que l'étendre.
 *
 * Point sécurité : en PRODUCTION uniquement, on retire tous les `console.*`
 * du bundle via `transform-remove-console`. Pourquoi ? Nos écrans font
 * `console.error("...", error)` ; or un objet d'erreur axios contient
 * `error.config` (donc l'en-tête Authorization "Bearer <token>" et, au login,
 * le mot de passe). Ces logs partiraient dans logcat sur l'APK. En dev, on
 * GARDE les logs (NODE_ENV !== "production") pour pouvoir débugger.
 */
module.exports = function (api) {
  // Met en cache la config (recalculée seulement si l'environnement change).
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    env: {
      // Babel lit BABEL_ENV ou NODE_ENV ; Metro met "production" lors d'un
      // build release → le plugin ne s'active que là, jamais en dev.
      production: {
        plugins: ["transform-remove-console"],
      },
    },
  };
};
