import { useState, useEffect, useRef } from "react";
import api from "../api";
import Film from "../components/Film";
import "../styles/Home.css";

/**
 * Page d'accueil — Swipe de films.
 *
 * Cette page est le cœur de l'application. Elle affiche les films
 * un par un (le plus populaire en premier) et propose 3 actions :
 * - "À voir" (like) : glisser vers la gauche ou cliquer le bouton
 * - "Déjà vu" (seen) : glisser vers le haut ou cliquer le bouton
 * - "Pas intéressé" (dislike) : glisser vers la droite ou cliquer le bouton
 *
 * Pour éviter un temps de chargement entre chaque film, le prochain film
 * est toujours pré-chargé en avance (prefetch). Quand l'utilisateur swipe,
 * le film suivant s'affiche instantanément.
 *
 * @returns {JSX.Element} La page d'accueil avec le système de swipe
 */
function Home() {
  // Le film actuellement affiché
  const [film, setFilm] = useState(null);
  // Le prochain film, pré-chargé en avance pour un affichage instantané
  const [nextFilm, setNextFilm] = useState(null);
  // true uniquement au tout premier chargement
  const [loading, setLoading] = useState(true);
  // true quand il n'y a plus de films à proposer
  const [noMoreFilms, setNoMoreFilms] = useState(false);

  // --- States pour le drag/swipe ---
  // deltaX et deltaY = décalage en pixels pendant le drag
  const [deltaX, setDeltaX] = useState(0);
  const [deltaY, setDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Direction de sortie : "left", "right", "up" ou null
  const [exitDirection, setExitDirection] = useState(null);

  // Positions de départ du drag (souris/doigt)
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  // Seuil en pixels pour valider un swipe
  const SWIPE_THRESHOLD = 120;

  useEffect(() => {
    initializeFilms();
  }, []);

  /**
   * Charge le premier film puis pré-charge le suivant.
   */
  async function initializeFilms() {
    setLoading(true);
    try {
      const response = await api.get("/api/films/random/");

      if (response.status === 204) {
        setNoMoreFilms(true);
      } else {
        const currentFilm = response.data;
        setFilm(currentFilm);
        prefetchNext(currentFilm.id);
      }
    } catch (error) {
      console.error("Erreur lors du chargement initial :", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Pré-charge le prochain film en arrière-plan.
   *
   * @param {number} excludeId - L'ID du film à exclure (celui affiché)
   */
  async function prefetchNext(excludeId) {
    try {
      const response = await api.get(`/api/films/random/?exclude=${excludeId}`);

      if (response.status === 204) {
        setNextFilm(null);
      } else {
        // Pré-charge l'image dans le cache du navigateur
        const img = new Image();
        img.src = response.data.img;

        setNextFilm(response.data);
      }
    } catch (error) {
      console.error("Erreur lors du pré-chargement :", error);
      setNextFilm(null);
    }
  }

  /**
   * Enregistre le swipe et affiche immédiatement le film pré-chargé.
   *
   * @param {string} swipeStatus - "like", "dislike" ou "seen"
   * @param {string|null} direction - Direction de l'animation : "left", "right", "up" ou null
   */
  async function handleSwipe(swipeStatus, direction = null) {
    if (!film) return;

    const swipedFilmId = film.id;

    // Lancer l'animation de sortie
    if (direction) {
      setExitDirection(direction);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    try {
      await api.post("/api/swipes/", {
        film: swipedFilmId,
        status: swipeStatus,
      });

      // Afficher immédiatement le film pré-chargé
      if (nextFilm) {
        setFilm(nextFilm);
        setNextFilm(null);
        setExitDirection(null);
        setDeltaX(0);
        setDeltaY(0);
        prefetchNext(nextFilm.id);
      } else {
        setFilm(null);
        setNoMoreFilms(true);
        setExitDirection(null);
        setDeltaX(0);
        setDeltaY(0);
      }
    } catch (error) {
      console.error("Erreur lors du swipe :", error);
      setExitDirection(null);
      setDeltaX(0);
      setDeltaY(0);
    }
  }

  // =============================================
  // Gestion du drag (souris + tactile)
  // =============================================

  /**
   * Début du drag : on enregistre les positions X et Y de départ.
   */
  function handleDragStart(clientX, clientY) {
    setIsDragging(true);
    startXRef.current = clientX;
    startYRef.current = clientY;
  }

  /**
   * Pendant le drag : on calcule le décalage X et Y.
   */
  function handleDragMove(clientX, clientY) {
    if (!isDragging) return;
    setDeltaX(clientX - startXRef.current);
    setDeltaY(clientY - startYRef.current);
  }

  /**
   * Fin du drag : on détermine la direction dominante (horizontale ou verticale)
   * et on valide le swipe si le seuil est dépassé.
   *
   * La direction dominante est celle où le décalage est le plus grand
   * (en valeur absolue). Ça empêche de déclencher un swipe horizontal
   * et vertical en même temps.
   */
  function handleDragEnd() {
    if (!isDragging) return;
    setIsDragging(false);

    // On compare les valeurs absolues pour trouver la direction dominante
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absY > absX && deltaY < -SWIPE_THRESHOLD) {
      // Mouvement vertical dominant vers le haut → "déjà vu"
      handleSwipe("seen", "up");
    } else if (absX >= absY && deltaX < -SWIPE_THRESHOLD) {
      // Mouvement horizontal dominant vers la gauche → like
      handleSwipe("like", "left");
    } else if (absX >= absY && deltaX > SWIPE_THRESHOLD) {
      // Mouvement horizontal dominant vers la droite → dislike
      handleSwipe("dislike", "right");
    } else {
      // Seuil pas atteint → la carte revient au centre
      setDeltaX(0);
      setDeltaY(0);
    }
  }

  // --- Événements souris ---
  function onMouseDown(e) {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }
  function onMouseMove(e) {
    handleDragMove(e.clientX, e.clientY);
  }
  function onMouseUp() {
    handleDragEnd();
  }

  // --- Événements tactiles (mobile) ---
  function onTouchStart(e) {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onTouchMove(e) {
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onTouchEnd() {
    handleDragEnd();
  }

  // =============================================
  // Calcul du style de la carte pendant le drag
  // =============================================

  /**
   * Détermine la direction dominante du drag en cours.
   * Retourne "horizontal" ou "vertical" selon l'axe principal du mouvement.
   */
  function getDominantAxis() {
    return Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical";
  }

  function getCardStyle() {
    // --- Animations de sortie ---
    if (exitDirection === "left") {
      return {
        transform: "translateX(-150vw) rotate(-30deg)",
        opacity: 0,
        transition: "transform 0.4s ease, opacity 0.4s ease",
      };
    }
    if (exitDirection === "right") {
      return {
        transform: "translateX(150vw) rotate(30deg)",
        opacity: 0,
        transition: "transform 0.4s ease, opacity 0.4s ease",
      };
    }
    if (exitDirection === "up") {
      return {
        transform: "translateY(-150vh)",
        opacity: 0,
        transition: "transform 0.4s ease, opacity 0.4s ease",
      };
    }

    // --- Pendant le drag ---
    if (isDragging || deltaX !== 0 || deltaY !== 0) {
      const axis = getDominantAxis();

      if (axis === "vertical" && deltaY < 0) {
        // Drag vertical vers le haut : la carte monte sans rotation
        return {
          transform: `translateY(${deltaY}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease",
          cursor: isDragging ? "grabbing" : "grab",
        };
      }

      // Drag horizontal : la carte se déplace et tourne
      const rotation = (deltaX / SWIPE_THRESHOLD) * 15;
      return {
        transform: `translateX(${deltaX}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s ease",
        cursor: isDragging ? "grabbing" : "grab",
      };
    }

    // État normal
    return { cursor: "grab" };
  }

  /**
   * Calcule l'opacité d'un indicateur en fonction d'un delta.
   * Plus on glisse loin, plus l'indicateur est visible (de 0 à 1).
   *
   * @param {number} delta - Le décalage en pixels (deltaX ou deltaY)
   * @returns {number} Opacité entre 0 et 1
   */
  function getIndicatorOpacity(delta) {
    return Math.min(Math.abs(delta) / SWIPE_THRESHOLD, 1);
  }

  // --- Affichage pendant le chargement ---
  if (loading) {
    return (
      <div className="home">
        <div className="home__loading">Chargement...</div>
      </div>
    );
  }

  // --- Affichage quand il n'y a plus de films ---
  if (noMoreFilms) {
    return (
      <div className="home">
        <div className="home__empty">
          <div className="home__empty-icon">🎬</div>
          <h2 className="home__empty-title">Tu as tout vu !</h2>
          <p className="home__empty-text">
            Il n'y a plus de films à découvrir pour le moment.
          </p>
        </div>
      </div>
    );
  }

  // Calcul des opacités des indicateurs selon la direction dominante
  const axis = getDominantAxis();
  // L'indicateur like n'apparaît que si le mouvement est horizontal vers la gauche
  const likeOpacity = axis === "horizontal" && deltaX < 0 ? getIndicatorOpacity(deltaX) : 0;
  // L'indicateur dislike n'apparaît que si le mouvement est horizontal vers la droite
  const dislikeOpacity = axis === "horizontal" && deltaX > 0 ? getIndicatorOpacity(deltaX) : 0;
  // L'indicateur seen n'apparaît que si le mouvement est vertical vers le haut
  const seenOpacity = axis === "vertical" && deltaY < 0 ? getIndicatorOpacity(deltaY) : 0;

  // --- Affichage principal : le film + les 3 boutons ---
  return (
    <div
      className="home"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* La carte du film avec le drag */}
      <div
        className="home__film-wrapper"
        style={getCardStyle()}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Indicateur "À voir" — glissement vers la gauche */}
        <div
          className="home__swipe-indicator home__swipe-indicator--like"
          style={{ opacity: likeOpacity }}
        >
          ♥ À voir
        </div>

        {/* Indicateur "Pas intéressé" — glissement vers la droite */}
        <div
          className="home__swipe-indicator home__swipe-indicator--dislike"
          style={{ opacity: dislikeOpacity }}
        >
          ✕ Pas intéressé
        </div>

        {/* Indicateur "Déjà vu" — glissement vers le haut */}
        <div
          className="home__swipe-indicator home__swipe-indicator--seen"
          style={{ opacity: seenOpacity }}
        >
          👁 Déjà vu
        </div>

        <Film
          title={film.title}
          img={film.img}
          synopsis={film.synopsis}
          tags={film.genres}
          plateform={film.plateforms}
          type={film.type}
          main_actors={film.main_actors ? film.main_actors.join(", ") : ""}
          release_year={film.release_year}
          director={film.director}
        />
      </div>

      {/* Les 3 boutons d'action sous la carte */}
      <div className="home__actions">
        <button
          className="home__action-btn home__action-btn--like"
          onClick={() => handleSwipe("like", "left")}
        >
          <span className="home__action-icon">♥</span>
          À voir
        </button>

        <button
          className="home__action-btn home__action-btn--seen"
          onClick={() => handleSwipe("seen", "up")}
        >
          <span className="home__action-icon">👁</span>
          Déjà vu
        </button>

        <button
          className="home__action-btn home__action-btn--dislike"
          onClick={() => handleSwipe("dislike", "right")}
        >
          <span className="home__action-icon">✕</span>
          Pas intéressé
        </button>
      </div>
    </div>
  );
}

export default Home;
