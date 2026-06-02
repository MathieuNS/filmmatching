import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppHeader from "../components/AppHeader";
// Écran de swipe (Phase 5) — écran d'accueil de l'app.
import Home from "../screens/home";
// Écrans social (Phase 6).
import Friends from "../screens/Friends";
import MatchList from "../screens/match_list";
// Écrans catalogue (Phase 7).
import FilmList from "../screens/films_list";
import AlAffiche from "../screens/a_l_affiche";
// Écrans compte & pages statiques/légales (Phase 8).
import UserAccount from "../screens/user_account";
import Donation from "../screens/donation";
import RGPD from "../screens/rgpd";
import MentionsLegales from "../screens/mentions_legales";
import Contact from "../screens/contact";

const Stack = createNativeStackNavigator();

/**
 * AppStack — pile des écrans accessibles UNE FOIS connecté.
 *
 * Le premier écran (`Home`, le swipe) est l'écran d'accueil de l'app.
 * Tous les écrans des phases 5 à 8 sont désormais branchés sur leurs vrais
 * composants (plus de Placeholder).
 *
 * `header: () => <AppHeader />` : on remplace le header natif par notre
 * en-tête partagé (logo + menu), identique sur tous les écrans connectés.
 * React Navigation passe les props (dont `route`) à notre composant.
 *
 * @returns {JSX.Element} La pile de navigation "connecté"
 */
export default function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        header: (props) => <AppHeader {...props} />,
      }}
    >
      {/* Écran d'accueil = le swipe (phase 5) */}
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="FilmList" component={FilmList} />
      <Stack.Screen name="Friends" component={Friends} />
      <Stack.Screen name="MatchList" component={MatchList} />
      <Stack.Screen name="AlAffiche" component={AlAffiche} />

      {/* Mon compte : garde l'AppHeader partagé (page connectée). */}
      <Stack.Screen name="UserAccount" component={UserAccount} />

      {/* Pages statiques/légales : en-tête propre (StaticScreenHeader),
          donc on masque l'AppHeader pour éviter un double en-tête. */}
      <Stack.Screen
        name="Donation"
        component={Donation}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RGPD"
        component={RGPD}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MentionsLegales"
        component={MentionsLegales}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Contact"
        component={Contact}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
