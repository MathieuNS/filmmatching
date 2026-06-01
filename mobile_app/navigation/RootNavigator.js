import { NavigationContainer } from "@react-navigation/native";
import { useSelector } from "react-redux";
import AuthStack from "./AuthStack";
import AppStack from "./AppStack";
import LoadingScreen from "../screens/LoadingScreen";

/**
 * RootNavigator — aiguilleur principal de l'app (remplace `ProtectedRoute`).
 *
 * Il lit l'état d'authentification dans Redux (`auth.status`) et affiche :
 *  - "idle"/"loading"  -> LoadingScreen (on attend la fin de bootstrapAuth)
 *  - "authenticated"   -> AppStack (écrans connectés)
 *  - "unauthenticated" -> AuthStack (landing + connexion)
 *
 * Le basculement est AUTOMATIQUE : quand `login`, `logout` ou
 * `sessionExpired` changent le status, ce composant se re-rend et affiche
 * la bonne pile. Plus besoin de redirection manuelle comme sur le web.
 *
 * `NavigationContainer` est la racine obligatoire de React Navigation
 * (l'équivalent de `<BrowserRouter>` du web).
 *
 * @returns {JSX.Element} L'écran approprié selon l'état de connexion
 */
export default function RootNavigator() {
  // useSelector lit une valeur du store Redux et re-rend si elle change.
  const status = useSelector((state) => state.auth.status);

  // Tant qu'on vérifie la session, on affiche le chargement.
  if (status === "idle" || status === "loading") {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {status === "authenticated" ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
