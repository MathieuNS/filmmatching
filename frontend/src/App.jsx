import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from './api'
import { REFRESH_TOKEN } from './constants'
import Home from './pages/home'
import Login from './pages/login'
import CreateLogin from './pages/create_login'
import LandingPage from './pages/landing_page'
import NotFound from './pages/notfound'
import Friends from './pages/Friends'
import UserAccount from './pages/user_account'
import FilmList from './pages/films_list'
import MatchList from './pages/match_list'
import RGPD from './pages/rgpd'
import MentionsLegales from './pages/mentions_legales'
import ActivateAccount from './pages/activate_account'
import CheckEmail from './pages/check_email'
import ProtectedRoute from './components/ProtectedRoute'
import Contact from './pages/contact'
import ForgotPassword from './pages/forgot_password'
import ResetPassword from './pages/reset_password'
import Unsubscribe from './pages/unsbscribe'
import Donation from './pages/donation'
import AlAffiche from './pages/a_l_affiche'

/**
 * Déconnexion côté serveur PUIS local.
 *
 * On envoie d'abord le refresh token à /api/logout/ pour le mettre sur liste
 * noire (il devient inutilisable, même si une copie a fuité). On vide ensuite
 * le localStorage. Si l'appel réseau échoue (hors-ligne, jeton déjà invalide),
 * on déconnecte quand même localement : l'utilisateur ne doit jamais rester
 * "coincé" connecté.
 *
 * @returns {Promise<void>}
 */
async function logoutServer() {
  const refresh = localStorage.getItem(REFRESH_TOKEN)
  if (refresh) {
    try {
      await api.post('/api/logout/', { refresh })
    } catch {
      // On ignore l'erreur : la déconnexion locale ci-dessous a quand même lieu.
    }
  }
  localStorage.clear()
}

/**
 * Route /logout : déconnecte (serveur + local) puis renvoie vers l'accueil.
 */
function Lougout() {
  // done passe à true une fois la déconnexion terminée, pour éviter de rediriger
  // (et donc de démonter le composant) avant la fin de l'appel réseau.
  const [done, setDone] = useState(false)
  useEffect(() => {
    logoutServer().finally(() => setDone(true))
  }, [])
  return done ? <Navigate to="/" /> : null
}

/**
 * Affiche le formulaire de création de compte en déconnectant au préalable
 * l'éventuel utilisateur courant (blacklist + vidage local, en arrière-plan).
 */
function CreateAccountAndLogout() {
  useEffect(() => {
    logoutServer()
  }, [])
  return <CreateLogin />
}

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<ProtectedRoute>
          <Home />
          </ProtectedRoute>} />
        <Route path="/liste" element={<ProtectedRoute>
          <FilmList />
          </ProtectedRoute>} />
        <Route path="/amis" element={<ProtectedRoute>
          <Friends />
          </ProtectedRoute>} />
        <Route path="/amis/groupe/matchs" element={<ProtectedRoute>
          <MatchList />
          </ProtectedRoute>} />
        <Route path="/amis/:friendshipId/matchs" element={<ProtectedRoute>
          <MatchList />
          </ProtectedRoute>} />
        <Route path="/compte" element={<ProtectedRoute>
          <UserAccount />
          </ProtectedRoute>} />
          <Route path="/a-l-affiche" element={<ProtectedRoute>
          <AlAffiche />
          </ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Lougout />} />
        <Route path="/create-login" element={<CreateLogin />} />
        <Route path="/activate/:uid/:token" element={<ActivateAccount />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/rgpd" element={<RGPD />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/unsubscribe/:uid" element={<Unsubscribe />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/donation" element={<Donation />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
