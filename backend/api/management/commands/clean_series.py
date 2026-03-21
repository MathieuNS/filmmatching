"""
Commande Django pour nettoyer les series qui ont herite des donnees
du film ayant le meme tmdb_id lors d'un ancien script bugge.

Pour chaque serie en base, on verifie sur l'API TMDB si elle a vraiment
des plateformes de streaming en France. Si ce n'est pas le cas, on la
supprime de la base de donnees.

Usage :
    python manage.py clean_series
"""

import requests
import os
from dotenv import load_dotenv
from django.core.management.base import BaseCommand
from api.models import Films

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")
HEADERS = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_ACCESS_TOKEN}",
}


class Command(BaseCommand):
    """
    Supprime les series qui n'ont pas de plateformes sur TMDB.
    Ces series avaient herite des plateformes du film avec le meme tmdb_id.
    """

    help = "Supprime les series sans plateforme reelle sur TMDB"

    def handle(self, *args, **options):
        """
        Pour chaque serie en base, on appelle l'API TMDB pour verifier
        si elle a des plateformes en France. Si non, on la supprime.
        """
        series = Films.objects.filter(type="Série")
        total = series.count()
        deleted = 0
        kept = 0

        self.stdout.write("Verification de %d series..." % total)
        self.stdout.write("")

        for i, serie in enumerate(series, 1):
            # Appel a l'API TMDB pour verifier les plateformes
            url = f"https://api.themoviedb.org/3/tv/{serie.tmdb_id}/watch/providers"
            response = requests.get(url, headers=HEADERS)

            # On verifie si la serie a des plateformes en France
            has_platforms = False
            try:
                flatrate = response.json()["results"]["FR"]
                if flatrate:
                    has_platforms = True
            except (KeyError, TypeError):
                pass

            if not has_platforms:
                self.stdout.write(
                    self.style.WARNING(
                        "  SUPPRIME : %s (tmdb_id=%s)" % (serie.title, serie.tmdb_id)
                    )
                )
                serie.delete()
                deleted += 1
            else:
                kept += 1

            # Affichage de la progression toutes les 100 series
            if i % 100 == 0:
                self.stdout.write("  ... %d/%d traitees" % (i, total))

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "Termine : %d series supprimees, %d conservees" % (deleted, kept)
            )
        )
