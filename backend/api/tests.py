from django.contrib.auth.models import User
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class LoginThrottleTests(APITestCase):
    """
    Vérifie que le rate limiting (throttling) du login se déclenche.

    Le throttling de DRF compte les requêtes dans le cache. On vide donc
    le cache avant chaque test pour repartir d'un compteur à zéro et éviter
    qu'un test n'influence l'autre.
    """

    def setUp(self):
        """Repart d'un compteur de throttle vierge avant chaque test."""
        # Le cache stocke l'historique des requêtes par IP/scope.
        # Sans ce clear, le compteur d'un test précédent fausserait le suivant.
        cache.clear()

    def test_login_bloque_apres_10_tentatives(self):
        """
        Le scope 'login' est limité à 10 requêtes/minute (settings.py).

        On envoie 11 requêtes de connexion : les 10 premières doivent passer
        le throttle (et échouer en 401 car les identifiants sont faux), la
        11e doit être bloquée par le throttle avec un code 429.

        Note : le throttle s'applique AVANT la vérification des identifiants,
        donc pas besoin de créer un vrai utilisateur — peu importe que la
        connexion échoue, ce qu'on teste c'est la limite de débit.
        """
        url = reverse('get_token')
        payload = {'username': 'inexistant', 'password': 'faux'}

        # Les 10 premières tentatives : autorisées par le throttle.
        # Elles renvoient 401 (identifiants incorrects), pas 429.
        for _ in range(10):
            response = self.client.post(url, payload)
            self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # La 11e tentative dépasse la limite → 429 Too Many Requests.
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class PasswordValidationTests(APITestCase):
    """
    Vérifie que la validation de robustesse des mots de passe s'applique
    bien à l'inscription (AUTH_PASSWORD_VALIDATORS).
    """

    def setUp(self):
        """Vide le cache pour ne pas heurter le throttle d'inscription (5/h)."""
        # Le scope 'create_account' est limité ; sans ce clear, l'enchaînement
        # de tests pourrait renvoyer 429 au lieu du 400/201 attendu.
        cache.clear()

    def test_inscription_refuse_mdp_trop_court(self):
        """
        Un mot de passe trop court (< 8 caractères) doit être rejeté en 400,
        avec un message renvoyé sous la clé 'password'.
        """
        url = reverse('create-user')
        payload = {
            'username': 'alice',
            'email': 'alice@example.com',
            'password': 'abc',  # trop court → doit échouer
        }
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # La raison de l'échec doit être renvoyée sous la clé 'password'.
        self.assertIn('password', response.data)

    def test_inscription_refuse_mdp_trop_commun(self):
        """
        Un mot de passe figurant dans la liste des plus courants (ex: 'password')
        doit être rejeté, même s'il est assez long.
        """
        url = reverse('create-user')
        payload = {
            'username': 'bob',
            'email': 'bob@example.com',
            'password': 'password',  # trop commun → doit échouer
        }
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_inscription_accepte_mdp_robuste(self):
        """
        Un mot de passe robuste (long, non commun, non numérique) doit être
        accepté et créer le compte (201).
        """
        url = reverse('create-user')
        payload = {
            'username': 'charlie',
            'email': 'charlie@example.com',
            'password': 'Tournesol-42-Cinema',  # robuste → doit passer
        }
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class JWTRotationTests(APITestCase):
    """
    Vérifie la rotation des refresh tokens (ROTATE_REFRESH_TOKENS +
    BLACKLIST_AFTER_ROTATION).

    Comportement attendu : rafraîchir un access token renvoie AUSSI un nouveau
    refresh token, et l'ancien refresh devient inutilisable (blacklisté).
    """

    def setUp(self):
        """Crée un utilisateur actif et vide le cache (throttle login)."""
        cache.clear()
        # create_user hache le mot de passe ; is_active=True par défaut, donc
        # la connexion (/api/token/) fonctionnera.
        self.user = User.objects.create_user(
            username='dora', email='dora@example.com', password='Tournesol-42-Cinema'
        )

    def test_rotation_invalide_ancien_refresh(self):
        """
        1) On se connecte → on récupère un refresh token.
        2) On rafraîchit → on reçoit un access ET un nouveau refresh différent.
        3) On réutilise l'ANCIEN refresh → il est refusé (401), car blacklisté.
        """
        # 1) Connexion
        token_url = reverse('get_token')
        login = self.client.post(
            token_url, {'username': 'dora', 'password': 'Tournesol-42-Cinema'}
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        ancien_refresh = login.data['refresh']

        # 2) Rafraîchissement
        refresh_url = reverse('token_refresh')
        refreshed = self.client.post(refresh_url, {'refresh': ancien_refresh})
        self.assertEqual(refreshed.status_code, status.HTTP_200_OK)
        # La rotation renvoie un nouveau refresh, différent de l'ancien.
        self.assertIn('refresh', refreshed.data)
        self.assertNotEqual(refreshed.data['refresh'], ancien_refresh)

        # 3) L'ancien refresh est maintenant blacklisté → rejeté.
        rejouer = self.client.post(refresh_url, {'refresh': ancien_refresh})
        self.assertEqual(rejouer.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutTests(APITestCase):
    """
    Vérifie la déconnexion serveur (POST /api/logout/) : le refresh token
    fourni est blacklisté et ne peut plus servir à se rafraîchir.
    """

    def setUp(self):
        """Crée un utilisateur actif et vide le cache (throttle login)."""
        cache.clear()
        self.user = User.objects.create_user(
            username='emile', email='emile@example.com', password='Tournesol-42-Cinema'
        )

    def test_logout_blackliste_le_refresh(self):
        """
        1) Connexion → on récupère un refresh.
        2) POST /api/logout/ avec ce refresh → 205.
        3) Tenter de rafraîchir avec ce refresh → refusé (401).
        """
        # 1) Connexion
        login = self.client.post(
            reverse('get_token'),
            {'username': 'emile', 'password': 'Tournesol-42-Cinema'},
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        refresh = login.data['refresh']

        # 2) Déconnexion serveur
        logout = self.client.post(reverse('logout'), {'refresh': refresh})
        self.assertEqual(logout.status_code, status.HTTP_205_RESET_CONTENT)

        # 3) Le refresh blacklisté ne marche plus.
        rejouer = self.client.post(reverse('token_refresh'), {'refresh': refresh})
        self.assertEqual(rejouer.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_sans_refresh_renvoie_400(self):
        """Sans refresh dans le corps, l'endpoint renvoie 400."""
        response = self.client.post(reverse('logout'), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
