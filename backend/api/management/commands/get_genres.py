"""
Ce module récupère les genres de films et séries depuis l'API TMDB
et les enregistre dans la base de données.
"""

import requests
import os
import logging
from dotenv import load_dotenv

from django.core.management.base import BaseCommand
from api.models import Genres

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")

GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list?language=fr"
GENRES_URL_TV = "https://api.themoviedb.org/3/genre/tv/list?language=fr"
HEADERS = {
            "accept": "application/json",
            "Authorization": f"Bearer {TMDB_ACCESS_TOKEN}"
        }



class Command(BaseCommand):
    help = "Récupère les genres de films et séries depuis TMDB et les enregistre en base de données"

    def handle(self, *args, **options):
        self.stdout.write("=== Début de la récupération des genres depuis TMDB ===")

        # Compteur pour le résumé final
        total_nouveaux = 0
        total_existants = 0

        response_tv = requests.get(GENRES_URL_TV, headers=HEADERS).json()
        response_films = requests.get(GENRES_URL, headers=HEADERS).json()

        for genre in response_tv["genres"]:
            _, created = Genres.objects.get_or_create(tmdb_id=genre["id"], genre=genre["name"])
            if created:
                total_nouveaux += 1
                self.stdout.write("Nouveau genre TV ajoute : %s (id=%d)" % (genre["name"], genre["id"]))
            else:
                total_existants += 1


        for genre_film in response_films["genres"]:
            _, created = Genres.objects.get_or_create(tmdb_id=genre_film["id"], genre=genre_film["name"])
            if created:
                total_nouveaux += 1
                self.stdout.write("Nouveau genre film ajoute : %s (id=%d)" % (genre_film["name"], genre_film["id"]))
            else:
                total_existants += 1

        self.stdout.write(
            "=== Genres termine -- %d nouveaux genres, %d deja existants ===" % (total_nouveaux, total_existants)
        )
