from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        """
        Méthode appelée par Django quand l'application est prête.

        On importe les signaux ici pour qu'ils soient enregistrés
        au démarrage du serveur. Sans cet import, le signal post_save
        dans signals.py ne serait jamais connecté et les Profiles
        ne seraient pas créés automatiquement.
        """
        import api.signals  # noqa: F401
