import { useState, useEffect } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import api from "../api/client";
import { logout } from "../store/authSlice";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS, SHADOWS } from "../constants/spacing";

/**
 * Liste des entrées du menu.
 * `id` = nom de la route React Navigation (sert aussi à exclure la page
 * courante). `icon` = emoji (les vraies icônes SVG viendront en phase 9).
 */
const MENU_ITEMS = [
  { id: "Home", label: "Swiper", icon: "👆" },
  { id: "FilmList", label: "Ma liste", icon: "📋" },
  { id: "Friends", label: "Mes Amis", icon: "👥", showBadge: true },
  { id: "AlAffiche", label: "À l'affiche", icon: "🎬" },
  { id: "UserAccount", label: "Mon compte", icon: "👤" },
  { id: "Donation", label: "Un café ?", icon: "☕" },
  { id: "logout", label: "Déconnexion", icon: "🚪" },
];

/**
 * HamburgerMenu — menu de navigation principal (porté du web).
 *
 * Un bouton "3 barres" (qui devient une croix à l'ouverture) déroule un
 * menu avec les liens de l'app. Il exclut automatiquement la page
 * courante et affiche un badge rouge avec le nombre de demandes d'ami
 * en attente.
 *
 * Différences avec le web :
 * - la navigation passe par React Navigation (`useNavigation`) ;
 * - la "Déconnexion" déclenche `dispatch(logout())` (Redux) au lieu de
 *   vider le localStorage, ce qui bascule l'app vers l'écran de connexion.
 *
 * @param {Object} props
 * @param {string} [props.currentRouteName] - nom de la route affichée
 *   (fourni par AppHeader) pour exclure la page courante du menu.
 * @returns {JSX.Element} Le bouton hamburger et son menu déroulant.
 */
export default function HamburgerMenu({ currentRouteName }) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  // insets = tailles des zones "sûres" (encoche, barre d'état) pour bien
  // positionner le menu déroulant sous le bouton.
  const insets = useSafeAreaInsets();

  // Menu ouvert ou fermé ?
  const [isOpen, setIsOpen] = useState(false);
  // Nombre de demandes d'ami en attente (badge de notification).
  const [pendingCount, setPendingCount] = useState(0);

  // Au montage, on récupère le nombre de demandes d'ami en attente.
  useEffect(() => {
    async function loadPendingCount() {
      try {
        const response = await api.get("/api/friends/pending-count/");
        setPendingCount(response.data.count);
      } catch (error) {
        // Échec silencieux : pas de badge plutôt qu'un crash.
        console.error("Erreur chargement demandes en attente :", error);
      }
    }
    loadPendingCount();
  }, []);

  // On cache la page courante (on ne navigue pas vers là où on est déjà).
  const visibleItems = MENU_ITEMS.filter((item) => item.id !== currentRouteName);

  /**
   * Gère le clic sur une entrée du menu : ferme le menu, puis navigue
   * (ou déconnecte si c'est l'entrée "logout").
   *
   * @param {string} id - identifiant/route de l'entrée cliquée
   */
  function handlePress(id) {
    setIsOpen(false);
    if (id === "logout") {
      dispatch(logout()); // -> authSlice -> RootNavigator bascule sur AuthStack
    } else {
      navigation.navigate(id);
    }
  }

  return (
    <View>
      {/* --- Bouton hamburger --- */}
      <Pressable
        style={styles.btn}
        onPress={() => setIsOpen(true)}
        accessibilityLabel="Menu de navigation"
      >
        {/* 3 barres horizontales */}
        <View style={styles.icon}>
          <View style={styles.bar} />
          <View style={styles.bar} />
          <View style={styles.bar} />
        </View>
        {/* Badge rouge : nombre de demandes d'ami en attente */}
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </Pressable>

      {/* --- Menu déroulant (dans un Modal pour passer au-dessus de tout) ---
          transparent : on ne voit que notre dropdown, pas un fond opaque. */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)} // bouton retour Android
      >
        {/* Fond plein écran cliquable : ferme le menu si on tape à côté. */}
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          {/* Le dropdown, positionné en haut à droite sous le bouton.
              On stoppe la propagation (onStartShouldSetResponder) pour qu'un
              clic SUR le menu ne le ferme pas. */}
          <View
            style={[styles.dropdown, { top: insets.top + 52 }]}
            onStartShouldSetResponder={() => true}
          >
            {visibleItems.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => handlePress(item.id)}
                style={[styles.item, index > 0 && styles.itemSeparator]}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {/* Badge sur "Mes Amis" si des demandes sont en attente */}
                {item.showBadge && pendingCount > 0 && (
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Bouton ---
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.noirCarte,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
  },
  icon: {
    width: 18,
    gap: 4,
  },
  bar: {
    height: 2,
    width: "100%",
    borderRadius: 2,
    backgroundColor: COLORS.blancDoux,
  },
  // --- Badge sur le bouton ---
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.corailVif,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.noirCinema,
  },
  badgeText: {
    color: "#fff",
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  // --- Menu déroulant ---
  backdrop: {
    flex: 1, // couvre tout l'écran
  },
  dropdown: {
    position: "absolute",
    right: SPACING.lg,
    minWidth: 190,
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.colorStrong,
    overflow: "hidden",
    ...SHADOWS.card,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  // Trait de séparation entre deux entrées
  itemSeparator: {
    borderTopWidth: BORDERS.width,
    borderTopColor: BORDERS.color,
  },
  itemIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  itemLabel: {
    flex: 1, // pousse le badge éventuel à droite
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  itemBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.corailVif,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBadgeText: {
    color: "#fff",
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
});
