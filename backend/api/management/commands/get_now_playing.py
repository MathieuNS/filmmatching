"""
Commande de management pour recuperer les films actuellement a l'affiche
au cinema en France depuis l'API TMDB.

Met a jour le champ now_playing sur le modele Films :
1. Remet tous les films a now_playing=False
2. Recupere la liste des films au cinema via TMDB /movie/now_playing
3. Cree les films manquants en base avec enrichissement complet
   (casting, realisateur, bande-annonce, plateformes)
4. Met now_playing=True sur chaque film recupere

Usage :
    python manage.py get_now_playing

Avec Docker :
    docker compose exec backend python manage.py get_now_playing
"""

import sys
import logging
import requests

# Sur Windows, la console utilise l'encodage cp1252 par defaut.
# On force UTF-8 pour eviter les erreurs avec les caracteres speciaux.
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from django.core.management.base import BaseCommand
from api.models import Films
from api.tmdb_utils import get_casting, get_plateforms, get_trailer, TMDB_HEADERS

logger = logging.getLogger("scripts")


class Command(BaseCommand):
    help = "Recupere les films a l'affiche au cinema en France depuis TMDB et met a jour now_playing."

    def handle(self, *args, **options):
        """
        Point d'entree de la commande.

        Etape 1 : Remet tous les films a now_playing=False.
        Etape 2 : Parcourt toutes les pages de TMDB /movie/now_playing.
        Etape 3 : Pour chaque film, le cree en base s'il n'existe pas
                   (avec enrichissement complet), puis met now_playing=True.
        """
        msg = "=== Debut de la recuperation des films a l'affiche ==="
        self.stdout.write(self.style.SUCCESS(msg))
        logger.info(msg)

        # Etape 1 : Remettre tous les now_playing a False
        # Comme ca, les films qui ne sont plus au cinema repassent a False
        # automatiquement, sans avoir besoin de les identifier un par un.
        reset_count = Films.objects.filter(now_playing=True).update(now_playing=False)
        msg_reset = "  %d films remis a now_playing=False" % reset_count
        self.stdout.write(msg_reset)
        logger.info(msg_reset)

        # Compteurs pour le resume final
        total_nouveaux = 0
        total_existants = 0
        total_ignores = 0

        # Etape 2 : Premier appel pour connaitre le nombre total de pages
        first_url = (
            "https://api.themoviedb.org/3/movie/now_playing"
            "?language=fr-FR&region=FR&page=1"
        )
        first_response = requests.get(first_url, headers=TMDB_HEADERS)

        if first_response.status_code != 200:
            msg_err = "ERREUR : reponse TMDB inattendue : %s" % first_response.text
            self.stderr.write(self.style.ERROR(msg_err))
            logger.error(msg_err)
            return

        total_pages = first_response.json().get("total_pages", 1)
        msg_pages = "  %d pages a parcourir" % total_pages
        self.stdout.write(msg_pages)
        logger.info(msg_pages)

        # Etape 3 : Parcourir toutes les pages (y compris la premiere deja recuperee)
        for page in range(1, total_pages + 1):
            # Pour la page 1, on reutilise la reponse deja recuperee
            if page == 1:
                data = first_response.json()
            else:
                url = (
                    f"https://api.themoviedb.org/3/movie/now_playing"
                    f"?language=fr-FR&region=FR&page={page}"
                )
                response = requests.get(url, headers=TMDB_HEADERS)

                if response.status_code != 200:
                    msg_err = "ERREUR : reponse TMDB inattendue (page %d) : %s" % (page, response.text)
                    self.stderr.write(self.style.ERROR(msg_err))
                    logger.error(msg_err)
                    continue

                data = response.json()

            films = data.get("results", [])

            msg_page = "  Page %d/%d -- %d films" % (page, total_pages, len(films))
            self.stdout.write(msg_page)
            logger.info(msg_page)

            # Etape 4 : Traiter chaque film
            for film_data in films:
                # Ignorer les films sans synopsis (meme logique que get_films.py)
                if not film_data.get("overview"):
                    total_ignores += 1
                    continue

                # Ignorer les films sans poster
                if not film_data.get("poster_path"):
                    total_ignores += 1
                    continue

                tmdb_id = film_data["id"]

                # Verifier si le film existe deja en base
                film_obj = Films.objects.filter(tmdb_id=tmdb_id, type="Film").first()

                if film_obj:
                    # Le film existe deja -> juste mettre now_playing=True
                    film_obj.now_playing = True
                    film_obj.save(update_fields=["now_playing"])
                    total_existants += 1
                    logger.debug("Film existant mis a jour : %s (tmdb_id=%s)", film_obj.title, tmdb_id)
                else:
                    # Le film n'existe pas -> creation avec enrichissement complet
                    film_obj = self._create_film(film_data)
                    if film_obj:
                        total_nouveaux += 1
                        logger.debug("Nouveau film cree : %s (tmdb_id=%s)", film_obj.title, tmdb_id)
                    else:
                        total_ignores += 1

        # Resume final
        msg_fin = (
            "=== Recuperation terminee -- %d nouveaux films, "
            "%d films existants mis a jour, %d ignores ==="
            % (total_nouveaux, total_existants, total_ignores)
        )
        self.stdout.write(self.style.SUCCESS(msg_fin))
        logger.info(msg_fin)

    def _create_film(self, film_data):
        """
        Cree un film en base avec enrichissement complet depuis TMDB.

        Utilise les fonctions partagees de tmdb_utils.py pour recuperer :
        - Le casting (5 acteurs principaux + realisateur)
        - Les plateformes de streaming en France
        - La bande-annonce YouTube

        Contrairement a get_films.py, le film est cree meme sans plateforme
        car il est au cinema (c'est sa "plateforme" principale).

        Args:
            film_data (dict): Les donnees TMDB du film (depuis /movie/now_playing)

        Returns:
            Films: L'instance creee, ou None en cas d'erreur
        """
        tmdb_id = film_data["id"]

        try:
            # --- Casting (fonctions partagees dans tmdb_utils.py) ---
            cast_list, director_id = get_casting(tmdb_id)

            # --- Plateformes ---
            # On utilise try/except car get_plateforms leve KeyError si pas de
            # donnees France, mais pour un film au cinema c'est normal.
            try:
                plateform_ids = get_plateforms(tmdb_id)
            except KeyError:
                plateform_ids = []

            # --- Bande-annonce ---
            trailer_url = get_trailer(tmdb_id)

            # --- Genres ---
            # Les genres dans /movie/now_playing sont des IDs (genre_ids),
            # ils correspondent aux tmdb_id du modele Genres (primary key).
            genre_ids = film_data.get("genre_ids", [])

            # --- Creation du film ---
            release_date = film_data.get("release_date", "")
            release_year = int(release_date[:4]) if release_date and len(release_date) >= 4 else 0

            film_obj = Films.objects.create(
                tmdb_id=tmdb_id,
                type="Film",
                title=film_data.get("title", ""),
                img=f"https://image.tmdb.org/t/p/w500{film_data['poster_path']}",
                release_year=release_year,
                synopsis=film_data.get("overview", ""),
                popularity=film_data.get("popularity", 0),
                trailer_url=trailer_url,
                director_id=director_id,
                now_playing=True,
            )

            # Ajout des relations ManyToMany
            film_obj.main_actors.set(cast_list)
            film_obj.genres.set(genre_ids)
            if plateform_ids:
                film_obj.plateforms.set(plateform_ids)

            return film_obj

        except Exception as e:
            msg = "ERREUR creation film tmdb_id=%s : %s" % (tmdb_id, e)
            self.stderr.write(self.style.ERROR(msg))
            logger.error(msg)
            return None
