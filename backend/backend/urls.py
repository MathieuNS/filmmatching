from django.contrib import admin
from django.urls import path, include
from api.views import (
    CreateUserView,
    FilmListCreateView,
    RandomFilmView,
    SwipeCreateView,
    UserSwipeListView,
    FriendshipView,
    FriendshipAcceptView,
    MatchListView,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # --- Admin Django ---
    path('admin/', admin.site.urls),

    # --- Authentification ---
    path('api/users/create/', CreateUserView.as_view(), name='create-user'),
    path('api/token/', TokenObtainPairView.as_view(), name='get_token'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("api-auth/", include("rest_framework.urls")),

    # --- Films ---
    path('api/films/', FilmListCreateView.as_view(), name='film-list-create'),
    path('api/films/random/', RandomFilmView.as_view(), name='film-random'),

    # --- Swipes (like/dislike/déjà vu) ---
    path('api/swipes/', SwipeCreateView.as_view(), name='swipe-create'),
    path('api/swipes/list/', UserSwipeListView.as_view(), name='swipe-list'),

    # --- Amitiés ---
    path('api/friends/', FriendshipView.as_view(), name='friendship-list-create'),
    path('api/friends/<int:pk>/accept/', FriendshipAcceptView.as_view(), name='friendship-accept'),
    path('api/friends/<int:pk>/matches/', MatchListView.as_view(), name='match-list'),
]
