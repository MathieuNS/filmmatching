from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Genres, Plateform, Films, Swipe, Friendship, Profile, Casting, Director


# On "désenregistre" le User par défaut pour le ré-enregistrer
# avec notre configuration qui affiche is_active (compte activé ou non).
admin.site.unregister(User)

admin.site.register(Genres)
admin.site.register(Plateform)
admin.site.register(Swipe)
admin.site.register(Friendship)
admin.site.register(Profile)
admin.site.register(Casting)
admin.site.register(Director)

@admin.register(Films)  # Décorateur pour enregistrer Films avec une configuration personnalisée
class FilmsAdmin(admin.ModelAdmin):
    list_display = (
        'title', 
        'type', 
        'release_year', 
        'popularity',
        'director'
        )  # Affiche ces champs dans la liste des films
    search_fields = ('title',)  # Permet de rechercher par titre ou année de sortie
    list_filter = ('type', 'release_year')  # Ajoute des filtres pour le type et l'année de sortie

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Admin personnalisé pour voir si un utilisateur a activé son compte."""
    # Colonnes affichées dans la liste des utilisateurs
    list_display = ('username', 'email', 'is_active', 'date_joined')
    # Filtre dans la barre latérale pour trier actifs/inactifs
    list_filter = ('is_active',)
    # Recherche par nom d'utilisateur ou email
    search_fields = ('username', 'email')