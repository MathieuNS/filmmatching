from django.contrib import admin
from django.urls import path, include
from api.views import (
    CreateUserView,
    CurrentUserView,
    DeleteAccountView,
    UserSearchView,
    FilmListCreateView,
    RandomFilmView,
    GenreListView,
    PlateformListView,
    SwipeCreateView,
    SwipeUpdateView,
    UserSwipeListView,
    FriendshipView,
    FriendshipAcceptView,
    FriendshipDeleteView,
    MatchListView,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # --- Admin Django ---
    path('admin/', admin.site.urls),

    # --- Authentification ---
    path('api/users/create/', CreateUserView.as_view(), name='create-user'),
    # Infos de l'utilisateur connecté (pseudo, email)
    path('api/users/me/', CurrentUserView.as_view(), name='current-user'),
    # Suppression du compte (irréversible)
    path('api/users/me/delete/', DeleteAccountView.as_view(), name='delete-account'),
    # Recherche d'un utilisateur par pseudo (pour envoyer une demande d'ami)
    path('api/users/search/', UserSearchView.as_view(), name='user-search'),
    path('api/token/', TokenObtainPairView.as_view(), name='get_token'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("api-auth/", include("rest_framework.urls")),

    # --- Films ---
    path('api/films/', FilmListCreateView.as_view(), name='film-list-create'),
    path('api/films/random/', RandomFilmView.as_view(), name='film-random'),

    # --- Genres et Plateformes (pour les filtres) ---
    path('api/genres/', GenreListView.as_view(), name='genre-list'),
    path('api/platforms/', PlateformListView.as_view(), name='platform-list'),

    # --- Swipes (like/dislike/déjà vu) ---
    path('api/swipes/', SwipeCreateView.as_view(), name='swipe-create'),
    path('api/swipes/list/', UserSwipeListView.as_view(), name='swipe-list'),
    # PATCH pour modifier le statut d'un swipe (ex: like → seen)
    path('api/swipes/<int:pk>/', SwipeUpdateView.as_view(), name='swipe-update'),

    # --- Amitiés ---
    path('api/friends/', FriendshipView.as_view(), name='friendship-list-create'),
    path('api/friends/<int:pk>/accept/', FriendshipAcceptView.as_view(), name='friendship-accept'),
    # Supprimer une amitié ou annuler une demande en attente
    path('api/friends/<int:pk>/delete/', FriendshipDeleteView.as_view(), name='friendship-delete'),
    path('api/friends/<int:pk>/matches/', MatchListView.as_view(), name='match-list'),
]
