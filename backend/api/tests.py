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
