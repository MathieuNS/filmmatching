// MaskedView : permet d'appliquer un dégradé SUR du texte (texte "découpé")
import MaskedView from "@react-native-masked-view/masked-view";
// LinearGradient : dessine un dégradé (impossible en pur React Native)
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native";
// Dégradés centralisés (source unique)
import { GRADIENTS } from "../constants/colors";

/**
 * GradientText — affiche du texte avec un dégradé de couleur dessus.
 *
 * Pourquoi c'est compliqué : en CSS web on écrit `background-clip: text`.
 * En React Native ça n'existe pas. L'astuce est d'utiliser un "masque" :
 * on dessine un dégradé, puis on le "découpe" à la forme du texte grâce
 * à MaskedView. Le texte sert de pochoir (stencil).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - le texte à afficher
 * @param {string[]} [props.colors=GRADIENTS.passion] - couleurs du dégradé (au moins 2)
 * @param {Object} [props.start={x:0,y:0}] - point de départ du dégradé
 * @param {Object} [props.end={x:1,y:1}] - point de fin (0,0->1,1 ≈ 135° comme le web)
 * @param {Object|Object[]} [props.style] - style du texte (taille, graisse...)
 * @param {number} [props.numberOfLines] - limite de lignes (tronque avec "…")
 * @returns {JSX.Element} Le texte coloré en dégradé
 */
export default function GradientText({
  children,
  colors = GRADIENTS.passion,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  numberOfLines,
}) {
  return (
    <MaskedView
      // maskElement = le "pochoir" : la forme à travers laquelle on voit le dégradé.
      // `numberOfLines` est appliqué AUX DEUX textes (masque + texte de mesure)
      // pour qu'ils gardent exactement la même taille : sinon le dégradé et le
      // pochoir auraient des dimensions différentes.
      maskElement={
        <Text style={style} numberOfLines={numberOfLines}>
          {children}
        </Text>
      }
    >
      <LinearGradient colors={colors} start={start} end={end}>
        {/* On remet le même texte mais invisible (opacity 0) juste pour
            donner la bonne taille au dégradé. Le visible, c'est le masque. */}
        <Text style={[style, { opacity: 0 }]} numberOfLines={numberOfLines}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
