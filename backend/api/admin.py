from django.contrib import admin
from .models import Genres, Plateform, Films, Swipe, Friendship

# admin.site.register() rend un modèle visible et éditable
# dans le panneau d'administration Django (accessible via /admin/).
# C'est très utile pour ajouter des films à la main, voir les swipes, etc.

admin.site.register(Genres)
admin.site.register(Plateform)
admin.site.register(Films)
admin.site.register(Swipe)
admin.site.register(Friendship)
