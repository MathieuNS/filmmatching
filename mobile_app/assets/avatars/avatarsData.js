/* ============================================================
   avatarsData.js — Les avatars SVG embarqués sous forme de texte
   ------------------------------------------------------------
   Sur le web, Vite scanne le dossier d'avatars et fournit une URL
   par fichier (import.meta.glob). En React Native, ce mécanisme
   n'existe pas. La solution la plus simple (zéro config de build) :
   recopier le CONTENU des fichiers .svg ici, dans des chaînes de
   caractères, et les afficher avec le composant `SvgXml` de
   `react-native-svg` (déjà installé).

   La clé de chaque entrée est le NOM DU FICHIER tel que stocké en
   base de données par le backend (ex : "avatar-popcorn.svg"), pour
   pouvoir retrouver le bon dessin à partir de ce que renvoie l'API.

   ⚠️ Si tu ajoutes/changes un avatar côté web, pense à recopier son
   SVG ici aussi (le mobile ne lit pas le dossier `frontend/`).
   ============================================================ */

/**
 * AVATARS_XML — table { nomDeFichier: chaîneSVG } de tous les avatars.
 *
 * Chaque valeur est le code SVG complet, identique au fichier web
 * correspondant. `SvgXml` sait l'interpréter et le dessiner.
 *
 * @type {Object<string, string>}
 */
export const AVATARS_XML = {
  "avatar-popcorn.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0D0D0F"/>
    </linearGradient>
    <linearGradient id="bucket" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FF4D6A"/>
      <stop offset="100%" stop-color="#cc2244"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#bg1)"/>
  <path d="M60 90 L68 160 Q70 168 78 168 L122 168 Q130 168 132 160 L140 90 Z" fill="url(#bucket)"/>
  <path d="M63 105 L137 105" stroke="#fff" stroke-width="2" opacity="0.3"/>
  <path d="M65 120 L135 120" stroke="#fff" stroke-width="2" opacity="0.3"/>
  <path d="M67 135 L133 135" stroke="#fff" stroke-width="2" opacity="0.3"/>
  <path d="M69 150 L131 150" stroke="#fff" stroke-width="2" opacity="0.3"/>
  <ellipse cx="100" cy="90" rx="42" ry="8" fill="#FF6B84" stroke="#fff" stroke-width="1.5" opacity="0.9"/>
  <circle cx="85" cy="72" r="12" fill="#FFAA2B" opacity="0.95"/>
  <circle cx="105" cy="65" r="14" fill="#FFD080" opacity="0.95"/>
  <circle cx="118" cy="76" r="11" fill="#FFAA2B" opacity="0.9"/>
  <circle cx="75" cy="62" r="10" fill="#FFD080" opacity="0.9"/>
  <circle cx="95" cy="55" r="13" fill="#FFAA2B" opacity="0.95"/>
  <circle cx="112" cy="58" r="10" fill="#FFE4A0" opacity="0.85"/>
  <circle cx="82" cy="52" r="9" fill="#FFAA2B" opacity="0.85"/>
  <circle cx="100" cy="45" r="11" fill="#FFD080" opacity="0.9"/>
  <circle cx="120" cy="65" r="8" fill="#FFE4A0" opacity="0.8"/>
  <polygon points="100,98 103,106 111,106 105,111 107,119 100,114 93,119 95,111 89,106 97,106" fill="#FFAA2B" opacity="0.8"/>
</svg>`,

  "avatar-camera.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0D0D0F"/>
    </linearGradient>
    <linearGradient id="cam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7B5CFF"/>
      <stop offset="100%" stop-color="#5a3fd6"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#bg2)"/>
  <rect x="45" y="75" width="90" height="65" rx="8" fill="url(#cam)"/>
  <circle cx="90" cy="107" r="22" fill="#0D0D0F" stroke="#9B80FF" stroke-width="3"/>
  <circle cx="90" cy="107" r="15" fill="#1a1a2e" stroke="#7B5CFF" stroke-width="2"/>
  <circle cx="90" cy="107" r="7" fill="#7B5CFF" opacity="0.4"/>
  <circle cx="85" cy="102" r="3" fill="#fff" opacity="0.3"/>
  <circle cx="65" cy="68" r="16" fill="#2a2a3e" stroke="#9B80FF" stroke-width="2"/>
  <circle cx="65" cy="68" r="5" fill="#7B5CFF" opacity="0.5"/>
  <circle cx="105" cy="68" r="16" fill="#2a2a3e" stroke="#9B80FF" stroke-width="2"/>
  <circle cx="105" cy="68" r="5" fill="#7B5CFF" opacity="0.5"/>
  <rect x="120" y="82" width="18" height="14" rx="3" fill="#5a3fd6"/>
  <rect x="123" y="85" width="12" height="8" rx="2" fill="#0D0D0F" opacity="0.6"/>
  <circle cx="125" cy="130" r="4" fill="#FF4D6A"/>
  <circle cx="125" cy="130" r="6" fill="#FF4D6A" opacity="0.3"/>
  <rect x="138" y="95" width="20" height="8" rx="4" fill="#5a3fd6"/>
</svg>`,

  "avatar-clapperboard.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0D0D0F"/>
    </linearGradient>
    <linearGradient id="clap" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2EE0A1"/>
      <stop offset="100%" stop-color="#1ab87a"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#bg3)"/>
  <rect x="40" y="80" width="120" height="80" rx="6" fill="#1e1e2e" stroke="#2EE0A1" stroke-width="2"/>
  <line x1="82" y1="100" x2="145" y2="100" stroke="#2EE0A1" stroke-width="1" opacity="0.3"/>
  <line x1="90" y1="116" x2="120" y2="116" stroke="#2EE0A1" stroke-width="1" opacity="0.3"/>
  <line x1="148" y1="116" x2="155" y2="116" stroke="#2EE0A1" stroke-width="1" opacity="0.3"/>
  <line x1="75" y1="132" x2="145" y2="132" stroke="#2EE0A1" stroke-width="1" opacity="0.3"/>
  <line x1="82" y1="148" x2="120" y2="148" stroke="#2EE0A1" stroke-width="1" opacity="0.3"/>
  <g transform="rotate(-12, 40, 80)">
    <rect x="40" y="58" width="120" height="22" rx="4" fill="url(#clap)"/>
    <rect x="48" y="58" width="10" height="22" fill="#0D0D0F" transform="skewX(-15)"/>
    <rect x="72" y="58" width="10" height="22" fill="#0D0D0F" transform="skewX(-15)"/>
    <rect x="96" y="58" width="10" height="22" fill="#0D0D0F" transform="skewX(-15)"/>
    <rect x="120" y="58" width="10" height="22" fill="#0D0D0F" transform="skewX(-15)"/>
    <rect x="144" y="58" width="10" height="22" fill="#0D0D0F" transform="skewX(-15)"/>
  </g>
  <circle cx="44" cy="80" r="5" fill="#2EE0A1" opacity="0.8"/>
  <circle cx="44" cy="80" r="2" fill="#0D0D0F"/>
</svg>`,

  "avatar-reel.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0D0D0F"/>
    </linearGradient>
    <linearGradient id="reelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF4D6A"/>
      <stop offset="50%" stop-color="#7B5CFF"/>
      <stop offset="100%" stop-color="#FF4D6A"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#bg5)"/>
  <circle cx="100" cy="100" r="55" fill="none" stroke="url(#reelGrad)" stroke-width="4"/>
  <circle cx="100" cy="100" r="50" fill="none" stroke="#2a2a4e" stroke-width="1"/>
  <circle cx="100" cy="100" r="16" fill="#2a2a4e" stroke="url(#reelGrad)" stroke-width="3"/>
  <circle cx="100" cy="100" r="6" fill="#0D0D0F"/>
  <line x1="100" y1="84" x2="100" y2="55" stroke="#7B5CFF" stroke-width="3" opacity="0.7"/>
  <line x1="100" y1="116" x2="100" y2="145" stroke="#7B5CFF" stroke-width="3" opacity="0.7"/>
  <line x1="84" y1="100" x2="55" y2="100" stroke="#FF4D6A" stroke-width="3" opacity="0.7"/>
  <line x1="116" y1="100" x2="145" y2="100" stroke="#FF4D6A" stroke-width="3" opacity="0.7"/>
  <line x1="89" y1="89" x2="68" y2="68" stroke="#7B5CFF" stroke-width="3" opacity="0.5"/>
  <line x1="111" y1="111" x2="132" y2="132" stroke="#7B5CFF" stroke-width="3" opacity="0.5"/>
  <line x1="111" y1="89" x2="132" y2="68" stroke="#FF4D6A" stroke-width="3" opacity="0.5"/>
  <line x1="89" y1="111" x2="68" y2="132" stroke="#FF4D6A" stroke-width="3" opacity="0.5"/>
  <circle cx="100" cy="48" r="5" fill="#1a1a2e" stroke="#7B5CFF" stroke-width="1"/>
  <circle cx="100" cy="152" r="5" fill="#1a1a2e" stroke="#7B5CFF" stroke-width="1"/>
  <circle cx="48" cy="100" r="5" fill="#1a1a2e" stroke="#FF4D6A" stroke-width="1"/>
  <circle cx="152" cy="100" r="5" fill="#1a1a2e" stroke="#FF4D6A" stroke-width="1"/>
  <circle cx="63" cy="63" r="5" fill="#1a1a2e" stroke="#7B5CFF" stroke-width="1"/>
  <circle cx="137" cy="137" r="5" fill="#1a1a2e" stroke="#7B5CFF" stroke-width="1"/>
  <circle cx="137" cy="63" r="5" fill="#1a1a2e" stroke="#FF4D6A" stroke-width="1"/>
  <circle cx="63" cy="137" r="5" fill="#1a1a2e" stroke="#FF4D6A" stroke-width="1"/>
  <path d="M148 115 Q160 120 165 130 Q170 140 162 148" fill="none" stroke="#FFAA2B" stroke-width="6" opacity="0.6"/>
  <rect x="160" y="126" width="4" height="3" rx="0.5" fill="#0D0D0F" opacity="0.5"/>
  <rect x="162" y="133" width="4" height="3" rx="0.5" fill="#0D0D0F" opacity="0.5"/>
  <rect x="161" y="140" width="4" height="3" rx="0.5" fill="#0D0D0F" opacity="0.5"/>
</svg>`,

  "avatar-ticket.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0D0D0F"/>
    </linearGradient>
    <linearGradient id="ticket" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFAA2B"/>
      <stop offset="100%" stop-color="#e88a00"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#bg4)"/>
  <path d="M35 70 L35 88 Q45 88 45 95 Q45 102 35 102 L35 140 Q35 145 40 145 L160 145 Q165 145 165 140 L165 102 Q155 102 155 95 Q155 88 165 88 L165 70 Q165 65 160 65 L40 65 Q35 65 35 70 Z" fill="url(#ticket)"/>
  <line x1="130" y1="70" x2="130" y2="140" stroke="#0D0D0F" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.4"/>
  <text x="55" y="85" font-family="sans-serif" font-weight="bold" font-size="11" fill="#0D0D0F" opacity="0.9">CINEMA</text>
  <text x="55" y="100" font-family="monospace" font-size="8" fill="#0D0D0F" opacity="0.6">SALLE 03</text>
  <text x="55" y="115" font-family="monospace" font-size="8" fill="#0D0D0F" opacity="0.6">RANG F - SIEGE 12</text>
  <text x="55" y="135" font-family="sans-serif" font-weight="bold" font-size="14" fill="#0D0D0F" opacity="0.8">20:30</text>
  <text x="135" y="95" font-family="monospace" font-size="7" fill="#0D0D0F" opacity="0.5" text-anchor="middle">F12</text>
  <polygon points="50,125 51,128 54,128 52,130 53,133 50,131 47,133 48,130 46,128 49,128" fill="#0D0D0F" opacity="0.3"/>
  <polygon points="110,80 111,83 114,83 112,85 113,88 110,86 107,88 108,85 106,83 109,83" fill="#0D0D0F" opacity="0.3"/>
</svg>`,
};

/**
 * Nom de l'avatar par défaut (utilisé quand l'API ne renvoie rien
 * ou un nom inconnu). Identique au défaut du web.
 * @type {string}
 */
export const DEFAULT_AVATAR = "avatar-popcorn.svg";
