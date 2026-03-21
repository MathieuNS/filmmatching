"""
Fonctions utilitaires pour interagir avec l'API TMDB.

Ce module regroupe les fonctions partagées entre les commandes de management
(get_films, get_now_playing, etc.) pour éviter la duplication de code.

Chaque fonction fait un appel à l'API TMDB et enregistre les données
dans la base de données si nécessaire (acteurs, réalisateurs, plateformes).
"""

import os
import logging
import requests
from dotenv import load_dotenv

from api.models import Plateform, Casting, Director

load_dotenv()

logger = logging.getLogger("scripts")

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")

# Headers d'authentification pour toutes les requêtes TMDB.
# Le Bearer token est récupéré depuis la variable d'environnement TMDB_ACCESS_TOKEN.
TMDB_HEADERS = {
    'accept': 'application/json',
    'Authorization': f'Bearer {TMDB_ACCESS_TOKEN}',
}


def get_casting(movie_id, type_field="Film"):
    """
    Récupère les 5 acteurs principaux et le réalisateur d'un film ou d'une série
    depuis l'API TMDB (/credits).

    Les acteurs sont triés par popularité décroissante. Pour chaque acteur,
    on utilise get_or_create pour éviter les doublons dans la base de données.

    Args:
        movie_id (int): L'ID TMDB du film ou de la série
        type_field (str): "Film" ou "Série" — détermine si on appelle
                          /movie/ ou /tv/ sur TMDB

    Returns:
        tuple: (liste d'IDs d'acteurs en base, ID du réalisateur ou None)
    """
    tv_or_movie = "movie" if type_field == "Film" else "tv"
    url = f"https://api.themoviedb.org/3/{tv_or_movie}/{movie_id}/credits?language=fr-FR"

    response = requests.get(url, headers=TMDB_HEADERS)
    data = response.json()

    # Acteurs : on prend les 5 plus populaires
    actors = data.get("cast", [])
    nb_actors = min(5, len(actors))
    popular_actors = sorted(
        actors, key=lambda x: x.get("popularity", 0), reverse=True
    )[:nb_actors]

    cast_list = []
    for actor in popular_actors:
        # get_or_create renvoie un tuple (objet, created).
        # On ne garde que l'objet pour récupérer son ID.
        obj, _ = Casting.objects.get_or_create(name=actor["name"])
        cast_list.append(obj.id)

    # Réalisateur : premier membre de l'équipe avec job="Director"
    director_id = None
    for crew_member in data.get("crew", []):
        if crew_member.get("job") == "Director":
            obj, _ = Director.objects.get_or_create(name=crew_member["name"])
            director_id = obj.id
            break

    return cast_list, director_id


def get_plateforms(movie_id, type_field="Film"):
    """
    Récupère les plateformes de streaming disponibles en France pour un film
    ou une série depuis l'API TMDB (/watch/providers).

    Combine les plateformes par abonnement (flatrate), location (rent) et achat (buy).
    Chaque plateforme est enregistrée en base via get_or_create.

    Args:
        movie_id (int): L'ID TMDB du film ou de la série
        type_field (str): "Film" ou "Série" — détermine si on appelle
                          /movie/ ou /tv/ sur TMDB

    Returns:
        list: Liste d'IDs TMDB de plateformes (peut être vide)

    Raises:
        KeyError: Si les données France ("FR") n'existent pas dans la réponse.
                  L'appelant peut attraper cette exception pour ignorer
                  les films sans plateforme FR (c'est ce que fait get_films.py).
    """
    tv_or_movie = "movie" if type_field == "Film" else "tv"
    url = f"https://api.themoviedb.org/3/{tv_or_movie}/{movie_id}/watch/providers"

    response = requests.get(url, headers=TMDB_HEADERS)
    data = response.json()

    # Récupérer les données pour la France.
    # On accède directement avec ["FR"] (pas .get()) pour que ça lève KeyError
    # si la France n'est pas disponible — c'est le comportement attendu par get_films.py
    # qui ignore les films sans plateforme FR.
    fr_data = data["results"]["FR"]

    # Combiner abonnement + location + achat
    all_plateforms = (
        fr_data.get("flatrate", [])
        + fr_data.get("rent", [])
        + fr_data.get("buy", [])
    )

    list_plateforms = []
    seen_ids = set()  # Pour éviter les doublons (une même plateforme peut être dans flatrate ET buy)
    for plateform in all_plateforms:
        provider_id = plateform["provider_id"]
        if provider_id in seen_ids:
            continue
        seen_ids.add(provider_id)

        logo_url = (
            f"https://image.tmdb.org/t/p/w200{plateform['logo_path']}"
            if plateform.get("logo_path") else None
        )
        obj, created = Plateform.objects.get_or_create(
            tmdb_id=provider_id,
            defaults={"plateform": plateform["provider_name"]},
        )
        if created and logo_url:
            obj.logo = logo_url
            obj.save()
        list_plateforms.append(provider_id)

    return list_plateforms


def get_trailer(movie_id, type_field="Film"):
    """
    Récupère l'URL de la bande-annonce YouTube d'un film ou d'une série
    depuis l'API TMDB (/videos).

    Cherche une vidéo dont le nom contient "Trailer" et qui est hébergée
    sur YouTube. Renvoie un lien embed pour l'intégration dans le frontend.

    Args:
        movie_id (int): L'ID TMDB du film ou de la série
        type_field (str): "Film" ou "Série" — détermine si on appelle
                          /movie/ ou /tv/ sur TMDB

    Returns:
        str|None: URL embed YouTube (ex: "https://www.youtube.com/embed/abc123")
                  ou None si aucune bande-annonce n'est trouvée
    """
    tv_or_movie = "movie" if type_field == "Film" else "tv"
    url = f"https://api.themoviedb.org/3/{tv_or_movie}/{movie_id}/videos"

    response = requests.get(url, headers=TMDB_HEADERS)
    results = response.json().get("results", [])

    if not results:
        return None

    # Chercher un trailer YouTube parmi les vidéos
    for video in results:
        if "Trailer" in video.get("name", "") and video.get("site") == "YouTube":
            return f"https://www.youtube.com/embed/{video['key']}"

    return None
