from django.contrib import admin
from django.urls import path, include
from api.views import CreateUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/create/', CreateUserView.as_view(), name='create-user'),
    path('api/token/', TokenObtainPairView.as_view(), name='get_token'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("api-auth/", include("rest_framework.urls")),
]
