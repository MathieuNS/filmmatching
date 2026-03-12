import react from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function Lougout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

function CreateAccountAndLogout() {
  localStorage.clear()
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
        <Route path="/amis/:friendshipId/matchs" element={<ProtectedRoute>
          <MatchList />
          </ProtectedRoute>} />
        <Route path="/compte" element={<ProtectedRoute>
          <UserAccount />
          </ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Lougout />} />
        <Route path="/create-login" element={<CreateLogin />} />
        <Route path="/activate/:uid/:token" element={<ActivateAccount />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/rgpd" element={<RGPD />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
