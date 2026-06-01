import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppHeader from "../components/AppHeader";
import Placeholder from "../screens/_Placeholder";
// Écran de swipe (Phase 5) — remplace le Placeholder pour la route "Home".
import Home from "../screens/home";
// Écrans social (Phase 6).
import Friends from "../screens/Friends";
import MatchList from "../screens/match_list";

const Stack = createNativeStackNavigator();

/**
 * AppStack — pile des écrans accessibles UNE FOIS connecté.
 *
 * Le premier écran (`Home`, le swipe) est l'écran d'accueil de l'app.
 * Tous les écrans sont pour l'instant des Placeholder ; chaque phase
 * suivante (5 à 8) remplacera `component={Placeholder}` par le vrai écran.
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
      <Stack.Screen name="FilmList" component={Placeholder} />
      <Stack.Screen name="Friends" component={Friends} />
      <Stack.Screen name="MatchList" component={MatchList} />
      <Stack.Screen name="AlAffiche" component={Placeholder} />
      <Stack.Screen name="UserAccount" component={Placeholder} />
      <Stack.Screen name="Donation" component={Placeholder} />

      {/* Pages légales aussi accessibles depuis l'app */}
      <Stack.Screen name="RGPD" component={Placeholder} />
      <Stack.Screen name="MentionsLegales" component={Placeholder} />
      <Stack.Screen name="Contact" component={Placeholder} />
    </Stack.Navigator>
  );
}
