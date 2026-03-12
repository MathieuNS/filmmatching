import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Forms.css";
import "../styles/ActivateAccount.css";

/**
 * Page d'activation de compte.
 *
 * Quand l'utilisateur clique sur le lien reçu par email,
 * il arrive sur cette page qui :
 * 1. Récupère l'uid et le token depuis l'URL
 * 2. Appelle l'API backend pour activer le compte
 * 3. Affiche un message de succès ou d'erreur
 * 4. Redirige vers /login après quelques secondes en cas de succès
 */
function ActivateAccount() {
  // useParams() récupère les paramètres dynamiques de l'URL
  // Pour /activate/Mg/abc123, uid = "Mg" et token = "abc123"
  const { uid, token } = useParams();
  const navigate = useNavigate();

  // État pour suivre le résultat de l'activation
  // "loading" = en cours, "success" = compte activé, "error" = échec
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    /**
     * Appelle l'API d'activation dès que la page se charge.
     * L'API vérifie le token et active le compte si tout est valide.
     */
    async function activateAccount() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await fetch(
          `${apiUrl}/api/users/activate/${uid}/${token}/`
        );
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message);
          // Rediriger vers la page de login après 4 secondes
          setTimeout(() => navigate("/login"), 4000);
        } else {
          setStatus("error");
          setMessage(data.error || "Une erreur est survenue.");
        }
      } catch {
        setStatus("error");
        setMessage("Impossible de contacter le serveur.");
      }
    }

    activateAccount();
  }, [uid, token, navigate]);

  return (
    <div className="form-page">
      <div className="form-container activate-container">
        <span className="form-logo">FilmMatching</span>

        {/* État : chargement */}
        {status === "loading" && (
          <>
            <h1>Activation en cours...</h1>
            <p className="form-subtitle">
              On vérifie ton lien, un instant.
            </p>
            {/* Spinner animé */}
            <div className="activate-spinner"></div>
          </>
        )}

        {/* État : succès */}
        {status === "success" && (
          <>
            <div className="activate-icon activate-icon--success">&#10003;</div>
            <h1>Compte activé !</h1>
            <p className="form-subtitle">{message}</p>
            <p className="activate-redirect">
              Redirection vers la connexion...
            </p>
            <button
              className="form-button"
              onClick={() => navigate("/login")}
            >
              Se connecter maintenant
            </button>
          </>
        )}

        {/* État : erreur */}
        {status === "error" && (
          <>
            <div className="activate-icon activate-icon--error">&#10007;</div>
            <h1>Activation échouée</h1>
            <p className="form-error">{message}</p>
            <button
              className="form-button"
              onClick={() => navigate("/create-login")}
              style={{ marginTop: "20px" }}
            >
              Créer un nouveau compte
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ActivateAccount;
