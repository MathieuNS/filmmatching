"""
Ce module récupère les genres de films et séries depuis l'API TMDB
et les enregistre dans la base de données.
"""

import requests
import os
import logging
from dotenv import load_dotenv
import django
import time

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import Films

load_dotenv()
TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")

# On récupère le logger "scripts" configuré dans settings.py.
logger = logging.getLogger("scripts")

all_movies = Films.objects.filter(type="Film")
all_series = Films.objects.filter(type="Série")

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_ACCESS_TOKEN}"
}

# Print iterations progress
def printProgressBar (iteration, total, prefix = '', suffix = '', decimals = 1, length = 100, fill = '█', printEnd = "\r"):
    """
    Call in a loop to create terminal progress bar
    @params:
        iteration   - Required  : current iteration (Int)
        total       - Required  : total iterations (Int)
        prefix      - Optional  : prefix string (Str)
        suffix      - Optional  : suffix string (Str)
        decimals    - Optional  : positive number of decimals in percent complete (Int)
        length      - Optional  : character length of bar (Int)
        fill        - Optional  : bar fill character (Str)
        printEnd    - Optional  : end character (e.g. "\r", "\r\n") (Str)
    """
    percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total)))
    filledLength = int(length * iteration // total)
    bar = fill * filledLength + '-' * (length - filledLength)
    print(f'\r{prefix} |{bar}| {percent}% {suffix}', end = printEnd)
    # Print New Line on Complete
    if iteration == total: 
        print()


logger.info("=== Début de la récupération des trailers des films depuis TMDB ===")

len_movies = len(all_movies)

printProgressBar(0, len_movies, prefix = 'Progress:', suffix = 'Complete', length = 50)
for i, movie in enumerate(all_movies):
    url = f"https://api.themoviedb.org/3/movie/{movie.tmdb_id}/videos"
    response = requests.get(url, headers=headers).json()["results"]

    if response:
        trailer_key = [trailer["key"] for trailer in response if ("Trailer" in trailer["name"]) and (trailer["site"] == "YouTube")]
        embedded_url = f"https://www.youtube.com/embed/{trailer_key[0]}" if trailer_key else None

        movie.trailer_url = embedded_url
        movie.save()
        time.sleep(0.1)
        printProgressBar(i + 1, len_movies, prefix = 'Progress:', suffix = 'Complete', length = 50)


logger.info("=== Début de la récupération des trailers des séries depuis TMDB ===")

len_series = len(all_series)
printProgressBar(0, len_series, prefix = 'Progress:', suffix = 'Complete', length = 50)
for i, serie in enumerate(all_series):
    url = f"https://api.themoviedb.org/3/tv/{serie.tmdb_id}/videos"
    response = requests.get(url, headers=headers).json()["results"]

    if response:
        trailer_key = [trailer["key"] for trailer in response if ("Trailer" in trailer["name"]) and (trailer["site"] == "YouTube")]
        embedded_url = f"https://www.youtube.com/embed/{trailer_key[0]}" if trailer_key else None

        serie.trailer_url = embedded_url
        serie.save()
        time.sleep(0.1)
        printProgressBar(i + 1, len_series, prefix = 'Progress:', suffix = 'Complete', length = 50)
        