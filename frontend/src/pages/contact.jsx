import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "../styles/Contact.css";

/**
 * Contact — Page avec un formulaire de contact intégré.
 *
 * L'utilisateur remplit son nom, email, sujet et message.
 * À la soumission, le formulaire envoie les données à l'API
 * qui transmet un email à contact@filmmatching.com.
 *
 * Pas besoin d'être connecté pour envoyer un message.
 *
 * @returns {JSX.Element} Le formulaire de contact
 */
function Contact() {
  // État de chaque champ du formulaire
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // État pour gérer le chargement, le succès et les erreurs
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  /**
   * Envoie le formulaire à l'API backend.
   * L'API se charge d'envoyer l'email à contact@filmmatching.com.
   */
  const handleSubmit = async (e) => {
    // preventDefault() empêche le rechargement de la page
    // (comportement par défaut d'un formulaire HTML)
    e.preventDefault();

    // Réinitialiser les messages précédents
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Envoyer les données du formulaire à l'API
      const response = await api.post("/api/contact/", {
        name,
        email,
        subject,
        message,
      });

      // Afficher le message de succès renvoyé par l'API
      setSuccess(response.data.message);

      // Vider le formulaire après un envoi réussi
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      // err.response?.data?.error contient le message d'erreur de l'API
      // Si l'API ne répond pas du tout, on affiche un message générique
      setError(
        err.response?.data?.error ||
          "Une erreur est survenue. Réessaie plus tard."
      );
    } finally {
      // finally s'exécute toujours, que ça ait réussi ou échoué
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      {/* Bouton retour vers l'accueil */}
      <Link to="/" className="contact-page__back">
        &larr; Retour
      </Link>

      <h1 className="contact-page__title">Contacte-nous</h1>

      <p className="contact-page__subtitle">
        Une question, une suggestion ou un bug à signaler ?
        Remplis le formulaire ci-dessous et on te répond rapidement.
      </p>

      {/* Formulaire de contact */}
      <form className="contact-form" onSubmit={handleSubmit}>
        {/* Champ Nom */}
        <label className="contact-form__label" htmlFor="contact-name">
          Ton nom
        </label>
        <input
          id="contact-name"
          className="contact-form__input"
          type="text"
          placeholder="Ex : Alice"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Champ Email */}
        <label className="contact-form__label" htmlFor="contact-email">
          Ton email
        </label>
        <input
          id="contact-email"
          className="contact-form__input"
          type="email"
          placeholder="Ex : alice@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Champ Sujet */}
        <label className="contact-form__label" htmlFor="contact-subject">
          Sujet
        </label>
        <input
          id="contact-subject"
          className="contact-form__input"
          type="text"
          placeholder="Ex : Suggestion de fonctionnalité"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        {/* Champ Message (textarea pour un texte plus long) */}
        <label className="contact-form__label" htmlFor="contact-message">
          Message
        </label>
        <textarea
          id="contact-message"
          className="contact-form__input contact-form__textarea"
          placeholder="Décris ta question ou ton idée..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
        />

        {/* Messages de succès ou d'erreur */}
        {success && <p className="contact-form__success">{success}</p>}
        {error && <p className="contact-form__error">{error}</p>}

        {/* Bouton d'envoi — désactivé pendant le chargement */}
        <button
          className="contact-form__button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Envoi en cours..." : "Envoyer"}
        </button>
      </form>

      {/* Email affiché en alternative */}
      <p className="contact-page__alt">
        Tu peux aussi nous écrire directement à{" "}
        <a href="mailto:contact@filmmatching.com" className="contact-page__email-link">
          contact@filmmatching.com
        </a>
      </p>
    </div>
  );
}

export default Contact;
