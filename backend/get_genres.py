import requests
import os
from dotenv import load_dotenv
import django


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import Genres


GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list?language=fr"
GENRES_URL_TV = "https://api.themoviedb.org/3/genre/tv/list?language=fr"

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_ACCESS_TOKEN}"
}

response = requests.get(GENRES_URL_TV, headers=headers).json()

for genre in response["genres"]:
    print(genre["id"], genre["name"])
    Genres.objects.get_or_create(tmdb_id=genre["id"], genre=genre["name"])