import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { getAvatarUrl } from "../utils/avatars";
import TmdbAttribution from "../components/TmdbAttribution";
import "../styles/Friends.css";
// On importe Home.css pour réutiliser les styles du menu hamburger
import "../styles/Home.css";

/**
 * Page "Mes Amis" — Gère les relations d'amitié entre utilisateurs.
 *
 * 3 fonctionnalités :
 * 1. Voir les demandes d'amis reçues et les accepter
 * 2. Voir la liste des amis confirmés
 * 3. Envoyer une demande d'ami en tapant un pseudo
 *
 * Les données viennent de l'API GET /api/friends/ qui renvoie toutes
 * les amitiés (envoyées et reçues, en attente et acceptées).
 * On les trie côté frontend selon le statut et le rôle (sender/receiver).
 *
 * @returns {JSX.Element} La page amis
 */
function Friends() {
  const navigate = useNavigate();

  // --- State pour le menu hamburger ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Données ---
  // L'ID de l'utilisateur connecté (pour savoir si on est sender ou receiver)
  const [currentUserId, setCurrentUserId] = useState(null);
  // Liste brute de toutes les amitiés renvoyées par l'API
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Mode "Soirée cinéma" (sélection multi-amis) ---
  // Quand selectMode est true, des checkboxes apparaissent sur chaque ami
  const [selectMode, setSelectMode] = useState(false);
  // Set d'IDs des amitiés sélectionnées (on utilise un Set pour ajouter/retirer facilement)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // --- Formulaire d'ajout d'ami ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  // Message de feedback après envoi (succès ou erreur)
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // --- Autocomplétion ---
  // Liste de suggestions renvoyée par l'API (tableau d'objets { id, username, avatar })
  const [suggestions, setSuggestions] = useState([]);
  // Indique si une recherche est en cours (pour afficher un état de chargement)
  const [searchingUsers, setSearchingUsers] = useState(false);
  // L'utilisateur sélectionné dans la liste de suggestions
  const [selectedUser, setSelectedUser] = useState(null);

  /**
   * Debounce pour l'autocomplétion.
   *
   * "Debounce" = on attend que l'utilisateur arrête de taper pendant 300ms
   * avant d'envoyer la requête à l'API. Ça évite d'envoyer une requête
   * à chaque lettre tapée (ex: "a", "al", "ali", "alic", "alice").
   *
   * useRef stocke le timer entre les rendus sans provoquer de re-render.
   * À chaque frappe, on annule le timer précédent (clearTimeout) et on
   * en crée un nouveau.
   */
  const debounceTimer = useRef(null);

  useEffect(() => {
    // Si l'utilisateur a sélectionné quelqu'un dans la liste, on ne cherche plus
    if (selectedUser) return;

    // Si le champ est vide ou trop court, on vide les suggestions
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // Annuler le timer précédent si l'utilisateur tape encore
    clearTimeout(debounceTimer.current);

    // Lancer la recherche après 300ms d'inactivité
    debounceTimer.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await api.get(
          `/api/users/search/?q=${encodeURIComponent(searchQuery.trim())}`
        );
        setSuggestions(res.data);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    // Cleanup : annuler le timer si le composant se démonte ou si searchQuery change
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery, selectedUser]);

  /**
   * Appelée quand l'utilisateur clique sur une suggestion.
   * On remplit le champ avec le pseudo choisi et on mémorise l'objet user
   * pour l'envoyer directement lors de la demande d'ami.
   *
   * @param {Object} user - L'utilisateur sélectionné { id, username, avatar }
   */
  function handleSelectSuggestion(user) {
    setSearchQuery(user.username);
    setSelectedUser(user);
    setSuggestions([]);
  }

  /**
   * Au chargement de la page, on récupère :
   * 1. L'ID de l'utilisateur connecté (GET /api/users/me/)
   * 2. La liste de toutes ses amitiés (GET /api/friends/)
   *
   * Promise.all exécute les 2 requêtes en parallèle pour aller plus vite.
   */
  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, friendsRes] = await Promise.all([
          api.get("/api/users/me/"),
          api.get("/api/friends/"),
        ]);
        setCurrentUserId(userRes.data.id);
        setFriendships(friendsRes.data);
      } catch (error) {
        console.error("Erreur lors du chargement :", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  /**
   * Envoie une demande d'ami.
   *
   * 2 étapes :
   * 1. Chercher l'utilisateur par pseudo (GET /api/users/search/?q=...)
   * 2. Si trouvé, envoyer la demande (POST /api/friends/ avec receiver=ID)
   */
  /**
   * Envoie une demande d'ami.
   *
   * Si l'utilisateur a cliqué sur une suggestion (selectedUser),
   * on utilise directement son ID. Sinon, on cherche d'abord
   * le pseudo exact dans l'API.
   */
  async function handleSendRequest() {
    if (!searchQuery.trim()) return;

    setSending(true);
    setFeedbackMessage(null);

    try {
      let targetUser = selectedUser;

      // Si aucun utilisateur sélectionné, on cherche par pseudo exact
      if (!targetUser) {
        const searchRes = await api.get(
          `/api/users/search/?q=${encodeURIComponent(searchQuery.trim())}`
        );
        // L'API renvoie maintenant une liste — on cherche le match exact
        const exactMatch = searchRes.data.find(
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

      // Envoyer la demande d'ami avec l'ID trouvé
      await api.post("/api/friends/", { receiver: targetUser.id });

      // Succès : on affiche un message et on recharge la liste
      setFeedbackMessage({
        type: "success",
        text: `Demande envoyée à ${targetUser.username} !`,
      });
      setSearchQuery("");
      setSelectedUser(null);

      // Recharger la liste des amitiés pour afficher la nouvelle demande
      const friendsRes = await api.get("/api/friends/");
      setFriendships(friendsRes.data);
    } catch (error) {
      // On récupère le message d'erreur de l'API pour l'afficher
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
   * Accepte une demande d'ami reçue.
   *
   * PATCH /api/friends/<id>/accept/ passe accepted de false à true.
   * On met à jour le state local pour refléter le changement
   * sans recharger toute la liste depuis l'API.
   *
   * @param {number} friendshipId - L'ID de la relation d'amitié à accepter
   */
  async function handleAccept(friendshipId) {
    try {
      await api.patch(`/api/friends/${friendshipId}/accept/`);

      // Mise à jour locale : on passe accepted à true pour cette amitié
      setFriendships((prev) =>
        prev.map((f) =>
          f.id === friendshipId ? { ...f, accepted: true } : f
        )
      );
    } catch (error) {
      console.error("Erreur lors de l'acceptation :", error);
    }
  }

  /**
   * Supprime une amitié ou annule une demande d'ami en attente.
   *
   * DELETE /api/friends/<id>/delete/ supprime la ligne en BDD.
   * On met à jour le state local en retirant l'amitié de la liste
   * pour que la carte disparaisse instantanément (sans recharger l'API).
   *
   * @param {number} friendshipId - L'ID de la relation à supprimer
   */
  async function handleDelete(friendshipId) {
    try {
      await api.delete(`/api/friends/${friendshipId}/delete/`);

      // Mise à jour locale : on retire l'amitié de la liste
      // .filter() crée un nouveau tableau sans l'élément supprimé
      setFriendships((prev) => prev.filter((f) => f.id !== friendshipId));
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  }

  /**
   * Ajoute ou retire un ami de la sélection "soirée cinéma".
   *
   * On utilise un Set (ensemble) au lieu d'un tableau car :
   * - .has() vérifie si un élément existe en O(1) (instantané)
   * - .add() et .delete() ajoutent/retirent sans doublons
   *
   * On crée un nouveau Set à chaque modification car React ne détecte
   * un changement de state que si la RÉFÉRENCE change (nouvel objet).
   * Modifier le Set existant ne déclencherait pas de re-render.
   *
   * @param {number} friendshipId - L'ID de l'amitié à sélectionner/désélectionner
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
   * Navigue vers la page des matchs de groupe.
   * On passe les IDs des amitiés sélectionnées en query params.
   * Ex: /amis/groupe/matchs?ids=12,34,56
   */
  function handleGroupMatch() {
    if (selectedIds.size < 2) return;
    const idsString = Array.from(selectedIds).join(",");
    navigate(`/amis/groupe/matchs?ids=${idsString}`);
  }

  // --- Tri des amitiés en 3 catégories ---
  // On utilise l'ID de l'utilisateur connecté pour déterminer son rôle

  // Demandes reçues en attente : je suis le receiver ET accepted=false
  const pendingReceived = friendships.filter(
    (f) => !f.accepted && f.receiver === currentUserId
  );

  // Demandes envoyées en attente : je suis le sender ET accepted=false
  const pendingSent = friendships.filter(
    (f) => !f.accepted && f.sender === currentUserId
  );

  // Amis confirmés : accepted=true
  const confirmedFriends = friendships.filter((f) => f.accepted);

  /**
   * Détermine le pseudo de l'ami dans une relation.
   * Si je suis le sender, l'ami est le receiver (et vice versa).
   *
   * @param {Object} friendship - L'objet amitié renvoyé par l'API
   * @returns {string} Le pseudo de l'ami
   */
  /**
   * Détermine le pseudo de l'ami dans une relation.
   * Si je suis le sender, l'ami est le receiver (et vice versa).
   *
   * @param {Object} friendship - L'objet amitié renvoyé par l'API
   * @returns {string} Le pseudo de l'ami
   */
  function getFriendName(friendship) {
    if (friendship.sender === currentUserId) {
      return friendship.receiver_username;
    }
    return friendship.sender_username;
  }

  /**
   * Détermine l'avatar de l'ami dans une relation.
   * Même logique que getFriendName : si je suis le sender,
   * l'avatar de l'ami est celui du receiver.
   *
   * @param {Object} friendship - L'objet amitié renvoyé par l'API
   * @returns {string} Le nom du fichier avatar de l'ami
   */
  function getFriendAvatar(friendship) {
    if (friendship.sender === currentUserId) {
      return friendship.receiver_avatar || "avatar-popcorn.svg";
    }
    return friendship.sender_avatar || "avatar-popcorn.svg";
  }

  return (
    <div className="friends">
      {/* Header : flèche retour + titre + hamburger */}
      <div className="friends__header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="friends__back-btn"
            onClick={() => navigate("/home")}
            aria-label="Retour à l'accueil"
          >
            ←
          </button>
          <h1 className="friends__title">Mes Amis</h1>
        </div>

        {/* Menu hamburger — même composant que sur les autres pages */}
        <div className="home__menu-container">
          <button
            className="home__menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu de navigation"
          >
            <span className={`home__menu-icon ${isMenuOpen ? "home__menu-icon--open" : ""}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {isMenuOpen && (
            <>
              <div
                className="home__menu-backdrop"
                onClick={() => setIsMenuOpen(false)}
              />
              <nav className="home__menu-dropdown">
                <button
                  className="home__menu-item"
                  onClick={() => { navigate("/home"); setIsMenuOpen(false); }}
                >
                  <span className="home__menu-item-icon">👆</span>
                  Swiper
                </button>
                <button
                  className="home__menu-item"
                  onClick={() => { navigate("/liste"); setIsMenuOpen(false); }}
                >
                  <span className="home__menu-item-icon">📋</span>
                  Ma liste
                </button>
                <button
                  className="home__menu-item"
                  onClick={() => { navigate("/compte"); setIsMenuOpen(false); }}
                >
                  <span className="home__menu-item-icon">👤</span>
                  Mon compte
                </button>
                <button
                  className="home__menu-item"
                  onClick={() => { navigate("/logout"); setIsMenuOpen(false); }}
                >
                  <span className="home__menu-item-icon">⏻</span>
                  Déconnexion
                </button>
              </nav>
            </>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      {loading ? (
        <div className="friends__loading">Chargement...</div>
      ) : (
        <div className="friends__content">
          {/* === Section : Demandes reçues en attente === */}
          {pendingReceived.length > 0 && (
            <div className="friends__section">
              <h2 className="friends__section-title">
                Demandes reçues
                <span className="friends__section-badge friends__section-badge--pending">
                  {pendingReceived.length}
                </span>
              </h2>
              {pendingReceived.map((friendship) => (
                <div key={friendship.id} className="friends__card">
                  <div className="friends__card-info">
                    <div className="friends__card-avatar">
                      <img
                        className="friends__card-avatar-img"
                        src={getAvatarUrl(friendship.sender_avatar || "avatar-popcorn.svg")}
                        alt="Avatar"
                      />
                    </div>
                    <div>
                      <div className="friends__card-name">
                        {friendship.sender_username}
                      </div>
                      <div className="friends__card-status">
                        Veut devenir ton ami
                      </div>
                    </div>
                  </div>
                  <div className="friends__card-actions">
                    <button
                      className="friends__accept-btn"
                      onClick={() => handleAccept(friendship.id)}
                    >
                      Accepter
                    </button>
                    <button
                      className="friends__decline-btn"
                      onClick={() => handleDelete(friendship.id)}
                      aria-label="Refuser la demande"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* === Section : Amis confirmés === */}
          <div className="friends__section">
            <div className="friends__section-header">
              <h2 className="friends__section-title">
                Amis
                <span className="friends__section-badge friends__section-badge--friends">
                  {confirmedFriends.length}
                </span>
              </h2>

              {/* Bouton pour activer/désactiver le mode sélection multi-amis.
                  Visible seulement s'il y a au moins 2 amis (sinon pas d'intérêt). */}
              {confirmedFriends.length >= 2 && (
                <button
                  className={`friends__group-btn ${selectMode ? "friends__group-btn--active" : ""}`}
                  onClick={() => {
                    setSelectMode(!selectMode);
                    // Quand on désactive le mode, on vide la sélection
                    if (selectMode) setSelectedIds(new Set());
                  }}
                >
                  🎬 {selectMode ? "Annuler" : "Soirée cinéma"}
                </button>
              )}
            </div>

            {/* Explication du mode sélection — visible seulement en mode sélection */}
            {selectMode && (
              <p className="friends__select-hint">
                Sélectionne au moins 2 amis pour voir les films en commun entre vous tous.
              </p>
            )}

            {confirmedFriends.length === 0 ? (
              <p className="friends__empty">
                Tu n'as pas encore d'amis. Envoie une demande ci-dessous !
              </p>
            ) : (
              confirmedFriends.map((friendship) => (
                <div
                  key={friendship.id}
                  className={`friends__card friends__card--friend ${
                    selectMode && selectedIds.has(friendship.id) ? "friends__card--selected" : ""
                  }`}
                >
                  {/* En mode sélection : checkbox + clic sur toute la carte pour cocher/décocher.
                      En mode normal : clic sur avatar+nom → page des matchs 1v1. */}
                  {selectMode ? (
                    <div
                      className="friends__card-info friends__card-info--clickable"
                      onClick={() => toggleSelection(friendship.id)}
                    >
                      {/* Checkbox visuelle (custom, pas un <input> natif) */}
                      <div className={`friends__checkbox ${
                        selectedIds.has(friendship.id) ? "friends__checkbox--checked" : ""
                      }`}>
                        {selectedIds.has(friendship.id) && "✓"}
                      </div>
                      <div className="friends__card-avatar">
                        <img
                          className="friends__card-avatar-img"
                          src={getAvatarUrl(getFriendAvatar(friendship))}
                          alt="Avatar"
                        />
                      </div>
                      <div>
                        <div className="friends__card-name">
                          {getFriendName(friendship)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Zone cliquable : avatar + nom → ouvre la page des matchs */}
                      <div
                        className="friends__card-info friends__card-info--clickable"
                        onClick={() => navigate(`/amis/${friendship.id}/matchs`)}
                      >
                        <div className="friends__card-avatar">
                          <img
                            className="friends__card-avatar-img"
                            src={getAvatarUrl(getFriendAvatar(friendship))}
                            alt="Avatar"
                          />
                        </div>
                        <div>
                          <div className="friends__card-name">
                            {getFriendName(friendship)}
                          </div>
                          <div className="friends__card-status">
                            Voir les matchs →
                          </div>
                        </div>
                      </div>
                      <button
                        className="friends__remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(friendship.id);
                        }}
                        aria-label={`Supprimer ${getFriendName(friendship)}`}
                      >
                        Retirer
                      </button>
                    </>
                  )}
                </div>
              ))
            )}

            {/* Demandes envoyées en attente (en bas de la liste d'amis) */}
            {pendingSent.map((friendship) => (
              <div key={friendship.id} className="friends__card">
                <div className="friends__card-info">
                  <div className="friends__card-avatar">
                    <img
                      className="friends__card-avatar-img"
                      src={getAvatarUrl(friendship.receiver_avatar || "avatar-popcorn.svg")}
                      alt="Avatar"
                    />
                  </div>
                  <div>
                    <div className="friends__card-name">
                      {friendship.receiver_username}
                    </div>
                    <div className="friends__card-status">
                      En attente de réponse
                    </div>
                  </div>
                </div>
                <button
                  className="friends__cancel-btn"
                  onClick={() => handleDelete(friendship.id)}
                  aria-label={`Annuler la demande envoyée à ${friendship.receiver_username}`}
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>

          {/* === Section : Ajouter un ami === */}
          <div className="friends__section">
            <h2 className="friends__section-title">Ajouter un ami</h2>
            <div className="friends__add-form">
              {/* Wrapper pour positionner la liste de suggestions sous l'input */}
              <div className="friends__search-wrapper">
                <input
                  className="friends__add-input"
                  type="text"
                  placeholder="Pseudo de ton ami..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Si l'utilisateur modifie le texte après avoir choisi une suggestion,
                    // on annule la sélection pour relancer la recherche
                    setSelectedUser(null);
                  }}
                  // Envoyer la demande en appuyant sur Entrée
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendRequest();
                  }}
                />

                {/* Liste de suggestions (autocomplétion) */}
                {suggestions.length > 0 && (
                  <ul className="friends__suggestions">
                    {suggestions.map((user) => (
                      <li
                        key={user.id}
                        className="friends__suggestion-item"
                        onClick={() => handleSelectSuggestion(user)}
                      >
                        <div className="friends__suggestion-avatar">
                          <img
                            className="friends__suggestion-avatar-img"
                            src={getAvatarUrl(user.avatar)}
                            alt="Avatar"
                          />
                        </div>
                        <span className="friends__suggestion-name">
                          {user.username}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Indicateur de recherche en cours */}
                {searchingUsers && searchQuery.trim().length >= 2 && (
                  <div className="friends__suggestions">
                    <li className="friends__suggestion-item friends__suggestion-item--loading">
                      Recherche...
                    </li>
                  </div>
                )}
              </div>

              <button
                className="friends__add-btn"
                onClick={handleSendRequest}
                disabled={sending || !searchQuery.trim()}
              >
                {sending ? "Envoi..." : "Envoyer"}
              </button>
            </div>

            {/* Message de feedback (succès ou erreur) */}
            {feedbackMessage && (
              <div className={`friends__message friends__message--${feedbackMessage.type}`}>
                {feedbackMessage.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bouton flottant "Voir les matchs" — visible en mode sélection
          quand au moins 2 amis sont cochés.
          Fixé en bas de l'écran pour être toujours accessible. */}
      {selectMode && selectedIds.size >= 2 && (
        <div className="friends__floating-bar">
          <button
            className="friends__floating-btn"
            onClick={handleGroupMatch}
          >
            🎬 Voir les matchs ({selectedIds.size} amis)
          </button>
        </div>
      )}

      <TmdbAttribution />
    </div>
  );
}

export default Friends;
