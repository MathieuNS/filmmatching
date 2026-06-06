import {Navigate} from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import api from '../api'
import { REFRESH_TOKEN, ACCESS_TOKEN } from '../constants'
import {useState, useEffect} from 'react'

/**
 * Route protégée : n'affiche ses enfants que si l'utilisateur est authentifié.
 * Vérifie la validité du token JWT au montage, le rafraîchit silencieusement
 * s'il est expiré, et redirige vers /login sinon.
 *
 * @param {{children: JSX.Element}} props - Le contenu protégé à afficher si autorisé.
 * @returns {JSX.Element} Les enfants, un écran de chargement, ou une redirection.
 */
function ProtectedRoute({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(null)

    // On vérifie l'authentification UNE SEULE FOIS, au montage du composant.
    // Les fonctions auth/refreshToken sont définies DANS l'effet car :
    //  - elles ne servent qu'ici ;
    //  - ça évite l'avertissement "dépendance manquante" (vues de l'extérieur,
    //    elles ne sont pas recréées à chaque rendu) ;
    //  - et l'erreur "variable utilisée avant sa déclaration".
    useEffect(() => {
        // Rafraîchit le token d'accès à partir du refresh token stocké.
        const refreshToken = async () => {
            const refresh = localStorage.getItem(REFRESH_TOKEN)
            try {
                const response = await api.post('/api/token/refresh/', { refresh });
                if (response.status === 200) {
                    localStorage.setItem(ACCESS_TOKEN, response.data.access);
                    // Rotation activée côté backend : le serveur renvoie aussi un
                    // NOUVEAU refresh token et blackliste l'ancien. On DOIT donc le
                    // re-stocker, sinon on garderait l'ancien (devenu invalide) et
                    // le prochain rafraîchissement échouerait → déconnexion.
                    if (response.data.refresh) {
                        localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
                    }
                    setIsAuthorized(true)
                } else {
                    setIsAuthorized(false)
                }
            } catch (error) {
                console.log(error)
                setIsAuthorized(false)
            }
        }

        // Vérifie le token d'accès : valide → autorisé ; expiré → on rafraîchit.
        const auth = async () => {
            const token = localStorage.getItem(ACCESS_TOKEN)
            if (!token) {
                setIsAuthorized(false)
                return
            }
            const decoded = jwtDecode(token)
            const tokenExpiration = decoded.exp
            const now = Date.now() / 1000

            if (tokenExpiration < now) {
                await refreshToken()
            } else {
                setIsAuthorized(true)
            }
        }

        auth().catch(() => setIsAuthorized(false))
    }, [])

    if (isAuthorized === null) {
        return <div>Loading...</div>
    }

    return isAuthorized ? children : <Navigate to="/login" />
}

export default ProtectedRoute
