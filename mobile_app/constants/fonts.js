/* ============================================================
   fonts.js — Polices d'écriture de l'application mobile
   ------------------------------------------------------------
   Le site web utilise deux polices Google Fonts :
   - "Outfit" pour les TITRES / boutons / logo (police "display")
   - "Sora"   pour le TEXTE courant (police "body")

   IMPORTANT (différence avec le web) :
   Sur le web, on écrit `font-family: Outfit` + `font-weight: 700`
   et le navigateur choisit la bonne graisse tout seul.
   En React Native, ça ne marche pas comme ça : CHAQUE graisse
   est une police SÉPARÉE avec son propre nom. On n'utilise donc
   PAS `fontWeight` ; on choisit directement la bonne famille
   (ex : FONTS.displayBold au lieu de display + fontWeight 700).

   Les noms ci-dessous (ex : "Outfit_700Bold") correspondent
   exactement aux polices chargées dans App.js via les paquets
   @expo-google-fonts/outfit et @expo-google-fonts/sora.
   ============================================================ */

/**
 * FONTS — noms des familles de police à utiliser dans les styles.
 *
 * "display" = Outfit (titres, boutons, logo).
 * "body"    = Sora (texte, descriptions).
 * Le suffixe indique la graisse (Regular, Medium, Bold...).
 */
export const FONTS = {
  // ===== Outfit (titres / display) =====
  display: "Outfit_400Regular", // normal
  displayMedium: "Outfit_500Medium",
  displaySemiBold: "Outfit_600SemiBold",
  displayBold: "Outfit_700Bold",
  displayExtraBold: "Outfit_800ExtraBold",
  displayBlack: "Outfit_900Black", // le plus gras (gros titres)

  // ===== Sora (texte / body) =====
  bodyLight: "Sora_300Light",
  body: "Sora_400Regular", // normal
  bodyMedium: "Sora_500Medium",
  bodySemiBold: "Sora_600SemiBold",
  bodyBold: "Sora_700Bold",
};
