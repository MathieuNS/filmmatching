import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LandingPage from "../screens/landing_page";
import Login from "../screens/login";
import CreateLogin from "../screens/create_login";
import ForgotPassword from "../screens/forgot_password";
import CheckEmail from "../screens/check_email";
import Placeholder from "../screens/_Placeholder";
// Pages statiques/légales publiques (Phase 8) — accessibles déconnecté.
import RGPD from "../screens/rgpd";
import MentionsLegales from "../screens/mentions_legales";
import Contact from "../screens/contact";
import Donation from "../screens/donation";

// createNativeStackNavigator = une "pile" d'écrans : on empile/dépile les
// écrans, avec une transition native (glissement). Équivaut aux <Route> du web.
const Stack = createNativeStackNavigator();

/**
 * AuthStack — pile des écrans accessibles SANS être connecté.
 *
 * Landing + écrans d'authentification + pages légales publiques.
 * Pour l'instant, seule la landing est implémentée ; les autres pointent
 * vers le Placeholder et seront remplacés en phase 4 (auth) et 8 (légales).
 *
 * `headerShown: false` : ces écrans gèrent leur propre mise en page plein
 * écran (pas de barre d'en-tête native).
 *
 * @returns {JSX.Element} La pile de navigation "déconnecté"
 */
export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Écran de départ */}
      <Stack.Screen name="Landing" component={LandingPage} />

      {/* Authentification (phase 4). Les noms "Login"/"CreateLogin"
          correspondent à ceux appelés par les boutons de la landing. */}
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="CreateLogin" component={CreateLogin} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="CheckEmail" component={CheckEmail} />
      {/* ResetPassword / ActivateAccount : gérés par le site web (liens email).
          Laissés en Placeholder, à activer si Universal Links un jour (phase 9). */}
      <Stack.Screen name="ResetPassword" component={Placeholder} />
      <Stack.Screen name="ActivateAccount" component={Placeholder} />

      {/* Pages statiques/légales publiques (phase 8). Ces écrans gèrent leur
          propre en-tête (StaticScreenHeader), cohérent avec headerShown:false. */}
      <Stack.Screen name="RGPD" component={RGPD} />
      <Stack.Screen name="MentionsLegales" component={MentionsLegales} />
      <Stack.Screen name="Contact" component={Contact} />
      <Stack.Screen name="Donation" component={Donation} />
    </Stack.Navigator>
  );
}
