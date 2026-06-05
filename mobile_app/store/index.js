/* ============================================================
   index.js — Configuration du store Redux
   ------------------------------------------------------------
   Le "store" est la mémoire centrale de l'app (source de vérité
   unique). On y branche tous les "slices" (ici : auth). N'importe
   quel écran pourra lire cet état ou déclencher ses actions.
   ============================================================ */

import { configureStore } from "@reduxjs/toolkit";
import authReducer, { sessionExpired } from "./authSlice";
import { setOnSessionExpired } from "../api/client";

// configureStore assemble les reducers et active les bons outils par défaut
// (devtools, vérifications). On n'a qu'un slice pour l'instant : `auth`.
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

// --- Pont axios -> Redux ---
// Quand l'intercepteur de client.js n'arrive plus à rafraîchir le jeton,
// il appelle cette fonction : on déconnecte alors proprement via Redux.
// (On le branche ICI, et pas dans client.js, pour éviter une dépendance
//  circulaire entre le store et l'instance axios.)
setOnSessionExpired(() => {
  store.dispatch(sessionExpired());
});
