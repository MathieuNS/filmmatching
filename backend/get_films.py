"""
Ce module contient les fonctions pour récupérer les films et séries ainsi que tous les détails depuis l'API TMDB.

"""

from calendar import monthrange

import requests
from dotenv import load_dotenv
import os
from pprint import pprint
from datetime import datetime
from dateutil.relativedelta import relativedelta
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import Plateform, Casting, Director, Films

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")


HEADERS = {
    'accept': 'application/json',
    'Authorization': f'Bearer {TMDB_ACCESS_TOKEN}',
}

def get_casting(movie_id, headers=HEADERS):

    """get actors and director

    Returns:
        tuple: a tuple containing the list of actors and the director's name
    """
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?language=fr-FR"

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


def get_plateforms(movie_id, headers=HEADERS):
    """get all the plateforms where the film is available with a subcription (netflix, prime video...)
        and add the plateforms to the film in the database


    Args:
        movie_id (integer): id of the movie you want to get the plateforms
        headers (dictionnary, optional): headers to use for the request. Defaults to HEADERS.

    Returns:
        list: list of plateform names where the film is available
    """
    plateform_urs = f"https://api.themoviedb.org/3/movie/{movie_id}/watch/providers"
    response_plateform = requests.get(plateform_urs, headers=headers)
    
    plateforms = response_plateform.json()["results"]["FR"]["flatrate"]

    list_plateforms = []
    for plateform in plateforms:
        # On utilise get_or_create pour éviter les doublons de plateforms dans la base de données
        Plateform.objects.get_or_create(tmdb_id=plateform["provider_id"], plateform=plateform["provider_name"])
        list_plateforms.append(plateform["provider_id"])

    return list_plateforms

def create_dico(film,
                genres=None, 
                plateforme=None,
                actors=None,
                director=None,
                title_field="title", 
                img_field="poster_path", 
                release_date_field="release_date", 
                synopsis_field="overview",
                type_field="Film"
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
            'popularity': film["popularity"]
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
        print("Erreur lors de la récupération des films")
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
            plateforms = get_plateforms(movie_id=film["id"], headers=headers)
        except KeyError:
            continue

        actors, director = get_casting(movie_id=film["id"], headers=headers)

        dico = create_dico(film, 
                           list_genres, 
                           plateforms,
                           director=director,
                           actors=actors,
                           title_field=title_field,
                           img_field=img_field,
                           release_date_field= release_date_field,
                           synopsis_field=synopsis_field,
                           type_field=type_field)
        
        list_films.append(dico)

    return list_films


if __name__ == "__main__":

    start_date = datetime(1950, 1, 1)
    end_date = datetime.now()
    month_delta = relativedelta(months=1)

    # On boucle mois par mois pour récupérer les films et séries sortis chaque mois pour éviter de dépasser la limite de 500 pages maximum de TMDB
    while start_date < end_date:
        end_of_month = start_date.replace(day=monthrange(start_date.year, start_date.month)[1])

        print(f"------------------- {start_date.strftime('%Y-%m-%d')} - {end_of_month.strftime('%Y-%m-%d')} -------------------")

        for i in range(1, 501):  # TMDB ne retourne que les 500 premières pages, on boucle donc pour récupérer les films et séries mois par mois
            print(f"------------------ Page {i} ------------------")
            film_url = f"https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=fr-FR&page={i}&primary_release_date.gte={start_date.strftime('%Y-%m-%d')}&primary_release_date.lte={end_of_month.strftime('%Y-%m-%d')}&sort_by=popularity.desc&watch_region=FR"
            tv_url = f"https://api.themoviedb.org/3/discover/tv?first_air_date.gte={start_date.strftime('%Y-%m-%d')}&first_air_date.lte={end_of_month.strftime('%Y-%m-%d')}&include_adult=false&include_null_first_air_dates=false&language=fr-FR&page={i}&sort_by=popularity.desc&watch_region=FR"
        
            films = get_films_and_series(url=film_url)
            series = get_films_and_series(url=tv_url, 
                                  type_field="Série", 
                                  title_field="name", 
                                  release_date_field="first_air_date")
            
            print(f"Nombre de films récupérés : {len(films)}")
            print(f"Nombre de séries récupérées : {len(series)}")

            if not films and not series:  # Si on n'a plus de films ou de séries à récupérer, on sort de la boucle
                print("Aucun film ou série trouvé, passage au mois suivant")
                break
            
            if films:
                for film in films: # On ajoute les films à la base de données, en vérifiant que le synopsis n'est pas vide pour éviter d'avoir des films sans description
                    print("Ajout du film :", film["title"])
                    new_film =Films.objects.get_or_create(tmdb_id=film["tmdb_id"], 
                                                title=film["title"], 
                                                img=film["img"], 
                                                release_year=film["release_year"],  
                                                synopsis=film["synopsis"],
                                                type=film["type"],
                                                popularity=film["popularity"])
                        
                    #Ajout des relations ManyToMany après la création du film, en utilisant les IDs des acteurs, genres et plateforms pour éviter les doublons dans la base de données
                    new_film[0].main_actors.set(film["main_actors"])
                    new_film[0].director_id = film["director"]
                    new_film[0].save()
                    new_film[0].genres.set(film["genres"])
                    new_film[0].plateforms.set(film["plateforms"])
            if series:
                for serie in series: # On ajoute les séries à la base de données, en vérifiant que le synopsis n'est pas vide pour éviter d'avoir des séries sans description
                    print("Ajout de la série :", serie["title"])
                    new_serie = Films.objects.get_or_create(tmdb_id=serie["tmdb_id"], 
                                                title=serie["title"], 
                                                img=serie["img"], 
                                                release_year=serie["release_year"],  
                                                synopsis=serie["synopsis"], 
                                                type=serie["type"],
                                                popularity=serie["popularity"])
                    
                    #Ajout des relations ManyToMany après la création de la série, en utilisant les IDs des acteurs, genres et plateforms pour éviter les doublons dans la base de données
                    new_serie[0].main_actors.set(serie["main_actors"])
                    new_serie[0].director_id = serie["director"]
                    new_serie[0].save()
                    new_serie[0].genres.set(serie["genres"])
                    new_serie[0].plateforms.set(serie["plateforms"])


        start_date += month_delta
    
    
    print("Récupération des films et séries terminée")

