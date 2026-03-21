import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/HamburgerMenu.css";

/**
 * Menu hamburger réutilisable.
 *
 * Ce composant affiche un bouton hamburger (3 barres) qui ouvre un menu
 * déroulant avec les liens de navigation. Il gère lui-même l'état
 * ouvert/fermé et récupère le nombre de demandes d'ami en attente
 * pour afficher un badge de notification.
 *
 * La page actuelle est automatiquement exclue du menu (on n'affiche pas
 * un lien vers la page sur laquelle on est déjà).
 *
 * @param {Object} props
 * @param {string} props.currentPage - Identifiant de la page actuelle
 *   pour l'exclure du menu. Valeurs possibles :
 *   "home", "liste", "amis", "compte", "donation"
 * @returns {JSX.Element} Le bouton hamburger et son menu déroulant
 */
function HamburgerMenu({ currentPage }) {
  const navigate = useNavigate();
  // État ouvert/fermé du menu
  const [isOpen, setIsOpen] = useState(false);
  // Nombre de demandes d'ami en attente (pour le badge de notification)
  const [pendingCount, setPendingCount] = useState(0);

  // Récupère le nombre de demandes d'ami en attente au montage du composant.
  // Comme le composant est monté sur chaque page, le badge est toujours à jour.
  useEffect(() => {
    async function loadPendingCount() {
      try {
        const response = await api.get("/api/friends/pending-count/");
        setPendingCount(response.data.count);
      } catch (error) {
        console.error("Erreur chargement demandes en attente :", error);
      }
    }
    loadPendingCount();
  }, []);

  // Liste de tous les liens du menu.
  // Chaque entrée a un id (pour filtrer la page actuelle), un label,
  // une icône et la route vers laquelle naviguer.
  const menuItems = [
    { id: "home", label: "Swiper", icon: "👆", path: "/home" },
    { id: "liste", label: "Ma liste", icon: "📋", path: "/liste" },
    { id: "amis", label: "Mes Amis", icon: "👥", path: "/amis", showBadge: true },
    { id: "compte", label: "Mon compte", icon: "👤", path: "/compte" },
    {
      id: "donation",
      label: "Un café?",
      path: "/donation",
      // SVG personnalisé pour l'icône café (pas d'emoji adapté)
      customIcon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      ),
    },
    {
      id: "logout",
      label: "Déconnexion",
      path: "/logout",
      customIcon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
    },
  ];

  // On filtre la page actuelle pour ne pas afficher un lien vers
  // la page sur laquelle on est déjà
  const visibleItems = menuItems.filter((item) => item.id !== currentPage);

  return (
    <div className="menu__container">
      <button
        className="menu__btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu de navigation"
      >
        {/* 3 barres horizontales = icône hamburger classique.
            Quand le menu est ouvert, la classe --open transforme les barres en X. */}
        <span className={`menu__icon ${isOpen ? "menu__icon--open" : ""}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
        {/* Badge rouge — nombre de demandes d'ami en attente */}
        {pendingCount > 0 && (
          <span className="menu__badge">{pendingCount}</span>
        )}
      </button>

      {/* Menu déroulant — visible uniquement quand isOpen est true */}
      {isOpen && (
        <>
          {/* Fond transparent cliquable pour fermer le menu
              quand on clique en dehors */}
          <div
            className="menu__backdrop"
            onClick={() => setIsOpen(false)}
          />
          <nav className="menu__dropdown">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                className="menu__item"
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
              >
                {/* Icône : soit un emoji, soit un SVG personnalisé */}
                <span className="menu__item-icon">
                  {item.customIcon || item.icon}
                </span>
                {item.label}
                {/* Badge sur "Mes Amis" si des demandes sont en attente */}
                {item.showBadge && pendingCount > 0 && (
                  <span className="menu__item-badge">{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

export default HamburgerMenu;
