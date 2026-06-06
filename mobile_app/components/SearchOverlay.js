import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";
import { searchFilms } from "../api/films";

/**
 * SearchOverlay — recherche d'un film par titre (overlay plein écran).
 *
 * Port de l'overlay de recherche de la page Home web. L'utilisateur tape
 * un titre ; après une courte pause (debounce 300ms) on interroge l'API,
 * et on liste les résultats. Cliquer un résultat l'injecte sur la carte
 * pour pouvoir le swiper.
 *
 * "Debounce" = on attend que l'utilisateur arrête de taper avant d'envoyer
 * la requête. Sans ça, on enverrait une requête à CHAQUE lettre.
 *
 * @param {Object} props
 * @param {boolean} props.visible - l'overlay est-il affiché ?
 * @param {Function} props.onClose - fermer l'overlay
 * @param {Function} props.onSelect - appelée avec le film choisi
 * @returns {JSX.Element} L'overlay de recherche (Modal)
 */
export default function SearchOverlay({ visible, onClose, onSelect }) {
  const insets = useSafeAreaInsets();

  // Référence vers le champ de saisie. Une "ref" est une poignée qui nous
  // permet d'appeler des méthodes du composant en code (ici .focus()) sans
  // passer par l'état React.
  const inputRef = useRef(null);

  // Texte saisi, résultats reçus, et état de chargement.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Donne le focus au champ de recherche → ouvre le clavier.
   *
   * Appelée par la prop `onShow` du Modal, c.-à-d. une fois que le Modal est
   * COMPLÈTEMENT affiché à l'écran. Sur Android, demander le focus pendant
   * l'animation d'ouverture ne marche pas (le clavier ne s'ouvre pas), d'où
   * ce petit délai de sécurité qui laisse l'OS finir d'afficher le Modal.
   */
  function focusInput() {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  // Quand l'overlay se ferme, on remet la recherche à zéro.
  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [visible]);

  // Recherche débouncée : on relance un minuteur à chaque frappe.
  useEffect(() => {
    // Moins de 2 caractères : on n'interroge pas l'API.
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // setTimeout renvoie un identifiant qu'on pourra annuler.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchFilms(query);
        setResults(data);
      } catch (error) {
        console.error("Erreur recherche :", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    // Nettoyage : si `query` change avant 300ms, on annule le minuteur
    // précédent → une seule requête pour le texte final.
    return () => clearTimeout(timer);
  }, [query]);

  /**
   * Gère le clic sur un résultat : on remonte le film au parent et on ferme.
   * @param {Object} film - le film choisi
   */
  function handleSelect(film) {
    onSelect(film);
    onClose();
  }

  /**
   * Rendu d'une ligne de résultat (mini-affiche + titre + année).
   * @param {Object} param0
   * @param {Object} param0.item - le film à afficher
   */
  function renderItem({ item }) {
    return (
      <Pressable style={styles.resultItem} onPress={() => handleSelect(item)}>
        <Image
          style={styles.resultImg}
          source={{ uri: item.img }}
          resizeMode="cover"
        />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.resultYear}>{item.release_year}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={focusInput}
    >
      {/* Fond sombre : un tap dessus (zone "vide") ferme l'overlay. */}
      <Pressable
        style={[styles.overlay, { paddingTop: insets.top + SPACING.lg }]}
        onPress={onClose}
      >
        {/*
          Conteneur du contenu (barre + résultats). Son onPress ne fait RIEN :
          il sert juste à "absorber" le tap pour qu'il ne remonte pas au fond
          → taper sur la barre ou un résultat ne ferme PAS l'overlay.
        */}
        <Pressable style={styles.content} onPress={() => {}}>
          {/* Barre de saisie */}
          <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Rechercher un film..."
            placeholderTextColor={COLORS.grisTexte}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* États : chargement / résultats / aucun résultat */}
        {loading && <Text style={styles.loading}>Recherche...</Text>}

        {!loading && results.length > 0 && (
          <FlatList
            style={styles.results}
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <Text style={styles.noResults}>
            Aucun film trouvé pour « {query} »
          </Text>
        )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(13,13,15,0.95)",
    paddingHorizontal: SPACING.lg,
  },
  // Conteneur du contenu : pleine largeur, mais hauteur = celle de ses enfants
  // (barre + résultats), pour laisser une zone "vide" en dessous qui ferme.
  content: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm + 2,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: "rgba(123,92,255,0.4)",
    backgroundColor: COLORS.grisSombre,
  },
  inputIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    color: COLORS.blancDoux,
    fontFamily: FONTS.body,
    fontSize: 15,
    // padding vertical 0 pour que le champ ne soit pas trop haut sur Android
    paddingVertical: 0,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: RADII.round,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: COLORS.grisTexte,
    fontSize: 12,
  },
  loading: {
    textAlign: "center",
    paddingVertical: SPACING.xl,
    color: COLORS.grisTexte,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  results: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.noirCarte,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    borderRadius: RADII.input,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: BORDERS.width,
    borderBottomColor: BORDERS.color,
  },
  resultImg: {
    width: 36,
    height: 54,
    borderRadius: RADII.sm,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: COLORS.blancDoux,
  },
  resultYear: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
  },
  noResults: {
    textAlign: "center",
    paddingVertical: SPACING.xxl,
    color: COLORS.grisTexte,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
});
