"""
Ce module contient les fonctions pour récupérer les films et séries ainsi que tous les détails depuis l'API TMDB.

"""

from calendar import monthrange

import sys
import re
import requests
import logging

# Sur Windows, la console utilise l'encodage cp1252 par défaut.
# Certains titres de films contiennent des caractères spéciaux (ō, ś, etc.)
# qui ne sont pas supportés par cp1252. On force UTF-8 pour éviter les erreurs.
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
from datetime import datetime
from dateutil.relativedelta import relativedelta

from django.core.management.base import BaseCommand
from api.models import Films
from api.tmdb_utils import get_casting, get_plateforms, get_trailer, TMDB_HEADERS

# On récupère le logger "scripts" configuré dans settings.py.
# Tous les messages passés à ce logger seront écrits dans logs/scripts.log
# et affichés dans la console.
logger = logging.getLogger("scripts")


# HEADERS est importé depuis tmdb_utils sous le nom TMDB_HEADERS
# pour centraliser la configuration d'authentification TMDB.
HEADERS = TMDB_HEADERS


class Command(BaseCommand):
    help = "Recupere les films et series depuis l'API TMDB et les enregistre en BDD."

    def add_arguments(self, parser):
        """
        Definit les arguments de la commande.
        add_arguments est la methode de Django pour ajouter des arguments
        a une commande de management (equivalent de argparse.add_argument
        mais integre a Django).

        Usage :
            python manage.py get_films --start-date 7d
            python manage.py get_films --start-date 1950-01-01
        """
        parser.add_argument(
            "--start-date",
            type=self.parse_start_date,
            default=datetime(1950, 1, 1),
            help="Date de debut. Relatif : '7d' (7 jours en arriere). Absolu : '1950-01-01'. Par defaut : 1950-01-01."
        )

    def handle(self, *args, **options):
        # options est un dictionnaire qui contient les arguments passes
        # a la commande. Django s'occupe du parsing automatiquement
        # grace a add_arguments() ci-dessus.
        start_date = options["start_date"]
        end_date = datetime.now()
        month_delta = relativedelta(months=1)

        # On affiche dans le terminal (self.stdout.write) ET on log dans le fichier (logger).
        # self.stdout.write = affichage interactif dans la console, avec couleurs Django.
        # logger.info = trace persistante ecrite dans logs/scripts.log pour verifier plus tard.
        msg_debut = "=== Debut de la recuperation des films et series depuis TMDB (depuis %s) ===" % start_date.strftime('%Y-%m-%d')
        self.stdout.write(self.style.SUCCESS(msg_debut))
        logger.info(msg_debut)

        # Compteurs globaux pour le résumé final
        total_films_ajoutes = 0
        total_series_ajoutees = 0
        total_films_existants = 0
        total_series_existantes = 0

        # On boucle mois par mois pour récupérer les films et séries sortis chaque mois pour éviter de dépasser la limite de 500 pages maximum de TMDB
        while start_date < end_date:
            end_of_month = start_date.replace(day=monthrange(start_date.year, start_date.month)[1])

            msg_periode = "Periode : %s - %s" % (start_date.strftime('%Y-%m-%d'), end_of_month.strftime('%Y-%m-%d'))
            self.stdout.write(msg_periode)
            logger.info(msg_periode)

            for i in range(1, 501):  # TMDB ne retourne que les 500 premières pages, on boucle donc pour récupérer les films et séries mois par mois
                logger.debug("Page %d" % i)
                film_url = f"https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=fr-FR&page={i}&primary_release_date.gte={start_date.strftime('%Y-%m-%d')}&primary_release_date.lte={end_of_month.strftime('%Y-%m-%d')}&sort_by=popularity.desc&watch_region=FR"
                tv_url = f"https://api.themoviedb.org/3/discover/tv?first_air_date.gte={start_date.strftime('%Y-%m-%d')}&first_air_date.lte={end_of_month.strftime('%Y-%m-%d')}&include_adult=false&include_null_first_air_dates=false&language=fr-FR&page={i}&sort_by=popularity.desc&watch_region=FR"

                films = self.get_films_and_series(url=film_url)
                series = self.get_films_and_series(url=tv_url,
                                    type_field="Série",
                                    title_field="name",
                                    release_date_field="first_air_date")

                msg_page = "  Page %d -- %d films, %d series recuperes" % (i, len(films), len(series))
                self.stdout.write(msg_page)
                logger.info(msg_page)

                if not films and not series:  # Si on n'a plus de films ou de séries à récupérer, on sort de la boucle
                    self.stdout.write("  Plus de resultats, passage au mois suivant")
                    logger.info("Plus de resultats, passage au mois suivant")
                    break

                if films:
                    for film in films: # On ajoute les films à la base de données, en vérifiant que le synopsis n'est pas vide pour éviter d'avoir des films sans description
                        # get_or_create cherche un film avec tmdb_id + type (les champs uniques).
                        # Les autres champs vont dans "defaults" : ils sont utilisés uniquement
                        # lors de la création d'un nouveau film, pas pour la recherche.
                        # Sans "defaults", get_or_create cherche un film correspondant à TOUS
                        # les champs → si un seul a changé (ex: popularity), il ne trouve rien
                        # et essaie de créer un doublon → erreur UNIQUE constraint.
                        new_film = Films.objects.get_or_create(
                            tmdb_id=film["tmdb_id"],
                            type=film["type"],
                            defaults={
                                "title": film["title"],
                                "img": film["img"],
                                "release_year": film["release_year"],
                                "synopsis": film["synopsis"],
                                "popularity": film["popularity"],
                                "trailer_url": film["trailer_url"]
                            }
                        )

                        # new_film[1] est True si le film vient d'être créé, False s'il existait déjà
                        if new_film[1]:
                            total_films_ajoutes += 1
                            logger.debug("Nouveau film ajoute : %s (tmdb_id=%s)" % (film["title"], film["tmdb_id"]))
                        else:
                            total_films_existants += 1

                        #Ajout des relations ManyToMany après la création du film, en utilisant les IDs des acteurs, genres et plateforms pour éviter les doublons dans la base de données
                        new_film[0].trailer_url = film["trailer_url"]
                        new_film[0].popularity = film["popularity"]
                        new_film[0].main_actors.set(film["main_actors"])
                        new_film[0].director_id = film["director"]
                        new_film[0].save()
                        new_film[0].genres.set(film["genres"])
                        new_film[0].plateforms.set(film["plateforms"])
                if series:
                    for serie in series: # On ajoute les séries à la base de données, en vérifiant que le synopsis n'est pas vide pour éviter d'avoir des séries sans description
                        # Même logique que pour les films : on cherche par tmdb_id + type,
                        # et les autres champs vont dans "defaults".
                        new_serie = Films.objects.get_or_create(
                            tmdb_id=serie["tmdb_id"],
                            type=serie["type"],
                            defaults={
                                "title": serie["title"],
                                "img": serie["img"],
                                "release_year": serie["release_year"],
                                "synopsis": serie["synopsis"],
                                "popularity": serie["popularity"],
                                "trailer_url": serie["trailer_url"]
                            }
                        )

                        if new_serie[1]:
                            total_series_ajoutees += 1
                            logger.debug("Nouvelle serie ajoutee : %s (tmdb_id=%s)" % (serie["title"], serie["tmdb_id"]))
                        else:
                            total_series_existantes += 1

                        #Ajout des relations ManyToMany après la création de la série, en utilisant les IDs des acteurs, genres et plateforms pour éviter les doublons dans la base de données
                        new_serie[0].trailer_url = serie["trailer_url"]
                        new_serie[0].popularity = serie["popularity"]
                        new_serie[0].main_actors.set(serie["main_actors"])
                        new_serie[0].director_id = serie["director"]
                        new_serie[0].save()
                        new_serie[0].genres.set(serie["genres"])
                        new_serie[0].plateforms.set(serie["plateforms"])


            start_date += month_delta

        # Resume final : affiche dans le terminal ET log dans le fichier
        msg_fin = "=== Recuperation terminee -- %d nouveaux films, %d nouvelles series, %d films existants, %d series existantes ===" % (
            total_films_ajoutes, total_series_ajoutees, total_films_existants, total_series_existantes
        )
        self.stdout.write(self.style.SUCCESS(msg_fin))
        logger.info(msg_fin)

    def create_dico(self, film,
                    genres=None, 
                    plateforme=None,
                    actors=None,
                    director=None,
                    title_field="title", 
                    img_field="poster_path", 
                    release_date_field="release_date", 
                    synopsis_field="overview",
                    type_field="Film",
                    trailer_url=None
                    ):
        
        """create a dictionnary with all the details needed

        Args:
            film dict: dictionnary with all the details of the films from the API
            genres list: list of genres for the film
            plateforme list: list of plateforms where the film is available
            actors list: list of main actors for the film
            director string: name of the director of the film
            title_field (str, optional): title field name in the film dict. Defaults to "title".
            img_field (str, optional): image field name in the film dict. Defaults to "poster_path".
            release_date_field (str, optional): release date field name in the film dict. Defaults to "release_date".
            synopsis_field (str, optional): synopsis field name in the film dict. Defaults to "overview".
            type_field (str, optional): type of content (Film or Série). Defaults to "Film".

        Returns:
            dict: a dictionary with all the details of the film
        """
        
        return {
                'tmdb_id': film["id"],
                'title': film[title_field],
                'img': f"https://image.tmdb.org/t/p/w500{film[img_field]}",
                'release_year': film[release_date_field][:4],
                'director': director,
                'main_actors': actors,
                'synopsis': film[synopsis_field],
                'genres' : genres,
                'plateforms': plateforme,
                'type': type_field,
                'popularity': film["popularity"],
                'trailer_url': trailer_url
            }

    def get_films_and_series(self,url,
                headers=HEADERS,
                title_field="title",
                img_field="poster_path",
                release_date_field="release_date",
                synopsis_field="overview",
                type_field="Film"):
        
        """get all the films and series

        Returns:
            list: list of dictionaries with all the details of the films and series
        """
        

        response_films = requests.get(url, headers=headers)

        try:
            films = response_films.json()["results"]
        except KeyError:
            msg_erreur = "ERREUR : reponse API inattendue pour l'URL : %s" % url
            self.stderr.write(self.style.ERROR(msg_erreur))
            logger.error(msg_erreur)
            return []

        list_films = []

        for film in films:

            if film["overview"] == "":  # Si le synopsis est vide, on ne récupère pas les détails du film pour éviter d'avoir des films sans description dans la base de données
                continue

            # On passe directement les IDs TMDB des genres, car le model Genres
            # utilise tmdb_id comme primary_key
            list_genres = film["genre_ids"]

            # S'il n'y a pas de plateformes disponibles pour le film, on ne récupère pas les détails du film pour éviter d'avoir des films sans plateforme dans la base de données
            try:
                plateforms = get_plateforms(movie_id=film["id"], type_field=type_field)
            except KeyError:
                continue

            actors, director = get_casting(movie_id=film["id"], type_field=type_field)

            trailer_url = get_trailer(movie_id=film["id"], type_field=type_field)

            dico = self.create_dico(film, 
                            list_genres, 
                            plateforms,
                            director=director,
                            actors=actors,
                            title_field=title_field,
                            img_field=img_field,
                            release_date_field= release_date_field,
                            synopsis_field=synopsis_field,
                            type_field=type_field,
                            trailer_url=trailer_url
                            )
            
            list_films.append(dico)

        return list_films

    def parse_start_date(self, value):
        """Convertit l'argument --start-date en objet datetime.

        Accepte deux formats :
        - Relatif : "7d" → 7 jours avant aujourd'hui, "30d" → 30 jours avant
        - Absolu : "1950-01-01" → date exacte au format AAAA-MM-JJ

        Args:
            value (str): La valeur passée en argument (ex: "7d" ou "1950-01-01")

        Returns:
            datetime: La date de début calculée

        Raises:
            ValueError: Si le format n'est ni relatif ni une date valide
        """
        # Format relatif : un nombre suivi de "d" (pour "days")
        # re.match cherche le pattern au début de la chaîne
        match = re.match(r"^(\d+)d$", value)
        if match:
            days = int(match.group(1))
            return datetime.now() - relativedelta(days=days)

        # Format absolu : une date au format AAAA-MM-JJ
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise ValueError(
                f"Format invalide : '{value}'. Utilise '7d' (relatif) ou '1950-01-01' (absolu)."
            )
