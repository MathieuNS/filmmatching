// useCallback : mémorise une fonction ; useEffect : lance du code au montage
import { useCallback, useEffect } from "react";
import { View } from "react-native";
// Provider : rend le store Redux accessible à toute l'app
import { Provider } from "react-redux";
import { store } from "./store";
// Thunk lancé au démarrage : suis-je déjà connecté ? (remplace ProtectedRoute)
import { bootstrapAuth } from "./store/authSlice";
// SafeAreaProvider : gère les zones "sûres" (encoches, barre d'état)
import { SafeAreaProvider } from "react-native-safe-area-context";
// RootNavigator : aiguilleur qui choisit AuthStack ou AppStack selon Redux
import RootNavigator from "./navigation/RootNavigator";
// expo-splash-screen : contrôle l'écran de démarrage (le logo affiché au lancement)
import * as SplashScreen from "expo-splash-screen";
// useFonts : hook qui charge des polices et indique quand elles sont prêtes.
// On importe aussi chaque graisse utilisée (chacune est une police distincte).
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import {
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from "@expo-google-fonts/sora";

// On empêche l'écran de démarrage de disparaître tout seul : on le gardera
// visible TANT QUE les polices ne sont pas chargées, pour éviter un "flash"
// où le texte s'affiche d'abord avec la mauvaise police.
SplashScreen.preventAutoHideAsync();

/**
 * App — point d'entrée de l'interface de l'application mobile.
 *
 * Rôle ici : charger les polices Outfit/Sora, lancer la vérification de
 * session, puis monter la navigation (RootNavigator) sous les providers
 * Redux et SafeArea.
 *
 * @returns {JSX.Element|null} L'app, ou null tant que les polices se
 *   chargent (l'écran de démarrage reste visible).
 */
export default function App() {
  // useFonts renvoie [chargées?]. Tant que c'est false, on n'affiche rien.
  const [fontsLoaded] = useFonts({
    // La clé doit correspondre EXACTEMENT au nom utilisé dans constants/fonts.js
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  // Au démarrage, on vérifie l'état de connexion (token valide ? à rafraîchir ?).
  // store.dispatch directement, car App est AU-DESSUS du <Provider> (pas de hook ici).
  useEffect(() => {
    store.dispatch(bootstrapAuth());
  }, []);

  // Une fois les polices prêtes, on cache l'écran de démarrage.
  // onLayout = appelé quand la vue est mesurée/affichée à l'écran.
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Tant que les polices ne sont pas chargées, on garde l'écran de démarrage.
  if (!fontsLoaded) {
    return null;
  }

  // <Provider> (Redux) enveloppe <SafeAreaProvider> (encoches) qui enveloppe
  // le RootNavigator. flex:1 + onLayout : occupe l'écran et masque le splash.
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <RootNavigator />
        </View>
      </SafeAreaProvider>
    </Provider>
  );
}
