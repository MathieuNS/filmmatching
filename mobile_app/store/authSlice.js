/* ============================================================
   authSlice.js — État d'authentification (Redux Toolkit)
   ------------------------------------------------------------
   Un "slice" = un morceau de l'état global + les actions qui le
   modifient. Celui-ci gère UNE SEULE question : l'utilisateur
   est-il connecté ou non ? C'est lui que `RootNavigator` lira en
   phase 3 pour choisir entre l'écran de connexion et l'app
   (il remplace le `ProtectedRoute` du web).

   SÉCURITÉ : on ne met PAS les tokens ici. Ils restent dans le
   coffre-fort chiffré (storage.js). Redux ne garde qu'un booléen
   "connecté ?" — un état qui pourrait être loggé ne doit pas
   contenir de secret.

   Un "thunk" = une action ASYNCHRONE (qui fait un appel réseau ou
   lit le stockage) avant de mettre à jour l'état. `createAsyncThunk`
   génère pour nous 3 sous-actions : pending / fulfilled / rejected.
   ============================================================ */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";
import api from "../api/client";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "../api/storage";

/**
 * bootstrapAuth — à exécuter AU DÉMARRAGE de l'app.
 *
 * Reproduit la logique de `ProtectedRoute` du web : y a-t-il un jeton
 * d'accès valide ? S'il est expiré, on tente un rafraîchissement.
 * Renvoie `true` si l'utilisateur est connecté, `false` sinon.
 *
 * @returns {Promise<boolean>} connecté ou non
 */
export const bootstrapAuth = createAsyncThunk("auth/bootstrap", async () => {
  const access = await getAccessToken();
  if (!access) {
    return false; // jamais connecté
  }

  // jwtDecode lit le contenu du token (sans vérifier la signature) pour
  // récupérer `exp` = la date d'expiration (en secondes depuis 1970).
  const { exp } = jwtDecode(access);
  const now = Date.now() / 1000; // Date.now() est en millisecondes -> /1000

  if (exp > now) {
    return true; // jeton encore valide
  }

  // Jeton expiré : on tente un rafraîchissement avec le refresh token.
  const refresh = await getRefreshToken();
  if (!refresh) {
    await clearTokens();
    return false;
  }
  try {
    const response = await api.post("/api/token/refresh/", { refresh });
    await setTokens({ access: response.data.access });
    return true;
  } catch {
    // Refresh mort lui aussi : session terminée.
    await clearTokens();
    return false;
  }
});

/**
 * login — connecte l'utilisateur.
 *
 * Envoie les identifiants à `POST /api/token/`, stocke les deux tokens,
 * et marque l'utilisateur comme connecté. En cas d'échec, renvoie le
 * message d'erreur du serveur (401 = identifiants, 403 = compte non activé).
 *
 * @param {Object} credentials
 * @param {string} credentials.username - pseudo ou email
 * @param {string} credentials.password - mot de passe
 * @returns {Promise<boolean>} true si connecté
 */
export const login = createAsyncThunk(
  "auth/login",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/token/", { username, password });
      await setTokens({
        access: response.data.access,
        refresh: response.data.refresh,
      });
      return true;
    } catch (error) {
      // rejectWithValue permet de passer un message d'erreur "propre" au state.
      // On distingue 2 familles d'échec :
      //  - PAS de `error.response` => la requête n'a jamais atteint le serveur
      //    (réseau coupé, mauvaise URL d'API, backend éteint...). C'est une
      //    erreur RÉSEAU, surtout pas un problème d'identifiants.
      //  - Sinon, le serveur a répondu (401 identifiants, 403 compte non activé...).
      let message;
      if (!error.response) {
        message =
          "Impossible de joindre le serveur. Vérifie ta connexion";
      } else {
        message = error.response.data?.error || "Erreur d'identifiants.";
      }
      return rejectWithValue(message);
    }
  }
);

/**
 * logout — déconnecte l'utilisateur (vide le coffre-fort des tokens).
 *
 * @returns {Promise<boolean>} false (plus connecté)
 */
export const logout = createAsyncThunk("auth/logout", async () => {
  await clearTokens();
  return false;
});

const authSlice = createSlice({
  name: "auth",
  // status : "idle" (au lancement, on ne sait pas encore) -> "loading" ->
  // "authenticated" / "unauthenticated". Pratique pour afficher un écran
  // de chargement tant qu'on vérifie (phase 3).
  initialState: {
    status: "idle",
    isAuthenticated: false,
    error: null, // dernier message d'erreur de connexion
  },
  reducers: {
    /**
     * sessionExpired — déconnexion déclenchée par l'intercepteur axios
     * quand le rafraîchissement échoue en pleine utilisation.
     */
    sessionExpired(state) {
      state.isAuthenticated = false;
      state.status = "unauthenticated";
    },
  },
  // extraReducers : réagit aux sous-actions générées par les thunks.
  extraReducers: (builder) => {
    builder
      // --- bootstrapAuth ---
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = "loading";
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload;
        state.status = action.payload ? "authenticated" : "unauthenticated";
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.isAuthenticated = false;
        state.status = "unauthenticated";
      })
      // --- login ---
      // NB : on ne met PAS status = "loading" ici. Sinon le RootNavigator
      // afficherait le LoadingScreen pendant la connexion et démonterait le
      // formulaire (perte des champs saisis). Le bouton "Se connecter" gère
      // son propre état de chargement local. Le "loading" reste réservé au
      // démarrage (bootstrapAuth).
      .addCase(login.pending, (state) => {
        state.error = null;
      })
      .addCase(login.fulfilled, (state) => {
        state.isAuthenticated = true;
        state.status = "authenticated";
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.status = "unauthenticated";
        // action.payload = le message passé via rejectWithValue
        state.error = action.payload;
      })
      // --- logout ---
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.status = "unauthenticated";
      });
  },
});

// Action synchrone exportée (utilisée par le pont axios -> Redux).
export const { sessionExpired } = authSlice.actions;

// Le "reducer" du slice, à brancher dans le store.
export default authSlice.reducer;
