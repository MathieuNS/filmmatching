"""
Ce module récupère les genres de films et séries depuis l'API TMDB
et les enregistre dans la base de données.
"""

import requests
import os
import logging
from dotenv import load_dotenv
import django


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import Genres

# On récupère le logger "scripts" configuré dans settings.py.
logger = logging.getLogger("scripts")

GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list?language=fr"
GENRES_URL_TV = "https://api.themoviedb.org/3/genre/tv/list?language=fr"

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_ACCESS_TOKEN}"
}

logger.info("=== Début de la récupération des genres depuis TMDB ===")

# Compteur pour le résumé final
total_nouveaux = 0
total_existants = 0

response_tv = requests.get(GENRES_URL_TV, headers=headers).json()
response_films = requests.get(GENRES_URL, headers=headers).json()

for genre in response_tv["genres"]:
    _, created = Genres.objects.get_or_create(tmdb_id=genre["id"], genre=genre["name"])
    if created:
        total_nouveaux += 1
        logger.debug("Nouveau genre TV ajouté : %s (id=%d)", genre["name"], genre["id"])
    else:
        total_existants += 1


for genre_film in response_films["genres"]:
    _, created = Genres.objects.get_or_create(tmdb_id=genre_film["id"], genre=genre_film["name"])
    if created:
        total_nouveaux += 1
        logger.debug("Nouveau genre film ajouté : %s (id=%d)", genre_film["name"], genre_film["id"])
    else:
        total_existants += 1

logger.info(
    "=== Genres terminé — %d nouveaux genres, %d déjà existants ===",
    total_nouveaux, total_existants
)
