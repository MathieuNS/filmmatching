/* ============================================================
   index.js — Point d'entrée unique des composants réutilisables
   ------------------------------------------------------------
   Ce fichier "baril" (barrel) re-exporte tous les composants du
   dossier. Avantage : on peut les importer en UNE ligne depuis
   les écrans, au lieu d'un import par fichier.

     import { Button, Input, Card } from "../components";

   plutôt que :

     import Button from "../components/Button";
     import Input from "../components/Input";
     ...
   ============================================================ */

export { default as GradientText } from "./GradientText";
export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as Pill } from "./Pill";
export { default as Input } from "./Input";
export { default as Checkbox } from "./Checkbox";
export { default as AuthLayout } from "./AuthLayout";
