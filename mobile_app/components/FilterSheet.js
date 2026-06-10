import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, GRADIENTS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING } from "../constants/spacing";
import { DEFAULT_FILTERS } from "../api/filtersStorage";

/**
 * Chip — petite pastille cliquable pour sélectionner/désélectionner un filtre.
 *
 * @param {Object} props
 * @param {string} props.label - le texte affiché
 * @param {boolean} props.active - true si la chip est sélectionnée
 * @param {Function} props.onPress - appelée au clic
 * @returns {JSX.Element} La chip
 */
function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * FilterSheet — panneau de filtres glissant depuis le bas (bottom sheet).
 *
 * Port du composant web `FilterBottomSheet.jsx`. 4 sections :
 * Type / Genres / Plateformes / Année. Le composant travaille sur un
 * "brouillon" (draft) : les changements ne remontent au parent qu'au clic
 * sur "Appliquer", ce qui permet de tout régler avant de valider.
 *
 * @param {Object} props
 * @param {boolean} props.visible - le panneau est-il affiché ?
 * @param {Function} props.onClose - fermer le panneau
 * @param {Function} props.onApply - appelée avec les nouveaux filtres
 * @param {Object} props.currentFilters - filtres actuellement actifs
 * @param {Array} props.availableGenres - genres dispo [{ tmdb_id, genre }]
 * @param {Array} props.availablePlateforms - plateformes [{ tmdb_id, plateform }]
 * @returns {JSX.Element} Le bottom sheet (Modal)
 */
export default function FilterSheet({
  visible,
  onClose,
  onApply,
  currentFilters,
  availableGenres,
  availablePlateforms,
}) {
  // Insets bas pour ne pas coller les boutons à la barre de navigation système.
  const insets = useSafeAreaInsets();

  // Brouillon : copie des filtres actifs, modifiée localement.
  const [draft, setDraft] = useState(currentFilters);

  // À chaque ouverture, on recopie les filtres actifs dans le brouillon
  // (si l'utilisateur ferme sans appliquer, ses modifs sont oubliées).
  useEffect(() => {
    if (visible) {
      setDraft({ ...currentFilters });
    }
  }, [visible, currentFilters]);

  /**
   * Active/désactive le type (Film/Série). Recliquer le même = aucun filtre.
   * @param {string} type - "Film" ou "Série"
   */
  function toggleType(type) {
    setDraft((prev) => ({ ...prev, type: prev.type === type ? "" : type }));
  }

  /**
   * Ajoute/retire une valeur d'un tableau de filtres (genres ou plateformes).
   * @param {string} field - "genres" ou "plateforms"
   * @param {string} value - la valeur à basculer
   */
  function toggleInList(field, value) {
    setDraft((prev) => {
      const list = [...prev[field]];
      const index = list.indexOf(value);
      if (index >= 0) {
        list.splice(index, 1); // déjà présent → on retire
      } else {
        list.push(value); // absent → on ajoute
      }
      return { ...prev, [field]: list };
    });
  }

  /**
   * Met à jour l'année min ou max (on ne garde que les chiffres).
   * @param {string} field - "yearMin" ou "yearMax"
   * @param {string} value - texte saisi
   */
  function setYear(field, value) {
    // replace(/[^0-9]/g, "") supprime tout ce qui n'est pas un chiffre
    setDraft((prev) => ({ ...prev, [field]: value.replace(/[^0-9]/g, "") }));
  }

  /**
   * Réinitialise les filtres ET applique immédiatement.
   * On remet le brouillon à zéro (pour l'affichage) puis on remonte
   * directement les filtres par défaut au parent et on ferme : un seul
   * clic suffit, plus besoin de cliquer ensuite sur "Appliquer".
   */
  function handleReset() {
    setDraft({ ...DEFAULT_FILTERS });
    onApply({ ...DEFAULT_FILTERS });
    onClose();
  }

  /** Applique le brouillon au parent et ferme. */
  function handleApply() {
    onApply(draft);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Fond sombre cliquable : un tap dessus ferme le panneau. Le panneau est
          IMBRIQUÉ dedans (et non posé à côté en position absolue) : c'est le
          pattern fiable du reste de l'app (FriendRatingsSheet, modale trailer).
          Un montage en frères absolus ne routait pas le tap au fond sur Android,
          d'où le panneau qui restait ouvert au clic en dehors. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Le panneau, ancré en bas. onPress vide → absorbe le tap pour qu'un
            clic DANS le panneau ne le ferme pas (équiv. stopPropagation du web). */}
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
          onPress={() => {}}
        >
          {/* Poignée décorative */}
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>

        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>Filtres</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {/* Contenu scrollable */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {/* Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Type</Text>
            <View style={styles.chips}>
              {["Film", "Série"].map((type) => (
                <Chip
                  key={type}
                  label={type}
                  active={draft.type === type}
                  onPress={() => toggleType(type)}
                />
              ))}
            </View>
          </View>

          {/* Genres */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Genres</Text>
            <View style={styles.chips}>
              {availableGenres.map((g) => (
                <Chip
                  key={g.tmdb_id}
                  label={g.genre}
                  active={draft.genres.includes(g.genre)}
                  onPress={() => toggleInList("genres", g.genre)}
                />
              ))}
            </View>
          </View>

          {/* Plateformes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Plateformes</Text>
            <View style={styles.chips}>
              {availablePlateforms.map((p) => (
                <Chip
                  key={p.tmdb_id}
                  label={p.plateform}
                  active={draft.plateforms.includes(p.plateform)}
                  onPress={() => toggleInList("plateforms", p.plateform)}
                />
              ))}
            </View>
          </View>

          {/* Année */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Année de sortie</Text>
            <View style={styles.yearRow}>
              <TextInput
                style={styles.yearInput}
                placeholder="Min"
                placeholderTextColor={COLORS.grisTexte}
                keyboardType="numeric"
                maxLength={4}
                value={draft.yearMin}
                onChangeText={(v) => setYear("yearMin", v)}
              />
              <Text style={styles.yearSeparator}>à</Text>
              <TextInput
                style={styles.yearInput}
                placeholder="Max"
                placeholderTextColor={COLORS.grisTexte}
                keyboardType="numeric"
                maxLength={4}
                value={draft.yearMax}
                onChangeText={(v) => setYear("yearMax", v)}
              />
            </View>
          </View>
        </ScrollView>

        {/* Pied : Réinitialiser / Appliquer */}
        <View style={styles.footer}>
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Réinitialiser</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={handleApply}>
            <LinearGradient
              colors={GRADIENTS.connexion}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.applyBtnGradient}
            >
              <Text style={styles.applyBtnText}>Appliquer</Text>
            </LinearGradient>
          </Pressable>
        </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    // Remplit tout l'écran (flex:1) et ancre le panneau imbriqué en bas.
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    // Plus de position absolue : le panneau est un enfant en flux du fond,
    // poussé en bas par le justifyContent:"flex-end" du backdrop.
    maxHeight: "85%",
    backgroundColor: COLORS.noirCarte,
    borderTopLeftRadius: RADII.card,
    borderTopRightRadius: RADII.card,
  },
  handle: {
    alignItems: "center",
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.grisMoyen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 21,
    color: COLORS.blancDoux,
  },
  close: {
    color: COLORS.grisTexte,
    fontSize: 22,
    paddingHorizontal: SPACING.sm,
  },
  content: {
    paddingHorizontal: SPACING.xl,
  },
  contentInner: {
    paddingBottom: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.xxl,
  },
  sectionLabel: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.grisTexte,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: SPACING.md,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.grisMoyen,
    backgroundColor: COLORS.grisSombre,
  },
  chipActive: {
    backgroundColor: "rgba(123,92,255,0.15)",
    borderColor: COLORS.violetNuit,
  },
  chipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.grisTexte,
  },
  chipTextActive: {
    color: COLORS.violetNuit,
    fontFamily: FONTS.bodySemiBold,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  yearInput: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg - 2,
    borderRadius: RADII.input - 2,
    borderWidth: 1,
    borderColor: COLORS.grisMoyen,
    backgroundColor: COLORS.grisSombre,
    color: COLORS.blancDoux,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  yearSeparator: {
    color: COLORS.grisTexte,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.grisMoyen,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: SPACING.lg - 2,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.grisMoyen,
    alignItems: "center",
  },
  resetBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: COLORS.grisTexte,
  },
  applyBtn: {
    flex: 1,
    borderRadius: RADII.button,
    overflow: "hidden",
  },
  applyBtnGradient: {
    paddingVertical: SPACING.lg - 2,
    alignItems: "center",
  },
  applyBtnText: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: COLORS.blancDoux,
  },
});
