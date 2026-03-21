"""
Ce module contient les fonctions pour récupérer les films et séries ainsi que tous les détails depuis l'API TMDB.

"""

from calendar import monthrange

import sys
import argparse
import re
import requests
from dotenv import load_dotenv
import os
import logging

# Sur Windows, la console utilise l'encodage cp1252 par défaut.
# Certains titres de films contiennent des caractères spéciaux (ō, ś, etc.)
# qui ne sont pas supportés par cp1252. On force UTF-8 pour éviter les erreurs.
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
from datetime import datetime
from dateutil.relativedelta import relativedelta
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import Plateform, Casting, Director, Films

load_dotenv()

# On récupère le logger "scripts" configuré dans settings.py.
# Tous les messages passés à ce logger seront écrits dans logs/scripts.log
# et affichés dans la console.
logger = logging.getLogger("scripts")

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")


HEADERS = {
    'accept': 'application/json',
    'Authorization': f'Bearer {TMDB_ACCESS_TOKEN}',
}

def get_casting(movie_id, type_field="Film", headers=HEADERS):

    """get actors and director

    Returns:
        tuple: a tuple containing the list of actors and the director's name
    """
    tv_or_movie = "movie" if type_field == "Film" else "tv"
    url = f"https://api.themoviedb.org/3/{tv_or_movie}/{movie_id}/credits?language=fr-FR"

    response = requests.get(url, headers=headers)

    actors = response.json()["cast"]

    # Get only the 5 most popular actors
    nb_actors = min(5, len(actors))  # On prend le minimum entre 5 et le nombre d'acteurs disponibles
    popular_actors = sorted(actors, key=lambda x: x["popularity"], reverse=True)[:nb_actors]

    cast_list = []
    for actor in popular_actors:
        # On utilise get_or_create pour éviter les doublons d'acteurs dans la base de données
        cast = Casting.objects.get_or_create(name=actor["name"])
        cast_list.append(cast[0].id)  # cast[0] est l'instance de l'acteur, cast[1] est un booléen indiquant si l'acteur a été créé ou non, on ajoute l'id de l'acteur à la liste des acteurs pour le film dans la base de données

    # Creation du réalisateur s'il n'existe pas déjà dans la base de données, et récupération de son id pour l'ajouter au film dans la base de données
    director = next((Director.objects.get_or_create(name=crew_member['name'])[0].id for crew_member in response.json()["crew"] if crew_member['job'] == 'Director'), None)

    return cast_list, director


def get_plateforms(movie_id, type_field="Film", headers=HEADERS):
    """get all the plateforms where the film is available with a subcription (netflix, prime video...)
        and add the plateforms to the film in the database


    Args:
        movie_id (integer): id of the movie you want to get the plateforms
        headers (dictionnary, optional): headers to use for the request. Defaults to HEADERS.

    Returns:
        list: list of plateform names where the film is available
    """

    tv_or_movie = "movie" if type_field == "Film" else "tv"
    plateform_url = f"https://api.themoviedb.org/3/{tv_or_movie}/{movie_id}/watch/providers"
    response_plateform = requests.get(plateform_url, headers=headers)

    # On récupère les données pour la France
    fr_data = response_plateform.json()["results"]["FR"]

    all_plateforms = fr_data.get("flatrate", []) + fr_data.get("rent", []) + fr_data.get("buy", [])

    list_plateforms = []
    for plateform in all_plateforms:
        # On utilise get_or_create pour éviter les doublons de plateforms dans la base de données
        # Si la plateforme est nouvelle (created=True), on lui ajoute son logo TMDB
        logo_url = f"https://image.tmdb.org/t/p/w200{plateform['logo_path']}" if plateform.get("logo_path") else None
        obj, created = Plateform.objects.get_or_create(tmdb_id=plateform["provider_id"], plateform=plateform["provider_name"])
        if created and logo_url:
            obj.logo = logo_url
            obj.save()
        # On évite les doublons dans la liste (une même plateforme peut être dans flatrate ET buy, ex: Apple TV)
        if plateform["provider_id"] not in list_plateforms:
            list_plateforms.append(plateform["provider_id"])

    return list_plateforms

def get_trailer(movie_id, type_field="Film", headers=HEADERS):

    """get the trailer url for a film or a serie

    Args:
        movie_id (integer): id of the movie or serie you want to get the trailer
        type_field (str, optional): type of content (Film or Série). Defaults to "Film".
        headers (dictionnary, optional): headers to use for the request. Defaults to HEADERS.

    Returns:
        string: url of the trailer on youtube, or None if no trailer is available
    """

    tv_or_movie = "movie" if type_field == "Film" else "tv"
    url = f"https://api.themoviedb.org/3/{tv_or_movie}/{movie_id}/videos"
    response = requests.get(url, headers=headers).json()["results"]

    embedded_url = None
    if response:
        trailer_key = [trailer["key"] for trailer in response if ("Trailer" in trailer["name"]) and (trailer["site"] == "YouTube")]
        embedded_url = f"https://www.youtube.com/embed/{trailer_key[0]}" if trailer_key else None
    
    return embedded_url

def create_dico(film,
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

def get_films_and_series(url,
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
        logger.error("Erreur lors de la récupération des films — réponse API inattendue pour l'URL : %s", url)
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
            plateforms = get_plateforms(movie_id=film["id"], type_field=type_field, headers=headers)
        except KeyError:
            continue

        actors, director = get_casting(movie_id=film["id"], type_field=type_field, headers=headers)

        trailer_url = get_trailer(movie_id=film["id"], type_field=type_field, headers=headers)

        dico = create_dico(film, 
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


def parse_start_date(value):
    """Convertit l'argument --start-date en objet datetime.

    Accepte deux formats :
    - Relatif : "7d" → 7 jours avant aujourd'hui, "30d" → 30 jours avant
    - Absolu : "1950-01-01" → date exacte au format AAAA-MM-JJ

    Args:
        value (str): La valeur passée en argument (ex: "7d" ou "1950-01-01")

    Returns:
        datetime: La date de début calculée

    Raises:
        argparse.ArgumentTypeError: Si le format n'est ni relatif ni une date valide
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
        raise argparse.ArgumentTypeError(
            f"Format invalide : '{value}'. Utilise '7d' (relatif) ou '1950-01-01' (absolu)."
        )


if __name__ == "__main__":

    # --- Parsing des arguments en ligne de commande ---
    # argparse permet de passer des options au script depuis le terminal.
    # Exemple : python get_films.py --start-date 7d
    parser = argparse.ArgumentParser(
        description="Récupère les films et séries depuis l'API TMDB et les enregistre en BDD."
    )
    parser.add_argument(
        "--start-date",
        type=parse_start_date,
        default=datetime(1950, 1, 1),
        help="Date de début. Relatif : '7d' (7 jours en arrière). Absolu : '1950-01-01'. Par défaut : 1950-01-01."
    )
    args = parser.parse_args()

    start_date = args.start_date
    end_date = datetime.now()
    month_delta = relativedelta(months=1)

    logger.info(
        "=== Début de la récupération des films et séries depuis TMDB (depuis %s) ===",
        start_date.strftime('%Y-%m-%d')
    )

    # Compteurs globaux pour le résumé final
    total_films_ajoutes = 0
    total_series_ajoutees = 0
    total_films_existants = 0
    total_series_existantes = 0

    # On boucle mois par mois pour récupérer les films et séries sortis chaque mois pour éviter de dépasser la limite de 500 pages maximum de TMDB
    while start_date < end_date:
        end_of_month = start_date.replace(day=monthrange(start_date.year, start_date.month)[1])

        logger.info("Période : %s - %s", start_date.strftime('%Y-%m-%d'), end_of_month.strftime('%Y-%m-%d'))

        for i in range(1, 501):  # TMDB ne retourne que les 500 premières pages, on boucle donc pour récupérer les films et séries mois par mois
            logger.debug("Page %d", i)
            film_url = f"https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=fr-FR&page={i}&primary_release_date.gte={start_date.strftime('%Y-%m-%d')}&primary_release_date.lte={end_of_month.strftime('%Y-%m-%d')}&sort_by=popularity.desc&watch_region=FR"
            tv_url = f"https://api.themoviedb.org/3/discover/tv?first_air_date.gte={start_date.strftime('%Y-%m-%d')}&first_air_date.lte={end_of_month.strftime('%Y-%m-%d')}&include_adult=false&include_null_first_air_dates=false&language=fr-FR&page={i}&sort_by=popularity.desc&watch_region=FR"

            films = get_films_and_series(url=film_url)
            series = get_films_and_series(url=tv_url,
                                  type_field="Série",
                                  title_field="name",
                                  release_date_field="first_air_date")

            logger.info("Page %d — %d films, %d séries récupérés depuis TMDB", i, len(films), len(series))

            if not films and not series:  # Si on n'a plus de films ou de séries à récupérer, on sort de la boucle
                logger.info("Plus de résultats, passage au mois suivant")
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
                        logger.debug("Nouveau film ajouté : %s (tmdb_id=%s)", film["title"], film["tmdb_id"])
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
                        logger.debug("Nouvelle série ajoutée : %s (tmdb_id=%s)", serie["title"], serie["tmdb_id"])
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

    # Résumé final : permet de vérifier d'un coup d'œil si le script a bien tourné
    logger.info(
        "=== Récupération terminée — %d nouveaux films, %d nouvelles séries, %d films existants, %d séries existantes ===",
        total_films_ajoutes, total_series_ajoutees, total_films_existants, total_series_existantes
    )

