"""
Ce module contient les fonctions pour récupérer les films et séries ainsi que tous les détails depuis l'API TMDB.

"""

import requests
from dotenv import load_dotenv
import os
from pprint import pprint

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")

FILMS_URL = "https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=fr-FR&page=1&sort_by=popularity.desc"
TV_URL = "https://api.themoviedb.org/3/discover/tv?include_adult=false&include_video=false&language=fr-FR&page=1&sort_by=popularity.desc"
GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list?language=fr-FR"

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

    cast_list = [actor['name'] for actor in popular_actors]

    # Get the director's name
    director = next((crew_member['name'] for crew_member in response.json()["crew"] if crew_member['job'] == 'Director'), None)

    return cast_list, director


def get_plateforms(movie_id, headers=HEADERS):
    """get all the plateforms where the film is available with a subcription (netflix, prime video...)


    Args:
        movie_id (integer): id of the movie you want to get the plateforms
        headers (dictionnary, optional): headers to use for the request. Defaults to HEADERS.

    Returns:
        list: list of plateform names where the film is available
    """
    plateform_urs = f"https://api.themoviedb.org/3/movie/{movie_id}/watch/providers"
    response_plateform = requests.get(plateform_urs, headers=headers)
    
    plateforms = response_plateform.json()["results"]["FR"]["flatrate"]

    list_plateforms = [plateform["provider_name"] for plateform in plateforms]

    return list_plateforms

def create_dico(film,
                genres, 
                plateforme,
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
            'title': film[title_field],
            'img': f"https://image.tmdb.org/t/p/w500{film[img_field]}",
            'release_year': film[release_date_field][:4],
            'director': director,
            'main_actors': actors,
            'synopsis': film[synopsis_field],
            'tags' : genres,
            'plateforms': plateforme,
            'type': type_field
        }

def get_films_and_series(url=FILMS_URL, 
              genre_url=GENRES_URL, 
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
    response_genres = requests.get(genre_url, headers=headers)

    films = response_films.json()["results"]
    genres = response_genres.json()["genres"]

    list_films = []

    for film in films:

        list_genres = []

        for genre in genres:
            if genre["id"] in film["genre_ids"]:
                list_genres.append(genre["name"])

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
    films = get_films_and_series()
    series = get_films_and_series(url=TV_URL, 
                                  type_field="Série", 
                                  title_field="name", 
                                  release_date_field="first_air_date")
    pprint(series)

