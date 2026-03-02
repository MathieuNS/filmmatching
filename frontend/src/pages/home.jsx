import { useState, useEffect } from "react";
import api from "../api";
import Film from "../components/Film";
import "../styles/Home.css";

/**
 * Page d'accueil — Swipe de films.
 *
 * Cette page est le cœur de l'application. Elle affiche les films
 * un par un (le plus populaire en premier) et propose 3 actions :
 * - "À voir" (like) : l'utilisateur veut voir ce film
 * - "Déjà vu" (seen) : l'utilisateur a déjà vu ce film
 * - "Pas intéressé" (dislike) : l'utilisateur ne veut pas voir ce film
 *
 * Quand l'utilisateur clique sur un bouton, le swipe est enregistré
 * dans la base de données et le film suivant s'affiche automatiquement.
 *
 * @returns {JSX.Element} La page d'accueil avec le système de swipe
 */
function Home() {
  // Le film actuellement affiché (null = pas encore chargé ou plus de films)
  const [film, setFilm] = useState(null);
  // true pendant le chargement d'un film depuis l'API
  const [loading, setLoading] = useState(true);
  // true quand il n'y a plus de films à proposer
  const [noMoreFilms, setNoMoreFilms] = useState(false);

  /**
   * Récupère le prochain film à afficher depuis l'API.
   *
   * useEffect avec [] en 2ème argument = s'exécute une seule fois
   * au premier affichage du composant (comme un "au chargement de la page").
   */
  useEffect(() => {
    fetchNextFilm();
  }, []);

  /**
   * Appelle l'API pour récupérer le prochain film non swipé,
   * trié par popularité décroissante.
   *
   * - 200 = un film est disponible → on l'affiche
   * - 204 = plus de films → on affiche le message "tout vu"
   */
  async function fetchNextFilm() {
    setLoading(true);
    try {
      // Appel GET vers /api/films/random/ (qui renvoie le film le + populaire non swipé)
      const response = await api.get("/api/films/random/");

      if (response.status === 204) {
        // 204 No Content = il n'y a plus de films à proposer
        setFilm(null);
        setNoMoreFilms(true);
      } else {
        // On stocke le film reçu dans le state pour l'afficher
        setFilm(response.data);
        setNoMoreFilms(false);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du film :", error);
    } finally {
      // Que ça réussisse ou échoue, on arrête le chargement
      setLoading(false);
    }
  }

  /**
   * Enregistre le swipe de l'utilisateur et charge le film suivant.
   *
   * @param {string} swipeStatus - Le type de swipe : "like", "dislike" ou "seen"
   *
   * Cette fonction envoie un POST à /api/swipes/ avec :
   * - film : l'ID du film swipé
   * - status : le choix de l'utilisateur (like/dislike/seen)
   *
   * Ensuite, elle appelle fetchNextFilm() pour afficher le film suivant.
   */
  async function handleSwipe(swipeStatus) {
    if (!film) return;

    try {
      // POST vers /api/swipes/ pour enregistrer le choix de l'utilisateur
      await api.post("/api/swipes/", {
        film: film.id, // L'ID du film actuellement affiché
        status: swipeStatus, // "like", "dislike" ou "seen"
      });

      // On charge le film suivant après le swipe
      fetchNextFilm();
    } catch (error) {
      console.error("Erreur lors du swipe :", error);
    }
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

  // --- Affichage principal : le film + les 3 boutons ---
  return (
    <div className="home">
      {/* La carte du film actuellement affiché */}
      <div className="home__film-wrapper">
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
        {/* Bouton "À voir" (like) — à gauche */}
        <button
          className="home__action-btn home__action-btn--like"
          onClick={() => handleSwipe("like")}
        >
          <span className="home__action-icon">♥</span>
          À voir
        </button>

        {/* Bouton "Déjà vu" (seen) — au centre */}
        <button
          className="home__action-btn home__action-btn--seen"
          onClick={() => handleSwipe("seen")}
        >
          <span className="home__action-icon">👁</span>
          Déjà vu
        </button>

        {/* Bouton "Pas intéressé" (dislike) — à droite */}
        <button
          className="home__action-btn home__action-btn--dislike"
          onClick={() => handleSwipe("dislike")}
        >
          <span className="home__action-icon">✕</span>
          Pas intéressé
        </button>
      </div>
    </div>
  );
}

export default Home;
