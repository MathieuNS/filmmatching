from django.contrib import admin
from django.urls import path, include
from api.views import (
    CreateUserView,
    ActivateAccountView,
    CustomTokenObtainView,
    CurrentUserView,
    UpdateProfileView,
    DeleteAccountView,
    UpdateAvatarView,
    UserSearchView,
    FilmSearchView,
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
    GroupMatchListView,
    PendingFriendRequestCountView,
    UnsubscribeEmailView,
    FriendsLikesView,
    ContactView,
    ForgotPasswordView,
    ResetPasswordView,
    NowPlayingView,
    NowPlayingDetailView,
    NowPlayingSwipeView,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # --- Admin Django ---
    path('filmmatching-secret-admin/', admin.site.urls),

    # --- Authentification ---
    path('api/users/create/', CreateUserView.as_view(), name='create-user'),
    # Activation du compte via le lien reçu par email
    path('api/users/activate/<str:uidb64>/<str:token>/', ActivateAccountView.as_view(), name='activate-account'),
    # Infos de l'utilisateur connecté (pseudo, email)
    path('api/users/me/', CurrentUserView.as_view(), name='current-user'),
    # Modifier le profil (pseudo, email, mot de passe)
    path('api/users/me/update/', UpdateProfileView.as_view(), name='update-profile'),
    # Suppression du compte (irréversible)
    path('api/users/me/delete/', DeleteAccountView.as_view(), name='delete-account'),
    # Changer l'avatar de l'utilisateur connecté
    path('api/users/me/avatar/', UpdateAvatarView.as_view(), name='update-avatar'),
    # Recherche d'un utilisateur par pseudo (pour envoyer une demande d'ami)
    path('api/users/search/', UserSearchView.as_view(), name='user-search'),
    # Désinscription des notifications email (lien dans les emails)
    path('api/users/unsubscribe/<str:uidb64>/', UnsubscribeEmailView.as_view(), name='unsubscribe-email'),
    # Mot de passe oublié : envoie un email avec un lien de réinitialisation
    path('api/users/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    # Réinitialisation du mot de passe via le lien reçu par email
    path('api/users/reset-password/<str:uidb64>/<str:token>/', ResetPasswordView.as_view(), name='reset-password'),
    # Vue personnalisée pour distinguer "compte inactif" de "mauvais identifiants"
    path('api/token/', CustomTokenObtainView.as_view(), name='get_token'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("api-auth/", include("rest_framework.urls")),

    # --- Contact ---
    path('api/contact/', ContactView.as_view(), name='contact'),

    # --- Films ---
    path('api/films/', FilmListCreateView.as_view(), name='film-list-create'),
    # Recherche de films par titre (autocomplétion sur la page Home)
    path('api/films/search/', FilmSearchView.as_view(), name='film-search'),
    path('api/films/random/', RandomFilmView.as_view(), name='film-random'),
    # Films actuellement au cinéma (via TMDB /movie/now_playing)
    path('api/films/now-playing/', NowPlayingView.as_view(), name='film-now-playing'),
    # Détails enrichis d'un film au cinéma (casting + bande-annonce)
    # IMPORTANT : cette route avec <int:tmdb_id> doit être AVANT swipe/
    # sinon Django essaierait d'interpréter "swipe" comme un tmdb_id
    path('api/films/now-playing/swipe/', NowPlayingSwipeView.as_view(), name='film-now-playing-swipe'),
    path('api/films/now-playing/<int:tmdb_id>/', NowPlayingDetailView.as_view(), name='film-now-playing-detail'),

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
    # Nombre de demandes d'ami en attente (pour le badge de notification)
    # IMPORTANT : cette route doit être AVANT les routes avec <int:pk>
    path('api/friends/pending-count/', PendingFriendRequestCountView.as_view(), name='pending-friend-count'),
    # Pour chaque film liké, quels amis l'ont aussi liké
    # IMPORTANT : cette route doit être AVANT les routes avec <int:pk>
    # sinon Django essaierait d'interpréter "common-likes" comme un nombre
    path('api/friends/common-likes/', FriendsLikesView.as_view(), name='friends-common-likes'),
    # Matchs de groupe : films likés en commun avec plusieurs amis (soirée cinéma)
    path('api/friends/group-matches/', GroupMatchListView.as_view(), name='group-match-list'),
    path('api/friends/<int:pk>/accept/', FriendshipAcceptView.as_view(), name='friendship-accept'),
    # Supprimer une amitié ou annuler une demande en attente
    path('api/friends/<int:pk>/delete/', FriendshipDeleteView.as_view(), name='friendship-delete'),
    path('api/friends/<int:pk>/matches/', MatchListView.as_view(), name='match-list'),
]
