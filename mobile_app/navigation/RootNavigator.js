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
 * ⚠️ `key` sur le `NavigationContainer` : AppStack et AuthStack partagent
 * certains noms d'écran (RGPD, Contact, MentionsLegales, Donation, accessibles
 * connecté ET déconnecté). Sans la `key`, en se déconnectant React Navigation
 * tente de PRÉSERVER l'écran courant par son nom : si on était (ou si l'historique
 * passait) sur une de ces pages partagées, l'AuthStack la ré-afficherait au lieu
 * de repartir sur `Landing`. Changer la `key` entre "auth"/"unauth" force le
 * conteneur à se remonter à neuf -> l'AuthStack démarre bien sur son écran initial.
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

  const isAuthenticated = status === "authenticated";

  return (
    <NavigationContainer key={isAuthenticated ? "app" : "auth"}>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
