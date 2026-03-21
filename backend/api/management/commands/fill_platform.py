"""
Commande Django pour remplir automatiquement les liens des plateformes de streaming.

Usage :
    python manage.py fill_platform_links

Ce script parcourt toutes les plateformes en base de données et leur attribue
une URL d'accueil à partir d'un dictionnaire de correspondances.
Les plateformes "Amazon Channel" sont redirigées vers Amazon Prime Video,
car c'est là qu'on y accède en tant qu'abonné.
"""

import requests
import os
from dotenv import load_dotenv
from django.core.management.base import BaseCommand
from api.models import Plateform

load_dotenv()

TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")
HEADERS = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_ACCESS_TOKEN}",
}


# Dictionnaire de correspondance : tmdb_id → URL d'accueil
# On utilise le tmdb_id (plutôt que le nom) car c'est plus fiable
# et ça évite les problèmes d'accents ou de casse.
PLATFORM_LINKS = {
    # --- Plateformes principales ---
    8: "https://www.netflix.com",
    1796: "https://www.netflix.com",           # Netflix Standard with Ads
    119: "https://www.primevideo.com",          # Amazon Prime Video
    2100: "https://www.primevideo.com",         # Amazon Prime Video with Ads
    337: "https://www.disneyplus.com",          # Disney Plus
    350: "https://tv.apple.com",               # Apple TV
    381: "https://www.canalplus.com",           # Canal+
    345: "https://www.canalplus.com",           # Canal+ Séries
    531: "https://www.paramountplus.com",       # Paramount Plus
    2303: "https://www.paramountplus.com",      # Paramount Plus Premium
    1853: "https://www.paramountplus.com",      # Paramount Plus Apple TV Channel
    1899: "https://www.max.com",               # HBO Max
    283: "https://www.crunchyroll.com",         # Crunchyroll
    11: "https://mubi.com",                    # MUBI
    188: "https://www.youtube.com/premium",     # YouTube Premium
    190: "https://curiositystream.com",         # Curiosity Stream
    223: "https://www.hayu.com",               # Hayu
    444: "https://www.dekkoo.com",             # Dekkoo
    1715: "https://shahid.mbc.net",            # Shahid VIP
    315: "https://www.hoichoi.tv",             # Hoichoi
    464: "https://www.kocowa.com",             # Kocowa
    309: "https://www.sunnxt.com",             # Sun Nxt
    546: "https://www.wowpresentsplus.com",    # WOW Presents Plus
    692: "https://cultpix.com",                 # Cultpix
    551: "https://www.magellantv.com",         # Magellan TV
    475: "https://www.docsville.com",          # DOCSVILLE
    569: "https://dafilms.com",                # DocAlliance Films
    701: "https://www.filmbox.com",            # FilmBox+
    2603: "https://www.kableone.com",          # KableOne
    389: "https://www.sooner.de",              # Sooner
    2563: "https://www.tentkotta.com",         # Tentkotta
    1860: "https://www.univervideo.com",       # Univer Video

    # --- Plateformes françaises ---
    138: "https://www.filmotv.fr",               # FILMO (redirige vers Sooner)
    147: "https://www.6play.fr",               # M6+ (accessible via 6play)
    193: "https://www.sfr.fr/entertainment",   # SFR Play
    239: "https://www.universcine.com",        # Universcine
    310: "https://www.lacinetek.com",          # LaCinetek
    513: "https://www.shadowz.fr",             # Shadowz
    550: "https://www.tenk.fr",                # Tenk
    567: "https://www.truestoryfilms.com",     # True Story
    415: "https://animationdigitalnetwork.fr",   # Animation Digital Network (ADN)
    1754: "https://www.tf1.fr",                # TF1+
    1967: "https://www.molotov.tv",            # Molotov TV
    2555: "https://bloodstreamtv.com/",        # Bloodstream
    608: "https://www.lovenature.com",         # Love Nature (Amazon Channel mais a son propre site)

    # --- Amazon Channels (tous redirigent vers Prime Video) ---
    # Ces plateformes sont des "add-ons" accessibles depuis l'interface
    # d'Amazon Prime Video, donc on redirige vers Prime Video.
    1733: "https://www.primevideo.com",        # Action Max Amazon Channel
    2173: "https://www.primevideo.com",        # Anime Digital Network Amazon Channel
    1738: "https://www.primevideo.com",        # Benshi Amazon Channel
    1887: "https://www.primevideo.com",        # BrutX Amazon Channel
    685: "https://www.primevideo.com",         # Cine+ OCS Amazon Channel
    1968: "https://www.primevideo.com",        # Crunchyroll Amazon Channel
    1734: "https://www.primevideo.com",        # Filmo Amazon Channel
    2535: "https://www.primevideo.com",        # France TV Amazon Channel
    2611: "https://www.primevideo.com",        # Gaumont Amazon Channel
    2558: "https://www.primevideo.com",        # Gullimax Amazon Channel
    2472: "https://www.primevideo.com",        # HBO Max Amazon Channel
    1825: "https://www.primevideo.com",        # HBO Max Amazon Channel (doublon)
    296: "https://www.primevideo.com",         # Hayu Amazon Channel
    1890: "https://www.primevideo.com",        # Hopster Amazon Channel
    1737: "https://www.primevideo.com",        # INA madelen Amazon Channel
    1735: "https://www.primevideo.com",        # Insomnia Amazon Channel
    2358: "https://www.primevideo.com",        # Lionsgate+ Amazon Channels
    588: "https://www.primevideo.com",         # MGM Amazon Channel
    201: "https://www.primevideo.com",         # MUBI Amazon Channel
    2614: "https://www.primevideo.com",        # Outbuster Amazon Channel
    582: "https://www.primevideo.com",         # Paramount+ Amazon Channel
    688: "https://www.primevideo.com",         # ShortsTV Amazon Channel
    1736: "https://www.primevideo.com",        # Shadowz Amazon Channel
    2615: "https://www.primevideo.com",        # TFOU Max Amazon Channel
    1889: "https://www.primevideo.com",        # Universal+ Amazon Channel
    1732: "https://www.primevideo.com",        # Universcine Amazon Channel
}


class Command(BaseCommand):
    """
    Commande de management Django qui remplit le champ 'link' de chaque
    plateforme en base de données.

    Une "commande de management" est un script qu'on lance avec
    python manage.py <nom_de_la_commande>. Django s'occupe de charger
    les modèles et la base de données automatiquement.
    """

    help = "Remplit automatiquement les liens et logos des plateformes de streaming"

    def handle(self, *args, **options):
        """
        Methode principale executee quand on lance la commande.
        1. Remplit les liens d'accueil a partir du dictionnaire PLATFORM_LINKS
        2. Recupere les logos depuis l'API TMDB
        """
        self.fill_links()
        self.fill_logos()

    def fill_links(self):
        """Remplit le champ 'link' de chaque plateforme."""
        updated = 0
        skipped = 0
        not_found = []

        for platform in Plateform.objects.all():
            link = PLATFORM_LINKS.get(platform.tmdb_id)

            if link:
                if platform.link != link:
                    platform.link = link
                    platform.save()
                    updated += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"  OK {platform.plateform} -> {link}")
                    )
                else:
                    skipped += 1
            else:
                not_found.append(platform.plateform)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"OK {updated} plateformes mises a jour"))
        if skipped:
            self.stdout.write(f"  {skipped} deja a jour (ignorees)")
        if not_found:
            self.stdout.write(
                self.style.WARNING(f"ATTENTION {len(not_found)} plateformes sans lien trouve :")
            )
            for name in not_found:
                self.stdout.write(self.style.WARNING(f"  - {name}"))

    def fill_logos(self):
        """
        Recupere les logos des plateformes depuis l'API TMDB.
        L'endpoint /watch/providers/movie retourne toutes les plateformes
        disponibles avec leur logo_path en un seul appel.
        """
        self.stdout.write("")
        self.stdout.write("--- Recuperation des logos depuis TMDB ---")

        # Un seul appel API pour recuperer toutes les plateformes TMDB
        url = "https://api.themoviedb.org/3/watch/providers/movie?language=fr-FR&watch_region=FR"
        response = requests.get(url, headers=HEADERS)
        providers = response.json().get("results", [])

        # On cree un dictionnaire tmdb_id -> logo_path pour un acces rapide
        logo_map = {
            provider["provider_id"]: f"https://image.tmdb.org/t/p/w200{provider['logo_path']}"
            for provider in providers
            if provider.get("logo_path")
        }

        updated = 0
        skipped = 0
        not_found = []

        for platform in Plateform.objects.all():
            logo_url = logo_map.get(platform.tmdb_id)

            if logo_url:
                if platform.logo != logo_url:
                    platform.logo = logo_url
                    platform.save()
                    updated += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"  OK logo {platform.plateform}")
                    )
                else:
                    skipped += 1
            else:
                not_found.append(platform.plateform)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"OK {updated} logos mis a jour"))
        if skipped:
            self.stdout.write(f"  {skipped} deja a jour (ignores)")
        if not_found:
            self.stdout.write(
                self.style.WARNING(f"ATTENTION {len(not_found)} plateformes sans logo trouve :")
            )
            for name in not_found:
                self.stdout.write(self.style.WARNING(f"  - {name}"))
