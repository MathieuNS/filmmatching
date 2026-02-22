"""
Ce module contient les fonctions pour récupérer les films depuis l'API TMDB.

"""

#TODO: ajouter les acteurs et le réalisateur

import requests
from dotenv import load_dotenv
import os
from pprint import pprint

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")

FILMS_URL = "https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=fr-FR&page=3&sort_by=popularity.desc"
TV_URL = "https://api.themoviedb.org/3/discover/tv?include_adult=false&include_video=false&language=fr-FR&page=3&sort_by=popularity.desc"
GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list?language=fr-FR"

HEADERS = {
    'accept': 'application/json',
    'Authorization': f'Bearer {TMDB_ACCESS_TOKEN}',
}

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
                title_field="title", 
                img_field="poster_path", 
                release_date_field="release_date", 
                synopsis_field="overview",
                type_field="Film"):
    
    return {
            'title': film[title_field],
            'img': f"https://image.tmdb.org/t/p/w500{film[img_field]}",
            'release_year': film[release_date_field][:4],
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

        dico = create_dico(film, 
                           list_genres, 
                           plateforms,
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

