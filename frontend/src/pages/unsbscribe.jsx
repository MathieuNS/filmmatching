import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Forms.css";
import "../styles/ActivateAccount.css";

/**
 * Page de désinscription des notifications email.
 *
 * L'utilisateur arrive ici en cliquant sur le lien "Unsubscribe"
 * dans un email de notification. L'URL contient un uid encodé
 * en base64 qui permet d'identifier l'utilisateur sans connexion.
 *
 * Au clic sur le bouton, on envoie un POST à l'API qui désactive
 * les notifications email sur le Profile de l'utilisateur.
 *
 * @returns {JSX.Element} La page de désinscription
 */
function Unsubscribe() {
  // Récupère l'uid depuis l'URL (ex: /unsubscribe/Mg → uid = "Mg")
  const { uid } = useParams();
  const navigate = useNavigate();

  // État : "idle" = en attente du clic, "loading", "success", "error"
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  /**
   * Appelle l'API pour désactiver les notifications email.
   * L'uid dans l'URL permet au backend d'identifier l'utilisateur
   * sans qu'il ait besoin d'être connecté.
   */
  async function handleUnsubscribe() {
    setStatus("loading");
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(
        `${apiUrl}/api/users/unsubscribe/${uid}/`,
        { method: "POST" }
      );
      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error || "Une erreur est survenue.");
      }
    } catch {
      setStatus("error");
      setMessage("Impossible de contacter le serveur.");
    }
  }

  return (
    <div className="form-page">
      <div className="form-container activate-container">
        <span className="form-logo">FilmMatching</span>

        {/* État initial : demande de confirmation */}
        {status === "idle" && (
          <>
            <h1>Notifications email</h1>
            <p className="form-subtitle">
              Tu ne souhaites plus recevoir de notifications par email ?
            </p>
            <button
              className="form-button"
              onClick={handleUnsubscribe}
            >
              Me désinscrire
            </button>
          </>
        )}

        {/* État : chargement */}
        {status === "loading" && (
          <>
            <h1>Désinscription en cours...</h1>
            <div className="activate-spinner"></div>
          </>
        )}

        {/* État : succès */}
        {status === "success" && (
          <>
            <div className="activate-icon activate-icon--success">&#10003;</div>
            <h1>C'est fait !</h1>
            <p className="form-subtitle">{message}</p>
            <p className="form-subtitle">
              Tu peux réactiver les notifications à tout moment
              dans les paramètres de ton compte.
            </p>
            <button
              className="form-button"
              onClick={() => navigate("/login")}
            >
              Retour à FilmMatching
            </button>
          </>
        )}

        {/* État : erreur */}
        {status === "error" && (
          <>
            <div className="activate-icon activate-icon--error">&#10007;</div>
            <h1>Erreur</h1>
            <p className="form-error">{message}</p>
            <button
              className="form-button"
              onClick={() => navigate("/")}
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Unsubscribe;
