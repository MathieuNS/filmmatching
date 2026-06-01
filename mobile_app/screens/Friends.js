import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import Avatar from "../components/Avatar";
import {
  fetchMe,
  fetchFriendships,
  searchUsers,
  sendFriendRequest,
  acceptFriend,
  deleteFriend,
} from "../api/friends";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADII, SPACING, BORDERS } from "../constants/spacing";

/**
 * Friends — écran "Mes Amis" (version mobile).
 *
 * Port de `frontend/src/pages/Friends.jsx`. Trois fonctions :
 *   1. voir/accepter les demandes d'amis reçues,
 *   2. voir la liste des amis confirmés (et ouvrir leurs matchs),
 *   3. envoyer une demande d'ami (recherche par pseudo + autocomplétion).
 *
 * Plus un mode "Soirée cinéma" : sélectionner plusieurs amis pour voir
 * les films likés en commun entre tous (matchs de groupe).
 *
 * @param {Object} props
 * @param {Object} props.navigation - objet de navigation (pile)
 * @returns {JSX.Element} L'écran des amis
 */
export default function Friends({ navigation }) {
  // --- Données ---
  const [currentUserId, setCurrentUserId] = useState(null);
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Mode "Soirée cinéma" (sélection multi-amis) ---
  const [selectMode, setSelectMode] = useState(false);
  // Set d'IDs d'amitiés sélectionnées (Set = ajout/retrait sans doublons).
  const [selectedIds, setSelectedIds] = useState(new Set());

  // --- Formulaire d'ajout d'ami ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // --- Autocomplétion ---
  const [suggestions, setSuggestions] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  // Timer du debounce conservé entre les rendus sans re-render.
  const debounceTimer = useRef(null);

  // ============================================================
  // Chargement initial : mon id + toutes mes amitiés (en parallèle)
  // ============================================================
  useEffect(() => {
    async function loadData() {
      try {
        const [me, friends] = await Promise.all([
          fetchMe(),
          fetchFriendships(),
        ]);
        setCurrentUserId(me.id);
        setFriendships(friends);
      } catch (error) {
        console.error("Erreur chargement amis :", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ============================================================
  // Autocomplétion avec debounce (300ms) sur la recherche d'utilisateurs
  // ============================================================
  useEffect(() => {
    // Si l'utilisateur a déjà choisi quelqu'un, on ne cherche plus.
    if (selectedUser) return;
    // Pas de recherche en dessous de 2 caractères.
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // On annule le timer précédent (frappe encore en cours).
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await searchUsers(searchQuery.trim());
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    // Nettoyage : annule le timer si le texte change avant les 300ms.
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery, selectedUser]);

  /**
   * Clic sur une suggestion : remplit le champ et mémorise l'utilisateur.
   * @param {Object} user - { id, username, avatar }
   */
  function handleSelectSuggestion(user) {
    setSearchQuery(user.username);
    setSelectedUser(user);
    setSuggestions([]);
  }

  /**
   * Envoie la demande d'ami : utilise l'utilisateur sélectionné s'il y en a
   * un, sinon cherche le pseudo exact dans l'API.
   */
  async function handleSendRequest() {
    if (!searchQuery.trim()) return;
    setSending(true);
    setFeedbackMessage(null);

    try {
      let targetUser = selectedUser;

      // Aucune suggestion choisie → on cherche le pseudo exact.
      if (!targetUser) {
        const results = await searchUsers(searchQuery.trim());
        const exactMatch = results.find(
          (u) => u.username.toLowerCase() === searchQuery.trim().toLowerCase()
        );
        if (!exactMatch) {
          setFeedbackMessage({
            type: "error",
            text: "Aucun utilisateur trouvé avec ce pseudo exact.",
          });
          setSending(false);
          return;
        }
        targetUser = exactMatch;
      }

      await sendFriendRequest(targetUser.id);

      setFeedbackMessage({
        type: "success",
        text: `Demande envoyée à ${targetUser.username} !`,
      });
      setSearchQuery("");
      setSelectedUser(null);

      // On recharge la liste pour afficher la demande envoyée.
      const friends = await fetchFriendships();
      setFriendships(friends);
    } catch (error) {
      // On essaie de donner un message clair selon l'erreur de l'API.
      const errorData = error.response?.data;
      let errorMsg = "Une erreur est survenue.";
      if (error.response?.status === 404) {
        errorMsg = "Aucun utilisateur trouvé avec ce pseudo.";
      } else if (errorData?.non_field_errors) {
        errorMsg = "Une demande d'ami existe déjà avec cet utilisateur.";
      } else if (errorData?.error) {
        errorMsg = errorData.error;
      }
      setFeedbackMessage({ type: "error", text: errorMsg });
    } finally {
      setSending(false);
    }
  }

  /**
   * Accepte une demande reçue (mise à jour optimiste : on passe `accepted`
   * à true localement sans recharger toute la liste).
   * @param {number} friendshipId
   */
  async function handleAccept(friendshipId) {
    try {
      await acceptFriend(friendshipId);
      setFriendships((prev) =>
        prev.map((f) => (f.id === friendshipId ? { ...f, accepted: true } : f))
      );
    } catch (error) {
      console.error("Erreur acceptation :", error);
    }
  }

  /**
   * Supprime une amitié / annule une demande (mise à jour optimiste : on
   * retire la ligne localement pour que la carte disparaisse aussitôt).
   * @param {number} friendshipId
   */
  async function handleDelete(friendshipId) {
    try {
      await deleteFriend(friendshipId);
      setFriendships((prev) => prev.filter((f) => f.id !== friendshipId));
    } catch (error) {
      console.error("Erreur suppression :", error);
    }
  }

  /**
   * Ajoute/retire un ami de la sélection "soirée cinéma".
   * On recrée un nouveau Set à chaque fois (React ne détecte le changement
   * que si la référence change).
   * @param {number} friendshipId
   */
  function toggleSelection(friendshipId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendshipId)) {
        next.delete(friendshipId);
      } else {
        next.add(friendshipId);
      }
      return next;
    });
  }

  /**
   * Ouvre les matchs de groupe avec les amis sélectionnés.
   * On passe les IDs (joints par des virgules) en param de navigation.
   */
  function handleGroupMatch() {
    if (selectedIds.size < 2) return;
    const ids = Array.from(selectedIds).join(",");
    navigation.navigate("MatchList", { groupIds: ids });
  }

  // --- Tri des amitiés en 3 catégories (selon mon rôle sender/receiver) ---
  const pendingReceived = friendships.filter(
    (f) => !f.accepted && f.receiver === currentUserId
  );
  const pendingSent = friendships.filter(
    (f) => !f.accepted && f.sender === currentUserId
  );
  const confirmedFriends = friendships.filter((f) => f.accepted);

  /**
   * Pseudo de l'ami dans une amitié (l'autre que moi).
   * @param {Object} f - amitié
   * @returns {string}
   */
  function getFriendName(f) {
    return f.sender === currentUserId ? f.receiver_username : f.sender_username;
  }

  /**
   * Nom de fichier avatar de l'ami dans une amitié.
   * @param {Object} f - amitié
   * @returns {string}
   */
  function getFriendAvatar(f) {
    return f.sender === currentUserId
      ? f.receiver_avatar || "avatar-popcorn.svg"
      : f.sender_avatar || "avatar-popcorn.svg";
  }

  // --- Affichage pendant le chargement ---
  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Titre de page (l'AppHeader global reste au-dessus) */}
      <Text style={styles.pageTitle}>Mes Amis</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* === Demandes reçues en attente === */}
        {pendingReceived.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Demandes reçues</Text>
              <View style={[styles.sectionBadge, styles.sectionBadgePending]}>
                <Text style={styles.sectionBadgeText}>
                  {pendingReceived.length}
                </Text>
              </View>
            </View>
            {pendingReceived.map((f) => (
              <View key={f.id} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Avatar
                    name={f.sender_avatar || "avatar-popcorn.svg"}
                    size={44}
                    fallbackLabel={f.sender_username}
                  />
                  <View style={styles.cardTexts}>
                    <Text style={styles.cardName}>{f.sender_username}</Text>
                    <Text style={styles.cardStatus}>Veut devenir ton ami</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => handleAccept(f.id)}
                  >
                    <Text style={styles.acceptBtnText}>Accepter</Text>
                  </Pressable>
                  <Pressable
                    style={styles.declineBtn}
                    onPress={() => handleDelete(f.id)}
                  >
                    <Text style={styles.declineBtnText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* === Amis confirmés === */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Amis</Text>
              <View style={[styles.sectionBadge, styles.sectionBadgeFriends]}>
                <Text style={styles.sectionBadgeText}>
                  {confirmedFriends.length}
                </Text>
              </View>
            </View>

            {/* Bouton "Soirée cinéma" (visible dès 2 amis) */}
            {confirmedFriends.length >= 2 && (
              <Pressable
                style={[styles.groupBtn, selectMode && styles.groupBtnActive]}
                onPress={() => {
                  setSelectMode(!selectMode);
                  if (selectMode) setSelectedIds(new Set());
                }}
              >
                <Text
                  style={[
                    styles.groupBtnText,
                    selectMode && styles.groupBtnTextActive,
                  ]}
                >
                  🎬 {selectMode ? "Annuler" : "Soirée cinéma"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Aide en mode sélection */}
          {selectMode && (
            <Text style={styles.selectHint}>
              Sélectionne au moins 2 amis pour voir les films en commun entre
              vous tous.
            </Text>
          )}

          {confirmedFriends.length === 0 ? (
            <Text style={styles.empty}>
              Tu n'as pas encore d'amis. Envoie une demande ci-dessous !
            </Text>
          ) : (
            confirmedFriends.map((f) => {
              const isSelected = selectedIds.has(f.id);
              return (
                <Pressable
                  key={f.id}
                  style={[
                    styles.card,
                    styles.cardFriend,
                    selectMode && isSelected && styles.cardSelected,
                  ]}
                  // En mode sélection : tap toute la carte = cocher/décocher.
                  // En mode normal : tap = ouvrir les matchs 1v1.
                  onPress={() =>
                    selectMode
                      ? toggleSelection(f.id)
                      : navigation.navigate("MatchList", { friendshipId: f.id })
                  }
                >
                  <View style={styles.cardInfo}>
                    {/* Case à cocher visuelle en mode sélection */}
                    {selectMode && (
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxChecked,
                        ]}
                      >
                        {isSelected && (
                          <Text style={styles.checkboxMark}>✓</Text>
                        )}
                      </View>
                    )}
                    <Avatar
                      name={getFriendAvatar(f)}
                      size={44}
                      fallbackLabel={getFriendName(f)}
                    />
                    <View style={styles.cardTexts}>
                      <Text style={styles.cardName}>{getFriendName(f)}</Text>
                      {!selectMode && (
                        <Text style={styles.cardStatus}>Voir les matchs →</Text>
                      )}
                    </View>
                  </View>

                  {/* Bouton "Retirer" (mode normal seulement) */}
                  {!selectMode && (
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => handleDelete(f.id)}
                    >
                      <Text style={styles.removeBtnText}>Retirer</Text>
                    </Pressable>
                  )}
                </Pressable>
              );
            })
          )}

          {/* Demandes envoyées en attente (en bas de la liste d'amis) */}
          {pendingSent.map((f) => (
            <View key={f.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Avatar
                  name={f.receiver_avatar || "avatar-popcorn.svg"}
                  size={44}
                  fallbackLabel={f.receiver_username}
                />
                <View style={styles.cardTexts}>
                  <Text style={styles.cardName}>{f.receiver_username}</Text>
                  <Text style={styles.cardStatus}>En attente de réponse</Text>
                </View>
              </View>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => handleDelete(f.id)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* === Ajouter un ami === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ajouter un ami</Text>
          <View style={styles.addForm}>
            <View style={styles.searchWrapper}>
              <TextInput
                style={styles.addInput}
                placeholder="Pseudo de ton ami..."
                placeholderTextColor={COLORS.grisTexte}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  // Si on modifie le texte après avoir choisi une suggestion,
                  // on annule la sélection pour relancer la recherche.
                  setSelectedUser(null);
                }}
                onSubmitEditing={handleSendRequest}
                autoCapitalize="none"
              />

              {/* Liste de suggestions (autocomplétion) */}
              {suggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {suggestions.map((user) => (
                    <Pressable
                      key={user.id}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(user)}
                    >
                      <Avatar
                        name={user.avatar}
                        size={28}
                        fallbackLabel={user.username}
                      />
                      <Text style={styles.suggestionName}>{user.username}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Indicateur de recherche en cours */}
              {searchingUsers && searchQuery.trim().length >= 2 && (
                <View style={styles.suggestions}>
                  <Text style={styles.suggestionLoading}>Recherche...</Text>
                </View>
              )}
            </View>

            <Pressable
              style={[
                styles.addBtn,
                (sending || !searchQuery.trim()) && styles.addBtnDisabled,
              ]}
              onPress={handleSendRequest}
              disabled={sending || !searchQuery.trim()}
            >
              <Text style={styles.addBtnText}>
                {sending ? "Envoi..." : "Envoyer"}
              </Text>
            </Pressable>
          </View>

          {/* Message de feedback (succès ou erreur) */}
          {feedbackMessage && (
            <View
              style={[
                styles.message,
                feedbackMessage.type === "success"
                  ? styles.messageSuccess
                  : styles.messageError,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  feedbackMessage.type === "success"
                    ? styles.messageTextSuccess
                    : styles.messageTextError,
                ]}
              >
                {feedbackMessage.text}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Barre flottante "Voir les matchs" (mode sélection, ≥ 2 amis cochés) */}
      {selectMode && selectedIds.size >= 2 && (
        <View style={styles.floatingBar}>
          <Pressable style={styles.floatingBtn} onPress={handleGroupMatch}>
            <Text style={styles.floatingBtnText}>
              🎬 Voir les matchs ({selectedIds.size} amis)
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.noirCinema,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.grisTexte,
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  pageTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: COLORS.blancDoux,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.huge,
    gap: SPACING.xxl,
  },

  // --- Sections ---
  section: {
    gap: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 17,
    color: COLORS.blancDoux,
  },
  sectionBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgePending: {
    backgroundColor: COLORS.corailVif,
  },
  sectionBadgeFriends: {
    backgroundColor: COLORS.violetNuit,
  },
  sectionBadgeText: {
    fontFamily: FONTS.displayBold,
    fontSize: 12,
    color: "#fff",
  },
  // Bouton "Soirée cinéma"
  groupBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    borderWidth: BORDERS.width,
    borderColor: "rgba(123,92,255,0.3)",
    backgroundColor: "rgba(123,92,255,0.1)",
  },
  groupBtnActive: {
    backgroundColor: COLORS.violetNuit,
    borderColor: COLORS.violetNuit,
  },
  groupBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 13,
    color: COLORS.violetNuit,
  },
  groupBtnTextActive: {
    color: "#fff",
  },
  selectHint: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    marginBottom: SPACING.xs,
  },
  empty: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
    paddingVertical: SPACING.sm,
  },

  // --- Cartes ami / demande ---
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.card,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    padding: SPACING.md,
  },
  cardFriend: {
    borderColor: BORDERS.colorStrong,
  },
  cardSelected: {
    borderColor: COLORS.violetNuit,
    backgroundColor: "rgba(123,92,255,0.1)",
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    flex: 1, // pousse les boutons d'action à droite
  },
  cardTexts: {
    flexShrink: 1,
  },
  cardName: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: COLORS.blancDoux,
  },
  cardStatus: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  // Case à cocher (mode sélection)
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADII.sm,
    borderWidth: 2,
    borderColor: COLORS.grisMoyen,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.violetNuit,
    borderColor: COLORS.violetNuit,
  },
  checkboxMark: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FONTS.displayBold,
  },

  // Boutons sur les cartes
  acceptBtn: {
    backgroundColor: COLORS.vertMatch,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.button,
  },
  acceptBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 13,
    color: COLORS.noirCinema,
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.round,
    backgroundColor: COLORS.grisSombre,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtnText: {
    color: COLORS.grisTexte,
    fontSize: 15,
  },
  removeBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.button,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
  },
  removeBtnText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
  },
  cancelBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.button,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
  },
  cancelBtnText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.grisTexte,
  },

  // --- Ajouter un ami ---
  addForm: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  searchWrapper: {
    flex: 1,
  },
  addInput: {
    backgroundColor: COLORS.grisSombre,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  suggestions: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.noirCarte,
    borderRadius: RADII.input,
    borderWidth: BORDERS.width,
    borderColor: COLORS.grisMoyen,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  suggestionName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.blancDoux,
  },
  suggestionLoading: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  addBtn: {
    backgroundColor: COLORS.corailVif,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.button,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: "#fff",
  },

  // --- Message de feedback ---
  message: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.input,
  },
  messageSuccess: {
    backgroundColor: "rgba(46,224,161,0.12)",
  },
  messageError: {
    backgroundColor: "rgba(255,77,106,0.12)",
  },
  messageText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  messageTextSuccess: {
    color: COLORS.vertMatch,
  },
  messageTextError: {
    color: COLORS.corailVif,
  },

  // --- Barre flottante "Voir les matchs" ---
  floatingBar: {
    position: "absolute",
    left: SPACING.xl,
    right: SPACING.xl,
    bottom: SPACING.xl,
  },
  floatingBtn: {
    backgroundColor: COLORS.violetNuit,
    paddingVertical: SPACING.lg,
    borderRadius: RADII.button,
    alignItems: "center",
  },
  floatingBtnText: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: "#fff",
  },
});
