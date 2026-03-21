import os
import logging
import requests as http_requests
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework import generics, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Films, Genres, Plateform, Casting, Director, Swipe, Friendship, Profile, AVATAR_CHOICES
from .serializers import (
    UserSerializer,
    UpdateProfileSerializer,
    FilmsSerializer,
    GenreSerializer,
    PlateformSerializer,
    SwipeSerializer,
    SwipeDetailSerializer,
    FriendshipSerializer,
)

# On crée un logger pour ce fichier.
# __name__ vaut "api.views", ce qui correspond au logger "api" configuré
# dans settings.py. Tous les messages envoyés à ce logger iront
# dans la console ET dans les fichiers logs/app.log et logs/errors.log.
logger = logging.getLogger(__name__)


class CreateUserView(generics.CreateAPIView):
    """
    Vue pour créer un nouveau compte utilisateur.

    - Endpoint : POST /api/users/create/
    - Accessible sans être connecté (AllowAny) car on ne peut pas
      demander à quelqu'un de se connecter avant de créer son compte.

    À la création, le compte est inactif (is_active=False).
    Un email de confirmation est envoyé avec un lien d'activation.
    L'utilisateur doit cliquer sur ce lien pour activer son compte
    et pouvoir se connecter.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    # authentication_classes = [] désactive complètement l'authentification
    # pour cette vue. Sans ça, si un token JWT expiré traîne dans localStorage,
    # l'intercepteur Axios l'envoie → simplejwt le rejette avec 401
    # AVANT même de vérifier AllowAny. En vidant authentication_classes,
    # Django ignore le header Authorization et laisse passer la requête.
    authentication_classes = []

    def perform_create(self, serializer):
        """
        Appelée automatiquement après la validation des données.

        1. Crée l'utilisateur avec is_active=False (compte désactivé)
        2. Génère un token unique via default_token_generator
        3. Envoie un email avec le lien d'activation

        default_token_generator crée un token basé sur l'état de l'utilisateur
        (son ID, is_active, last_login). Dès que is_active change (activation),
        le token devient invalide automatiquement — pas besoin de le stocker en BDD.
        """
        # Créer l'utilisateur avec le compte désactivé
        # Le Profile est créé automatiquement par le signal post_save (voir signals.py)
        user = serializer.save(is_active=False)

        # Mettre à jour la préférence de notifications email
        # La valeur vient du formulaire d'inscription (checkbox)
        # On utilise self.request.data car email_notifications n'est pas
        # un champ du modèle User (il est sur le Profile)
        if self.request.data.get('email_notifications'):
            user.profile.email_notifications = True
            user.profile.save()

        logger.info("Nouveau compte créé : %s (email: %s)", user.username, user.email)

        # Générer le token d'activation
        # urlsafe_base64_encode encode l'ID en base64 pour pouvoir le mettre dans une URL
        # force_bytes convertit l'ID (entier) en bytes, nécessaire pour l'encodage
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Construire le lien d'activation
        # Le lien pointe vers le frontend qui appellera ensuite l'API d'activation
        # L'URL du frontend est lue depuis le .env pour pouvoir changer entre
        # dev (localhost:5173) et production (filmmatching.com) sans modifier le code
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        activation_link = f"{frontend_url}/activate/{uid}/{token}"
        # Lien de désinscription des notifications email
        unsubscribe_link = f"{frontend_url}/unsubscribe/{uid}"

        # Envoyer l'email de confirmation
        logger.info("Envoi de l'email d'activation à %s", user.email)

        # Version texte brut (affichée si le client email ne supporte pas le HTML)
        text_message = (
            f"Salut {user.username} !\n\n"
            f"Bienvenue sur FilmMatching !\n\n"
            f"FilmMatching, c'est comme Tinder mais pour les films : "
            f"swipe les films et séries que tu aimes, connecte-toi avec "
            f"tes amis et découvre vos goûts en commun.\n\n"
            f"Clique sur ce lien pour activer ton compte :\n"
            f"{activation_link}\n\n"
            f"Ce lien est à usage unique.\n\n"
            f"À bientôt sur FilmMatching !\n\n"
            f"---\n"
            f"Se désinscrire des notifications email : {unsubscribe_link}"
        )

        # Version HTML stylisée de l'email
        # IMPORTANT pour les emails HTML :
        # - Pas de linear-gradient : non supporté par Gmail, Outlook, etc.
        #   → On utilise des couleurs unies (background-color) à la place.
        # - Pas de CSS externe ni de <style> : ignorés par les clients email.
        #   → Tout le style est en inline (attribut style="").
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0; padding:0; background-color:#0D0D0F; font-family:Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D0F; padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#16161A; border-radius:20px; overflow:hidden;">

                  <!-- En-tête avec emoji et nom de l'app -->
                  <tr>
                    <td align="center" style="background-color:#16161A; padding:32px 20px 24px;">
                      <h1 style="margin:0; font-size:28px; color:#FF4D6A; font-weight:700;">
                        &#127916; FilmMatching
                      </h1>
                    </td>
                  </tr>

                  <!-- Corps du message -->
                  <tr>
                    <td style="padding:32px 28px;">
                      <h2 style="margin:0 0 16px; font-size:20px; color:#F0EEF2;">
                        Salut {user.username} !
                      </h2>
                      <p style="margin:0 0 20px; font-size:15px; color:#8B8B9E; line-height:1.6;">
                        Bienvenue sur <strong style="color:#F0EEF2;">FilmMatching</strong> !
                        Swipe les films et séries que tu aimes, connecte-toi
                        avec tes amis et découvre vos goûts en commun.
                        Fini les soirées à scroller sans savoir quoi regarder !
                      </p>

                      <!-- Bouton d'activation -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding:8px 0 24px;">
                            <a href="{activation_link}"
                               style="display:inline-block; padding:14px 36px; background-color:#7B5CFF; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; border-radius:14px;">
                              Activer mon compte
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 8px; font-size:13px; color:#8B8B9E; line-height:1.5;">
                        Ce lien est à usage unique. Si le bouton ne fonctionne pas,
                        copie-colle ce lien dans ton navigateur :
                      </p>
                      <p style="margin:0; font-size:12px; color:#7B5CFF; word-break:break-all;">
                        {activation_link}
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding:20px 28px; border-top:1px solid #2A2A32;">
                      <p style="margin:0 0 8px; font-size:12px; color:#8B8B9E;">
                        &copy; FilmMatching — Tu reçois cet email car un compte
                        a été créé avec cette adresse.
                      </p>
                      <p style="margin:0; font-size:11px; color:#8B8B9E;">
                        Se désinscrire des notifications email :
                        <a href="{unsubscribe_link}" style="color:#7B5CFF; text-decoration:underline;">
                          Unsubscribe
                        </a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        # send_mail avec html_message : Django envoie les DEUX versions
        # (texte brut + HTML). Le client email du destinataire choisit
        # automatiquement la version qu'il peut afficher.
        send_mail(
            subject="Confirme ton compte FilmMatching 🎬",
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )


class ActivateAccountView(APIView):
    """
    Active le compte d'un utilisateur via le lien reçu par email.

    - GET /api/users/activate/<uid>/<token>/
    - Accessible sans être connecté (AllowAny).

    Le lien contient deux informations :
    - uid : l'ID de l'utilisateur encodé en base64
    - token : un token généré par default_token_generator

    Le token est valide une seule fois : dès que is_active passe à True,
    le token est automatiquement invalidé (car default_token_generator
    utilise is_active dans son calcul).
    """

    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        """
        Vérifie le token et active le compte.

        Args:
            uidb64: L'ID de l'utilisateur encodé en base64
            token: Le token de confirmation généré à l'inscription
        """
        try:
            # Décoder l'ID : base64 → bytes → string
            # force_str convertit les bytes en string Python
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            # Si l'ID est invalide ou l'utilisateur n'existe pas
            logger.warning("Tentative d'activation avec un lien invalide (uid: %s)", uidb64)
            return Response(
                {"error": "Lien d'activation invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que le token est valide pour cet utilisateur
        # check_token() recalcule le token attendu et le compare
        if default_token_generator.check_token(user, token):
            # Activer le compte
            user.is_active = True
            user.save()
            logger.info("Compte activé : %s", user.username)
            return Response(
                {"message": "Ton compte a été activé avec succès ! Tu peux maintenant te connecter."},
                status=status.HTTP_200_OK,
            )
        else:
            # Token invalide (déjà utilisé, expiré, ou falsifié)
            logger.warning("Token d'activation expiré/invalide pour %s", user.username)
            return Response(
                {"error": "Ce lien d'activation a expiré ou a déjà été utilisé."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CustomTokenObtainView(APIView):
    """
    Vue de connexion personnalisée qui remplace TokenObtainPairView.

    - POST /api/token/
    - Body : { "username": "alice", "password": "motdepasse" }

    Pourquoi remplacer la vue par défaut de simplejwt ?
    Parce que TokenObtainPairView renvoie toujours un 401 générique
    ("No active account found...") que le compte soit inactif ou que
    les identifiants soient faux. On veut distinguer les deux cas
    pour afficher un message utile à l'utilisateur.

    Logique :
    1. Vérifier si le pseudo existe en BDD
    2. Si oui, vérifier si le compte est actif (is_active)
    3. Si actif, vérifier le mot de passe avec authenticate()
    4. Générer et renvoyer les tokens JWT
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        """Authentifie l'utilisateur et renvoie les tokens JWT."""
        # Le champ "username" peut contenir un pseudo OU un email.
        # On détecte lequel c'est grâce au caractère "@".
        login = request.data.get("username")
        password = request.data.get("password")

        if not login or not password:
            return Response(
                {"error": "Le pseudo/email et le mot de passe sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Étape 1 : vérifier si l'utilisateur existe (par pseudo ou par email)
        # Si le champ contient un "@", on cherche par email.
        # Sinon, on cherche par pseudo.
        try:
            if "@" in login:
                user = User.objects.get(email=login)
            else:
                user = User.objects.get(username=login)
        except User.DoesNotExist:
            logger.warning("Tentative de connexion avec un identifiant inexistant : %s", login)
            return Response(
                {"error": "Identifiants incorrects."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Étape 2 : vérifier si le compte est activé
        if not user.is_active:
            logger.warning("Connexion refusée (compte inactif) : %s", login)
            return Response(
                {"error": "Vous devez activer votre compte pour vous connecter. Vérifiez votre boîte mail."},
                # 403 Forbidden : le serveur comprend la requête mais refuse
                # de l'exécuter (contrairement à 401 qui signifie "non identifié")
                status=status.HTTP_403_FORBIDDEN,
            )

        # Étape 3 : vérifier le mot de passe
        # authenticate() attend toujours le username (pas l'email),
        # donc on utilise user.username qu'on a trouvé à l'étape 1
        authenticated_user = authenticate(username=user.username, password=password)
        if authenticated_user is None:
            logger.warning("Échec de connexion (mauvais mot de passe) : %s", login)
            return Response(
                {"error": "Identifiants incorrects."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Étape 4 : générer les tokens JWT
        # RefreshToken.for_user() crée un refresh token lié à cet utilisateur
        # .access_token génère le token d'accès correspondant
        refresh = RefreshToken.for_user(authenticated_user)
        logger.info("Connexion réussie : %s", user.username)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        })


class CurrentUserView(APIView):
    """
    Renvoie les informations de l'utilisateur connecté.

    - GET /api/users/me/
    - Accessible uniquement aux utilisateurs connectés (IsAuthenticated).

    request.user est automatiquement rempli par Django grâce au token JWT
    envoyé dans le header Authorization. On n'a pas besoin de passer l'ID
    de l'utilisateur dans l'URL : le token suffit pour savoir qui il est.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Renvoie le pseudo et l'email de l'utilisateur connecté."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UpdateProfileView(APIView):
    """
    Modifie le profil de l'utilisateur connecté (pseudo, email, mot de passe).

    - PATCH /api/users/me/update/
    - Accessible uniquement aux utilisateurs connectés (IsAuthenticated).

    On utilise PATCH (et non PUT) car l'utilisateur peut ne modifier
    qu'un seul champ à la fois. PATCH = mise à jour partielle.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        """
        Met à jour les champs envoyés dans la requête.

        Le serializer valide les données (unicité du pseudo/email,
        correspondance des mots de passe), puis on applique les
        modifications sur l'objet User.

        Args:
            request: La requête HTTP contenant les champs à modifier

        Returns:
            Les données mises à jour de l'utilisateur (pseudo, email, avatar)
        """
        # On passe request dans le context pour que le serializer puisse
        # accéder à request.user (nécessaire pour les vérifications d'unicité)
        serializer = UpdateProfileSerializer(
            data=request.data,
            context={'request': request}
        )
        # raise_exception=True fait que DRF renvoie automatiquement
        # une réponse 400 avec les erreurs si la validation échoue
        serializer.is_valid(raise_exception=True)

        user = request.user
        validated = serializer.validated_data

        # On ne modifie que les champs qui ont été envoyés
        if 'username' in validated:
            user.username = validated['username']
        if 'email' in validated:
            user.email = validated['email']
        if 'password' in validated:
            # set_password() hash le mot de passe avant de le stocker
            # Ne JAMAIS faire user.password = "..." directement,
            # sinon le mot de passe serait en clair dans la BDD
            user.set_password(validated['password'])

        user.save()

        # Mise à jour de la préférence de notifications email sur le Profile
        if 'email_notifications' in validated:
            user.profile.email_notifications = validated['email_notifications']
            user.profile.save()
        logger.info("Profil mis à jour : %s (champs: %s)", user.username, list(validated.keys()))

        # On renvoie les données mises à jour avec UserSerializer
        # pour que le frontend puisse mettre à jour son state
        return Response(UserSerializer(user).data)


class DeleteAccountView(APIView):
    """
    Supprime le compte de l'utilisateur connecté.

    - DELETE /api/users/me/delete/
    - Accessible uniquement aux utilisateurs connectés.

    Attention : cette action est irréversible !
    Toutes les données liées à l'utilisateur (swipes, amitiés, etc.)
    seront aussi supprimées grâce au CASCADE de Django.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Supprime définitivement le compte de l'utilisateur connecté."""
        user = request.user
        username = user.username
        # .delete() supprime l'utilisateur et toutes ses données liées
        # (swipes, amitiés, etc.) grâce aux relations CASCADE en BDD.
        user.delete()
        logger.info("Compte supprimé : %s", username)
        return Response(
            {"message": "Compte supprimé avec succès."},
            status=status.HTTP_204_NO_CONTENT,
        )


class UpdateAvatarView(APIView):
    """
    Met à jour l'avatar de l'utilisateur connecté.

    - PATCH /api/users/me/avatar/
    - Body : { "avatar": "avatar-camera.svg" }

    Le frontend envoie le nom du fichier SVG correspondant
    à l'avatar choisi par l'utilisateur. On vérifie que ce nom
    fait bien partie des avatars disponibles (AVATAR_CHOICES)
    pour éviter d'injecter une valeur invalide en BDD.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        """Change l'avatar de l'utilisateur connecté."""
        # On récupère le nom d'avatar envoyé par le frontend
        avatar = request.data.get('avatar')

        if not avatar:
            return Response(
                {"error": "Le champ 'avatar' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que l'avatar fait partie des choix valides
        # [c[0] for c in AVATAR_CHOICES] extrait les noms de fichiers
        # ex: ["avatar-camera.svg", "avatar-clapperboard.svg", ...]
        valid_avatars = [c[0] for c in AVATAR_CHOICES]
        if avatar not in valid_avatars:
            return Response(
                {"error": f"Avatar invalide. Choix possibles : {valid_avatars}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mettre à jour le profil de l'utilisateur
        profile = request.user.profile
        profile.avatar = avatar
        profile.save()

        return Response({"avatar": profile.avatar})


class UserSearchView(APIView):
    """
    Recherche des utilisateurs par pseudo (partiel ou exact).

    - GET /api/users/search/?q=ali  → liste jusqu'à 8 utilisateurs dont le pseudo contient "ali"
    - Accessible uniquement aux utilisateurs connectés.

    Utilisé par la page "Amis" pour l'autocomplétion :
    l'utilisateur tape quelques lettres et voit une liste de suggestions.

    icontains = "case-insensitive contains" → "ali" trouve "Alice", "Alicia", "Malik"...
    On limite à 8 résultats pour garder la liste courte et rapide.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Cherche des utilisateurs dont le pseudo contient la query.

        Renvoie une liste d'objets { id, username, avatar } pour
        afficher les suggestions avec l'avatar dans le frontend.
        """
        # request.query_params.get('q') récupère la valeur du paramètre ?q= dans l'URL
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response(
                {"error": "Le paramètre 'q' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # On exclut l'utilisateur connecté (on ne peut pas s'ajouter soi-même)
        # icontains = "case-insensitive contains" → recherche partielle
        # select_related('profile') charge le profil en une seule requête SQL
        # [:8] limite les résultats à 8 (équivalent de LIMIT 8 en SQL)
        users = User.objects.filter(
            username__icontains=query
        ).exclude(
            id=request.user.id
        ).select_related('profile')[:8]

        # On construit la liste de résultats avec l'avatar de chaque utilisateur
        results = []
        for user in users:
            profile = getattr(user, 'profile', None)
            avatar_name = profile.avatar if profile else 'avatar-popcorn.svg'
            results.append({
                "id": user.id,
                "username": user.username,
                "avatar": avatar_name,
            })

        return Response(results)


class GenreListView(generics.ListAPIView):
    """
    Liste tous les genres disponibles, triés par ordre alphabétique.

    - GET /api/genres/
    - Accessible uniquement aux utilisateurs connectés.

    Cette vue est utilisée par le frontend pour afficher la liste
    des genres dans le bottom sheet de filtres.
    """

    queryset = Genres.objects.all().order_by('genre')
    serializer_class = GenreSerializer
    permission_classes = [IsAuthenticated]


class PlateformListView(generics.ListAPIView):
    """
    Liste toutes les plateformes disponibles, triées par ordre alphabétique.

    - GET /api/platforms/
    - Accessible uniquement aux utilisateurs connectés.

    Cette vue est utilisée par le frontend pour afficher la liste
    des plateformes dans le bottom sheet de filtres.
    """

    queryset = Plateform.objects.all().order_by('plateform')
    serializer_class = PlateformSerializer
    permission_classes = [IsAuthenticated]


class FilmSearchView(APIView):
    """
    Recherche de films par titre (partiel ou exact).

    - GET /api/films/search/?q=incep  → liste jusqu'à 8 films dont le titre contient "incep"
    - Accessible uniquement aux utilisateurs connectés.

    Utilisé par la page Home pour chercher un film précis à swiper.
    L'utilisateur tape quelques lettres et voit des suggestions.

    icontains = "case-insensitive contains" → "incep" trouve "Inception", "INCEPTION"...
    On limite à 8 résultats pour garder la liste courte et rapide.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Cherche des films dont le titre contient la query.

        Renvoie une liste sérialisée avec tous les champs du film
        (titre, image, genres, etc.) pour l'affichage et le swipe.
        """
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response(
                {"error": "Le paramètre 'q' doit contenir au moins 2 caractères."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # title__icontains : recherche partielle insensible à la casse
        # [:8] limite à 8 résultats (LIMIT 8 en SQL)
        films = Films.objects.filter(
            title__icontains=query
        )[:8]

        # On utilise le FilmsSerializer pour renvoyer tous les champs du film
        serializer = FilmsSerializer(films, many=True)
        return Response(serializer.data)


class FilmListCreateView(generics.ListCreateAPIView):
    """
    Vue pour lister tous les films et en ajouter de nouveaux.

    - GET /api/films/  → renvoie la liste complète des films
    - POST /api/films/ → crée un nouveau film dans la BDD

    'queryset' indique à Django quels objets cette vue peut manipuler.
    Sans queryset, Django ne sait pas dans quelle table chercher
    et renvoie une erreur.
    """

    queryset = Films.objects.all()
    serializer_class = FilmsSerializer
    permission_classes = [IsAuthenticated]


class RandomFilmView(APIView):
    """
    Renvoie UN film aléatoire que l'utilisateur n'a pas encore swipé.

    C'est la vue principale de la page d'accueil :
    elle choisit un film au hasard parmi ceux que l'utilisateur
    n'a ni liké, ni disliké, ni marqué "déjà vu".

    - GET /api/films/random/

    Logique :
    1. On récupère les IDs de tous les films déjà swipés par l'utilisateur
    2. On exclut ces films de la liste complète
    3. On en prend un au hasard avec order_by('?')
    4. S'il n'y en a plus, on renvoie 204 (No Content)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Renvoie un film non encore swipé par l'utilisateur, trié par popularité.

        Paramètre optionnel :
        - ?exclude=5,12 → exclut en plus les films avec ces IDs.
          Utile pour pré-charger le film suivant sans recevoir celui
          qui est déjà affiché à l'écran.
        """

        # values_list('film_id', flat=True) renvoie une simple liste d'IDs
        # exemple : [3, 7, 12] (les IDs des films déjà swipés)
        swiped_film_ids = Swipe.objects.filter(
            user=request.user
        ).values_list('film_id', flat=True)

        # On construit le queryset de base : tous les films non swipés
        queryset = Films.objects.exclude(id__in=swiped_film_ids)

        # Si le paramètre ?exclude= est présent, on exclut aussi ces IDs.
        # Exemple : ?exclude=5,12 → on retire les films 5 et 12 du résultat.
        # Le frontend utilise ça pour demander le "prochain" film
        # sans recevoir celui qui est déjà affiché.
        exclude_param = request.query_params.get('exclude')
        if exclude_param:
            # split(',') transforme "5,12" en ["5", "12"]
            # int() convertit chaque string en nombre
            exclude_ids = [int(id) for id in exclude_param.split(',') if id.isdigit()]
            queryset = queryset.exclude(id__in=exclude_ids)

        # --- Filtres optionnels ---
        # Ces filtres permettent à l'utilisateur de ne voir que certains types
        # de contenus. Chaque filtre est optionnel : s'il n'est pas dans l'URL,
        # on ne filtre pas sur ce critère.

        # Filtre par type : ?type=Film ou ?type=Serie
        type_param = request.query_params.get('type')
        if type_param:
            queryset = queryset.filter(type=type_param)

        # Filtre par genres : ?genres=Action,Comédie
        # On sépare les noms par virgule, puis on filtre les films
        # qui ont AU MOINS un de ces genres.
        # .distinct() évite les doublons quand un film a plusieurs genres correspondants.
        genres_param = request.query_params.get('genres')
        if genres_param:
            genre_list = [g.strip() for g in genres_param.split(',') if g.strip()]
            queryset = queryset.filter(genres__genre__in=genre_list).distinct()

        # Filtre par plateformes : ?plateforms=Netflix,Disney+
        # Même logique que pour les genres.
        plateforms_param = request.query_params.get('plateforms')
        if plateforms_param:
            plateform_list = [p.strip() for p in plateforms_param.split(',') if p.strip()]
            queryset = queryset.filter(plateforms__plateform__in=plateform_list).distinct()

        # Filtre par année : ?year_min=2020&year_max=2024
        # __gte = "greater than or equal" (supérieur ou égal)
        # __lte = "less than or equal" (inférieur ou égal)
        year_min = request.query_params.get('year_min')
        if year_min and year_min.isdigit():
            queryset = queryset.filter(release_year__gte=int(year_min))

        year_max = request.query_params.get('year_max')
        if year_max and year_max.isdigit():
            queryset = queryset.filter(release_year__lte=int(year_max))

        # order_by('-popularity') trie par popularité décroissante :
        # le film le plus populaire non encore swipé apparaît en premier.
        # Le signe "-" devant "popularity" signifie "décroissant" (du plus grand au plus petit).
        # .first() prend le premier résultat (donc le plus populaire)
        film = queryset.order_by('-popularity').first()

        if film is None:
            # Plus aucun film à proposer : on renvoie 204 (No Content)
            # Le frontend pourra afficher "Tu as tout vu !"
            return Response(status=status.HTTP_204_NO_CONTENT)

        # On sérialise le film (on le convertit en JSON) et on le renvoie
        serializer = FilmsSerializer(film)
        return Response(serializer.data)


class SwipeCreateView(generics.CreateAPIView):
    """
    Enregistre un swipe (like, dislike ou déjà vu).

    - POST /api/swipes/
    - Body : { "film": 5, "status": "like" }

    Le champ 'user' n'est pas dans le body : il est rempli automatiquement
    avec l'utilisateur connecté grâce à perform_create().

    Si le swipe est un "like", la réponse inclut la liste des amis
    qui ont aussi liké ce film (pour déclencher une animation de match).
    Exemple de réponse pour un like avec matchs :
    { "id": 1, "film": 5, "status": "like", "matched_friends": [
        {"username": "Alice", "avatar": "avatar-camera.svg"}
    ]}
    """

    serializer_class = SwipeSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """
        perform_create() est appelée automatiquement par Django REST
        juste avant de sauvegarder l'objet en BDD.
        On en profite pour injecter l'utilisateur connecté.
        """
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Surcharge de create() pour gérer deux cas :
        1. Le film n'a jamais été swipé → on crée un nouveau swipe (cas normal)
        2. Le film a déjà été swipé → on met à jour le statut existant
           (cas de la recherche : l'utilisateur retrouve un film déjà swipé
           et veut changer son avis, par ex. passer de "like" à "seen")

        Si le swipe est un "like", la réponse inclut aussi les matchs d'amis.
        """
        user = request.user
        film_id = request.data.get('film')
        new_status = request.data.get('status')
        new_rating = request.data.get('rating')

        # Vérifier si un swipe existe déjà pour ce film
        existing_swipe = Swipe.objects.filter(user=user, film_id=film_id).first()

        if existing_swipe:
            # Le swipe existe déjà → on met à jour le statut
            existing_swipe.status = new_status
            # La note n'est valable que pour "seen", sinon on la retire
            existing_swipe.rating = new_rating if new_status == 'seen' else None
            existing_swipe.save()
            logger.info("Swipe mis à jour : %s - film %s (%s)", user.username, film_id, new_status)
            # On sérialise le swipe mis à jour pour la réponse
            response_data = SwipeSerializer(existing_swipe).data
            response = Response(response_data, status=status.HTTP_200_OK)
        else:
            # Pas de swipe existant → création normale
            response = super().create(request, *args, **kwargs)
        if not existing_swipe:
            logger.info("Swipe : %s - film %s (%s)", user.username, film_id, new_status)

        # Si c'est un "like", on cherche les amis qui ont aussi liké ce film
        if new_status == 'like':

            # Récupérer tous les amis confirmés
            friendships = Friendship.objects.filter(
                Q(sender=user) | Q(receiver=user),
                accepted=True,
            )
            friends = [
                f.receiver if f.sender == user else f.sender
                for f in friendships
            ]

            # Chercher lesquels ont aussi liké ce film
            matched_swipes = Swipe.objects.filter(
                user__in=friends,
                film_id=film_id,
                status='like',
            ).select_related('user', 'user__profile')

            matched_friends = []
            for swipe in matched_swipes:
                profile = getattr(swipe.user, 'profile', None)
                avatar_name = profile.avatar if profile else 'avatar-popcorn.svg'
                matched_friends.append({
                    'username': swipe.user.username,
                    'avatar': avatar_name,
                })

            # Ajouter la liste dans la réponse
            response.data['matched_friends'] = matched_friends

            # Logger les matchs trouvés
            if matched_friends:
                friend_names = [f['username'] for f in matched_friends]
                logger.info("Match trouvé ! %s et %s ont liké le film %s", request.user.username, friend_names, film_id)

        return response


class UserSwipeListView(generics.ListAPIView):
    """
    Liste les films swipés par l'utilisateur connecté,
    filtrés par statut (like, dislike ou seen).

    - GET /api/swipes/list/              → tous les swipes de l'utilisateur
    - GET /api/swipes/list/?status=like  → seulement les films likés

    Le paramètre 'status' est passé dans l'URL (query parameter).

    Utilise SwipeDetailSerializer pour inclure les données complètes du film
    (titre, image, genres, etc.) au lieu de juste l'ID.
    """

    serializer_class = SwipeDetailSerializer
    permission_classes = [IsAuthenticated]
    # Désactive la pagination pour renvoyer TOUS les swipes d'un coup.
    # Sans ça, DRF pourrait limiter le nombre de résultats si une pagination
    # par défaut est configurée dans settings.py.
    pagination_class = None

    def get_queryset(self):
        """
        get_queryset() est la méthode que Django appelle pour savoir
        quels objets renvoyer. On la personnalise pour filtrer
        par utilisateur et éventuellement par statut.

        select_related('film') charge le film en 1 requête (JOIN SQL).
        prefetch_related charge les relations ManyToMany (genres, plateformes,
        acteurs) en requêtes séparées mais optimisées (pas 1 requête par film).
        """
        # On ne renvoie que les swipes de l'utilisateur connecté
        queryset = Swipe.objects.filter(
            user=self.request.user
        ).select_related('film', 'film__director').prefetch_related(
            'film__genres', 'film__plateforms', 'film__main_actors'
        )

        # self.request.query_params contient les paramètres de l'URL
        # Exemple : pour /api/swipes/list/?status=like, query_params = {'status': 'like'}
        swipe_status = self.request.query_params.get('status')
        if swipe_status:
            queryset = queryset.filter(status=swipe_status)

        return queryset


class SwipeUpdateView(generics.UpdateAPIView):
    """
    Met à jour le statut d'un swipe existant.

    - PATCH /api/swipes/<id>/
    - Body : { "status": "seen" }

    Permet à l'utilisateur de changer le statut d'un film.
    Par exemple : un film liké qu'il vient de voir → passer en "seen".

    Sécurité : on filtre le queryset pour que l'utilisateur ne puisse
    modifier que SES propres swipes (pas ceux des autres).
    """

    serializer_class = SwipeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Ne renvoie que les swipes de l'utilisateur connecté.
        Comme ça, si quelqu'un essaie de modifier le swipe d'un autre
        utilisateur, Django renverra 404 (introuvable).
        """
        return Swipe.objects.filter(user=self.request.user)


class UnsubscribeEmailView(APIView):
    """
    Désabonne un utilisateur des notifications email.

    - POST /api/users/unsubscribe/<uidb64>/
    - Accessible sans authentification (le lien est dans l'email).

    L'uid est encodé en base64 dans le lien de désinscription.
    On le décode pour retrouver l'utilisateur et mettre
    email_notifications à False sur son Profile.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, uidb64):
        """Désactive les notifications email pour l'utilisateur identifié par l'uid."""
        try:
            # Décoder l'uid base64 pour retrouver l'ID de l'utilisateur
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Lien de désinscription invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Désactiver les notifications email
        user.profile.email_notifications = False
        user.profile.save()
        logger.info("Désinscription email : %s", user.username)

        return Response({"message": "Tu ne recevras plus de notifications par email."})


class PendingFriendRequestCountView(APIView):
    """
    Renvoie le nombre de demandes d'ami reçues en attente.

    - GET /api/friends/pending-count/
    - Réponse : { "count": 3 }

    Endpoint léger utilisé par la page Home pour afficher
    un badge de notification sur le menu hamburger.
    On ne compte que les demandes REÇUES (receiver=user)
    et non acceptées (accepted=False).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Compte les demandes d'ami reçues en attente."""
        count = Friendship.objects.filter(
            receiver=request.user,
            accepted=False,
        ).count()
        return Response({"count": count})


class FriendshipView(generics.ListCreateAPIView):
    """
    Gère les amitiés : lister ses amis et envoyer des demandes.

    - GET  /api/friends/  → liste toutes les amitiés (envoyées et reçues)
    - POST /api/friends/  → envoie une demande d'ami
      Body : { "receiver": 3 }  (l'ID de l'utilisateur à ajouter)

    Q() est un objet Django qui permet de combiner des filtres avec OR (|).
    Sans Q(), on ne peut utiliser que AND entre les filtres.
    """

    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Renvoie toutes les amitiés où l'utilisateur connecté
        est soit l'envoyeur (sender) soit le receveur (receiver).
        """
        user = self.request.user
        # Q(sender=user) | Q(receiver=user) signifie :
        # "où sender est l'utilisateur OU receiver est l'utilisateur"
        return Friendship.objects.filter(Q(sender=user) | Q(receiver=user))

    def perform_create(self, serializer):
        """
        Enregistre la demande d'ami avec l'utilisateur connecté comme sender.

        Avant de créer, on vérifie que :
        1. L'utilisateur ne s'envoie pas une demande à lui-même
        2. Il n'existe pas déjà une relation entre ces deux utilisateurs
           (dans un sens ou dans l'autre, qu'elle soit acceptée ou en attente)
        """
        user = self.request.user
        receiver = serializer.validated_data.get('receiver')

        # Empêcher de s'ajouter soi-même
        if receiver == user:
            raise serializers.ValidationError(
                {"error": "Tu ne peux pas t'ajouter toi-même en ami."}
            )

        # Vérifier si une relation existe déjà (dans les deux sens)
        # Q(sender=user, receiver=receiver) → j'ai déjà envoyé une demande
        # Q(sender=receiver, receiver=user) → il m'a déjà envoyé une demande
        existing = Friendship.objects.filter(
            Q(sender=user, receiver=receiver) | Q(sender=receiver, receiver=user)
        ).first()

        if existing:
            if existing.accepted:
                # Déjà amis confirmés
                raise serializers.ValidationError(
                    {"error": "Vous êtes déjà amis !"}
                )
            else:
                # Demande en attente
                raise serializers.ValidationError(
                    {"error": "Une demande d'ami est déjà en cours avec cet utilisateur."}
                )

        serializer.save(sender=user)
        logger.info("Demande d'ami envoyée : %s → %s", user.username, receiver.username)

        # Envoyer un email de notification au receiver s'il a activé les notifications
        if hasattr(receiver, 'profile') and receiver.profile.email_notifications:
            self._send_friend_request_email(sender=user, receiver=receiver)

    def _send_friend_request_email(self, sender, receiver):
        """
        Envoie un email au receiver pour l'informer d'une nouvelle demande d'ami.

        Le design de l'email reprend le même template que l'email d'activation
        (fond sombre, carte arrondie, bouton CTA violet).

        Args:
            sender: L'utilisateur qui envoie la demande
            receiver: L'utilisateur qui reçoit la demande
        """
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        friends_link = f"{frontend_url}/amis"

        # Lien de désinscription — contient l'uid encodé en base64
        # pour identifier l'utilisateur sans qu'il soit connecté
        uid = urlsafe_base64_encode(force_bytes(receiver.pk))
        unsubscribe_link = f"{frontend_url}/unsubscribe/{uid}"

        # Version texte brut
        text_message = (
            f"Salut {receiver.username} !\n\n"
            f"{sender.username} t'a envoyé une demande d'ami sur FilmMatching !\n\n"
            f"Connecte-toi pour accepter sa demande :\n"
            f"{friends_link}\n\n"
            f"À bientôt sur FilmMatching !\n\n"
            f"---\n"
            f"Se désinscrire des notifications email : {unsubscribe_link}"
        )

        # Version HTML
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0; padding:0; background-color:#0D0D0F; font-family:Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D0F; padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#16161A; border-radius:20px; overflow:hidden;">

                  <!-- En-tête -->
                  <tr>
                    <td align="center" style="background-color:#16161A; padding:32px 20px 24px;">
                      <h1 style="margin:0; font-size:28px; color:#FF4D6A; font-weight:700;">
                        &#127916; FilmMatching
                      </h1>
                    </td>
                  </tr>

                  <!-- Corps du message -->
                  <tr>
                    <td style="padding:32px 28px;">
                      <h2 style="margin:0 0 16px; font-size:20px; color:#F0EEF2;">
                        Salut {receiver.username} !
                      </h2>
                      <p style="margin:0 0 20px; font-size:15px; color:#8B8B9E; line-height:1.6;">
                        <strong style="color:#F0EEF2;">{sender.username}</strong>
                        t'a envoyé une demande d'ami sur FilmMatching !
                        Accepte sa demande pour découvrir vos films en commun.
                      </p>

                      <!-- Bouton CTA -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding:8px 0 24px;">
                            <a href="{friends_link}"
                               style="display:inline-block; padding:14px 36px; background-color:#7B5CFF; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; border-radius:14px;">
                              Voir la demande
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding:20px 28px; border-top:1px solid #2A2A32;">
                      <p style="margin:0 0 8px; font-size:12px; color:#8B8B9E;">
                        &copy; FilmMatching
                      </p>
                      <p style="margin:0; font-size:11px; color:#8B8B9E;">
                        Se désinscrire des notifications email :
                        <a href="{unsubscribe_link}" style="color:#7B5CFF; text-decoration:underline;">
                          Unsubscribe
                        </a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        try:
            send_mail(
                subject=f"{sender.username} t'a envoyé une demande d'ami 👥",
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[receiver.email],
                html_message=html_message,
            )
            logger.info("Email de demande d'ami envoyé à %s", receiver.email)
        except Exception as e:
            # On ne fait pas planter la demande d'ami si l'email échoue
            logger.error("Erreur envoi email demande d'ami à %s : %s", receiver.email, e)


class FriendshipAcceptView(APIView):
    """
    Accepte une demande d'ami.

    - PATCH /api/friends/<id>/accept/

    Seul le receiver (celui qui a reçu la demande) peut l'accepter.
    Le sender ne peut pas accepter sa propre demande.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        pk = "primary key", c'est l'ID de la demande d'amitié
        passé dans l'URL. Exemple : /api/friends/7/accept/ → pk=7
        """
        try:
            # On cherche la demande d'amitié avec cet ID
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {"error": "Demande d'ami introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Vérifier que c'est bien le receiver qui accepte
        if friendship.receiver != request.user:
            return Response(
                {"error": "Seul le destinataire peut accepter cette demande."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # On passe accepted à True et on sauvegarde
        friendship.accepted = True
        friendship.save()
        logger.info("Demande d'ami acceptée : %s ↔ %s", friendship.sender.username, friendship.receiver.username)
        serializer = FriendshipSerializer(friendship)
        return Response(serializer.data)


class FriendshipDeleteView(APIView):
    """
    Supprime une amitié ou annule une demande d'ami.

    - DELETE /api/friends/<id>/delete/

    Les deux utilisateurs concernés (sender et receiver) peuvent
    supprimer la relation. Que ce soit une demande en attente ou
    une amitié confirmée, la ligne est supprimée de la BDD.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        """Supprime la relation d'amitié si l'utilisateur en fait partie."""
        try:
            friendship = Friendship.objects.get(pk=pk)
        except Friendship.DoesNotExist:
            return Response(
                {"error": "Amitié introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Vérifier que l'utilisateur fait partie de cette amitié
        # (on ne peut pas supprimer l'amitié de quelqu'un d'autre)
        if request.user != friendship.sender and request.user != friendship.receiver:
            return Response(
                {"error": "Vous ne faites pas partie de cette amitié."},
                status=status.HTTP_403_FORBIDDEN,
            )

        friendship.delete()
        logger.info("Amitié supprimée : %s ↔ %s (par %s)", friendship.sender.username, friendship.receiver.username, request.user.username)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MatchListView(APIView):
    """
    Renvoie les films likés en commun entre l'utilisateur connecté
    et un de ses amis.

    - GET /api/friends/<id>/matches/

    <id> est l'ID de la relation d'amitié (pas l'ID de l'ami).

    Logique :
    1. Vérifier que l'amitié existe et est acceptée
    2. Déterminer qui est "l'autre" utilisateur dans la relation
    3. Trouver les films likés par les deux
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """Renvoie la liste des films matchés avec un ami."""
        try:
            friendship = Friendship.objects.get(pk=pk, accepted=True)
        except Friendship.DoesNotExist:
            return Response(
                {"error": "Amitié introuvable ou pas encore acceptée."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Vérifier que l'utilisateur fait partie de cette amitié
        user = request.user
        if user != friendship.sender and user != friendship.receiver:
            return Response(
                {"error": "Vous ne faites pas partie de cette amitié."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Déterminer qui est l'ami (l'autre personne dans la relation)
        friend = friendship.receiver if user == friendship.sender else friendship.sender

        # Trouver les IDs de films likés par l'utilisateur connecté
        my_liked_films = Swipe.objects.filter(
            user=user, status='like'
        ).values_list('film_id', flat=True)

        # Parmi ceux-là, garder seulement ceux que l'ami a aussi likés
        # C'est l'intersection des deux ensembles de likes = les matchs !
        matched_films = Films.objects.filter(
            id__in=my_liked_films,                         # Films que j'ai likés
            swipes__user=friend, swipes__status='like'     # ET que l'ami a aussi likés
        )

        serializer = FilmsSerializer(matched_films, many=True)
        return Response(serializer.data)


class GroupMatchListView(APIView):
    """
    Renvoie les films likés en commun entre l'utilisateur connecté
    et PLUSIEURS amis (mode "soirée cinéma").

    - GET /api/friends/group-matches/?ids=12,34,56

    Le paramètre "ids" contient les IDs des relations d'amitié
    (les mêmes IDs qu'on utilise pour /api/friends/<id>/matches/).

    Logique :
    1. Vérifier que chaque amitié existe, est acceptée, et inclut le user
    2. Récupérer la liste d'amis correspondants
    3. Calculer l'intersection : les films likés par le user ET par TOUS les amis

    Renvoie aussi la liste des noms/avatars des amis sélectionnés
    pour l'affichage dans le header de la page.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Renvoie les films matchés avec un groupe d'amis."""
        user = request.user

        # Récupérer les IDs depuis le query param "ids" (ex: "12,34,56")
        ids_param = request.query_params.get("ids", "")
        if not ids_param:
            return Response(
                {"error": "Le paramètre 'ids' est requis (ex: ?ids=12,34,56)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Convertir la chaîne "12,34,56" en liste d'entiers [12, 34, 56]
        try:
            friendship_ids = [int(x) for x in ids_param.split(",") if x]
        except ValueError:
            return Response(
                {"error": "Les IDs doivent être des nombres séparés par des virgules."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(friendship_ids) == 0:
            return Response(
                {"error": "Au moins un ID d'amitié est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier chaque amitié et récupérer les amis
        friends = []
        friends_info = []  # Pour renvoyer les noms/avatars au frontend

        for fid in friendship_ids:
            try:
                friendship = Friendship.objects.select_related(
                    "sender", "sender__profile", "receiver", "receiver__profile"
                ).get(pk=fid, accepted=True)
            except Friendship.DoesNotExist:
                return Response(
                    {"error": f"Amitié {fid} introuvable ou pas encore acceptée."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Vérifier que le user fait partie de cette amitié
            if user != friendship.sender and user != friendship.receiver:
                return Response(
                    {"error": f"Vous ne faites pas partie de l'amitié {fid}."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Déterminer qui est l'ami (l'autre personne)
            friend = friendship.receiver if user == friendship.sender else friendship.sender
            friends.append(friend)

            # Récupérer l'avatar via le profil (ou un avatar par défaut)
            avatar = "avatar-popcorn.svg"
            if hasattr(friend, "profile") and friend.profile.avatar:
                avatar = friend.profile.avatar

            friends_info.append({
                "username": friend.username,
                "avatar": avatar,
            })

        # Calculer l'intersection des likes
        # On part des films likés par le user connecté
        matched_film_ids = set(
            Swipe.objects.filter(
                user=user, status="like"
            ).values_list("film_id", flat=True)
        )

        # Pour chaque ami, on fait l'intersection avec ses likes
        # À la fin, il ne reste que les films likés par TOUT LE MONDE
        for friend in friends:
            friend_likes = set(
                Swipe.objects.filter(
                    user=friend, status="like"
                ).values_list("film_id", flat=True)
            )
            matched_film_ids &= friend_likes  # &= est l'intersection de sets

        # Récupérer les objets Films correspondants
        matched_films = Films.objects.filter(id__in=matched_film_ids)

        serializer = FilmsSerializer(matched_films, many=True)
        return Response({
            "films": serializer.data,
            "friends": friends_info,
        })


class ForgotPasswordView(APIView):
    """
    Envoie un email de réinitialisation de mot de passe.

    - POST /api/users/forgot-password/
    - Body : { "email": "alice@mail.com" }
    - Accessible sans être connecté (AllowAny).

    Fonctionnement :
    1. On cherche un utilisateur avec cet email en BDD
    2. Si trouvé, on génère un token unique (comme pour l'activation)
       et on envoie un email avec un lien de réinitialisation
    3. Si non trouvé, on renvoie quand même un 200 pour ne pas révéler
       si un email existe ou non dans la base (sécurité)

    Le token est généré par default_token_generator, qui utilise
    le mot de passe hashé dans son calcul. Dès que le mot de passe
    change, le token devient automatiquement invalide — donc le lien
    ne peut être utilisé qu'une seule fois.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        """Cherche l'utilisateur par email et envoie le lien de réinitialisation."""
        email = request.data.get("email", "").strip()

        if not email:
            return Response(
                {"error": "L'adresse email est requise."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # On cherche l'utilisateur avec cet email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # On ne dit PAS que l'email n'existe pas (sécurité)
            # Un attaquant ne doit pas pouvoir deviner quels emails sont inscrits
            return Response(
                {"message": "Si cette adresse existe, un email de réinitialisation a été envoyé."},
                status=status.HTTP_200_OK,
            )

        # Générer le token et l'uid encodé en base64
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Construire le lien vers la page frontend de réinitialisation
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/reset-password/{uid}/{token}"

        # Envoyer l'email
        logger.info("Demande de réinitialisation de mot de passe pour : %s", user.username)
        send_mail(
            subject="Réinitialise ton mot de passe FilmMatching",
            message=(
                f"Salut {user.username} !\n\n"
                f"Tu as demandé à réinitialiser ton mot de passe.\n"
                f"Clique sur ce lien pour choisir un nouveau mot de passe :\n\n"
                f"{reset_link}\n\n"
                f"Si tu n'es pas à l'origine de cette demande, ignore cet email.\n"
                f"Ton mot de passe actuel ne sera pas modifié.\n\n"
                f"À bientôt sur FilmMatching !"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response(
            {"message": "Si cette adresse existe, un email de réinitialisation a été envoyé."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """
    Réinitialise le mot de passe d'un utilisateur via le lien reçu par email.

    - POST /api/users/reset-password/<uid>/<token>/
    - Body : { "password": "nouveau_mot_de_passe" }
    - Accessible sans être connecté (AllowAny).

    Le lien contient :
    - uid : l'ID de l'utilisateur encodé en base64
    - token : un token généré par default_token_generator

    Le token est basé sur le mot de passe hashé actuel.
    Dès que set_password() change le hash, le token est invalidé
    automatiquement — le lien ne peut donc être utilisé qu'une fois.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, uidb64, token):
        """Vérifie le token et met à jour le mot de passe."""
        # Décoder l'uid pour retrouver l'utilisateur
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Lien de réinitialisation invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que le token est valide
        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "Ce lien a expiré ou a déjà été utilisé."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Récupérer le nouveau mot de passe
        password = request.data.get("password", "").strip()
        if not password:
            return Response(
                {"error": "Le nouveau mot de passe est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # set_password() hash le mot de passe avant de le stocker
        # (ne jamais stocker un mot de passe en clair !)
        user.set_password(password)
        user.save()
        logger.info("Mot de passe réinitialisé pour : %s", user.username)

        return Response(
            {"message": "Ton mot de passe a été modifié avec succès !"},
            status=status.HTTP_200_OK,
        )


class ContactView(APIView):
    """
    Reçoit un message depuis le formulaire de contact et l'envoie par email.

    - POST /api/contact/
    - Body : { "name": "Alice", "email": "alice@mail.com", "subject": "Question", "message": "..." }
    - Accessible sans être connecté (AllowAny) car un visiteur
      non inscrit doit aussi pouvoir nous contacter.

    L'email est envoyé à contact@filmmatching.com via le serveur SMTP
    configuré dans settings.py. L'adresse de l'expéditeur affichée
    est celle du site (DEFAULT_FROM_EMAIL), et on ajoute un header
    Reply-To avec l'email du visiteur pour pouvoir lui répondre facilement.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        """Valide les champs du formulaire et envoie l'email."""
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip()
        subject = request.data.get("subject", "").strip()
        message = request.data.get("message", "").strip()

        # Vérifier que tous les champs obligatoires sont remplis
        if not name or not email or not subject or not message:
            return Response(
                {"error": "Tous les champs sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Construire le contenu de l'email envoyé à l'équipe
        full_message = (
            f"Nouveau message depuis le formulaire de contact :\n\n"
            f"Nom : {name}\n"
            f"Email : {email}\n"
            f"Sujet : {subject}\n\n"
            f"Message :\n{message}"
        )

        try:
            send_mail(
                subject=f"[Contact FilmMatching] {subject}",
                message=full_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=["contact@filmmatching.com"],
                fail_silently=False,
            )
        except Exception:
            logger.error("Échec d'envoi du formulaire de contact de %s (%s)", name, email, exc_info=True)
            return Response(
                {"error": "Une erreur est survenue lors de l'envoi. Réessaie plus tard."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        logger.info("Message de contact reçu de %s (%s) — sujet : %s", name, email, subject)
        return Response(
            {"message": "Ton message a bien été envoyé ! Nous te répondrons rapidement."},
            status=status.HTTP_200_OK,
        )


class FriendsLikesView(APIView):
    """
    Pour chaque film liké par l'utilisateur, renvoie la liste des amis
    qui ont aussi liké ce film.

    - GET /api/friends/common-likes/

    Le résultat est un objet où chaque clé est un ID de film,
    et la valeur est la liste des amis (username + avatar) qui l'ont aussi liké.

    Exemple de réponse :
    {
      "42": [{"username": "Alice", "avatar": "avatar-camera.svg"}, ...],
      "87": [{"username": "Alice", "avatar": "avatar-camera.svg"}],
    }

    Seuls les films qui ont au moins 1 ami en commun sont inclus
    dans la réponse (pour ne pas renvoyer des centaines de clés vides).

    Logique :
    1. Récupérer tous les amis confirmés de l'utilisateur
    2. Récupérer les films likés par l'utilisateur
    3. Pour chaque film, vérifier quels amis l'ont aussi liké
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Renvoie un dictionnaire { film_id: [{username, avatar}, ...] }."""
        user = request.user

        # Étape 1 : récupérer tous les amis confirmés
        # Q(sender=user) | Q(receiver=user) = toutes les amitiés de l'utilisateur
        # accepted=True = seulement les amitiés confirmées
        friendships = Friendship.objects.filter(
            Q(sender=user) | Q(receiver=user),
            accepted=True,
        )

        # Construire la liste des User amis (l'autre personne dans chaque relation)
        friends = []
        for f in friendships:
            friends.append(f.receiver if f.sender == user else f.sender)

        # Si l'utilisateur n'a pas d'amis, on renvoie un objet vide
        if not friends:
            return Response({})

        # Étape 2 : récupérer les IDs des films likés par l'utilisateur
        my_liked_film_ids = set(
            Swipe.objects.filter(user=user, status='like')
            .values_list('film_id', flat=True)
        )

        # Étape 3 : récupérer tous les likes de tous les amis
        # en une seule requête pour être performant.
        # On ne garde que les films que l'utilisateur a aussi likés (film_id__in=...)
        # select_related('user__profile') charge le profil en même temps
        # pour éviter une requête SQL supplémentaire par ami (N+1)
        friend_likes = Swipe.objects.filter(
            user__in=friends,
            status='like',
            film_id__in=my_liked_film_ids,
        ).select_related('user', 'user__profile')

        # Étape 4 : construire le dictionnaire { film_id: [{username, avatar}, ...] }
        result = {}
        for swipe in friend_likes:
            film_id_str = str(swipe.film_id)
            if film_id_str not in result:
                result[film_id_str] = []
            # On récupère l'avatar depuis le profil de l'ami
            avatar = getattr(swipe.user, 'profile', None)
            avatar_name = avatar.avatar if avatar else 'avatar-popcorn.svg'
            result[film_id_str].append({
                'username': swipe.user.username,
                'avatar': avatar_name,
            })

        return Response(result)


# --- Token TMDB pour les appels API ---
# On le charge une seule fois au démarrage du module (pas à chaque requête).
TMDB_ACCESS_TOKEN = os.getenv("TMDB_ACCESS_TOKEN")
TMDB_HEADERS = {
    'accept': 'application/json',
    'Authorization': f'Bearer {TMDB_ACCESS_TOKEN}',
}


class NowPlayingView(APIView):
    """
    Renvoie les films actuellement au cinéma en France.

    - GET /api/films/now-playing/
    - GET /api/films/now-playing/?page=2

    Appelle l'API TMDB /movie/now_playing avec region=FR.
    Pour chaque film, on vérifie si l'utilisateur connecté l'a déjà
    swipé (like, dislike ou seen) pour afficher un indicateur côté frontend.

    La réponse inclut :
    - results : la liste des films avec leurs infos TMDB + user_status
    - page : la page actuelle
    - total_pages : le nombre total de pages disponibles
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupère les films au cinéma depuis TMDB et enrichit avec le statut utilisateur."""
        page = request.query_params.get("page", "1")

        # Appel à l'API TMDB — /movie/now_playing renvoie les films
        # actuellement en salle dans la région spécifiée (FR = France).
        tmdb_url = (
            f"https://api.themoviedb.org/3/movie/now_playing"
            f"?language=fr-FR&region=FR&page={page}"
        )
        tmdb_response = http_requests.get(tmdb_url, headers=TMDB_HEADERS)

        if tmdb_response.status_code != 200:
            logger.error("Erreur TMDB now_playing : %s", tmdb_response.text)
            return Response(
                {"error": "Impossible de récupérer les films à l'affiche."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        tmdb_data = tmdb_response.json()

        # Récupérer les films TMDB qui existent déjà dans notre base.
        # Pour ceux-là, on a déjà toutes les infos (casting, réalisateur,
        # bande-annonce, plateformes) → pas besoin d'appeler TMDB au clic.
        tmdb_ids = [film["id"] for film in tmdb_data.get("results", [])]
        existing_films = Films.objects.filter(
            tmdb_id__in=tmdb_ids, type="Film"
        ).select_related("director").prefetch_related(
            "main_actors", "genres", "plateforms"
        )
        # Dictionnaire { tmdb_id: objet Films } pour accès rapide
        existing_by_tmdb = {film.tmdb_id: film for film in existing_films}

        # Récupérer les swipes de l'utilisateur pour les films en base
        film_ids = [f.id for f in existing_films]
        user_swipes = {}
        if film_ids:
            swipes = Swipe.objects.filter(
                user=request.user, film_id__in=film_ids
            ).values_list("film_id", "status")
            user_swipes = {film_id: swipe_status for film_id, swipe_status in swipes}

        # Récupérer les noms des genres TMDB depuis notre base
        # (pour les films PAS encore en base, on a besoin de convertir les IDs)
        all_genre_ids = set()
        for film in tmdb_data.get("results", []):
            all_genre_ids.update(film.get("genre_ids", []))
        genres_map = dict(
            Genres.objects.filter(tmdb_id__in=all_genre_ids).values_list("tmdb_id", "genre")
        )

        # Construire la liste de résultats enrichie
        results = []
        for film in tmdb_data.get("results", []):
            if not film.get("poster_path"):
                continue

            db_film = existing_by_tmdb.get(film["id"])

            if db_film:
                # Le film existe en base → on renvoie les infos complètes
                # directement, sans appel TMDB supplémentaire au clic.
                user_status = user_swipes.get(db_film.id)
                results.append({
                    "tmdb_id": film["id"],
                    "title": db_film.title,
                    "img": db_film.img,
                    "synopsis": db_film.synopsis,
                    "release_year": db_film.release_year,
                    "genres": [g.genre for g in db_film.genres.all()],
                    "vote_average": film.get("vote_average", 0),
                    "user_status": user_status,
                    # Infos enrichies déjà disponibles
                    "director": str(db_film.director) if db_film.director else None,
                    "main_actors": [str(a) for a in db_film.main_actors.all()],
                    "trailer_url": db_film.trailer_url,
                    "plateforms": [
                        {"tmdb_id": p.tmdb_id, "plateform": p.plateform, "logo": p.logo, "link": p.link}
                        for p in db_film.plateforms.all()
                    ],
                    # Indique au frontend que les détails sont déjà complets
                    "has_details": True,
                })
            else:
                # Film pas encore en base → infos de base TMDB uniquement,
                # les détails seront chargés au clic via NowPlayingDetailView.
                genre_names = [
                    genres_map[gid] for gid in film.get("genre_ids", [])
                    if gid in genres_map
                ]
                results.append({
                    "tmdb_id": film["id"],
                    "title": film.get("title", ""),
                    "img": f"https://image.tmdb.org/t/p/w500{film['poster_path']}",
                    "synopsis": film.get("overview", ""),
                    "release_year": film.get("release_date", "")[:4] if film.get("release_date") else "",
                    "genres": genre_names,
                    "vote_average": film.get("vote_average", 0),
                    "user_status": None,
                    "has_details": False,
                })

        return Response({
            "results": results,
            "page": tmdb_data.get("page", 1),
            "total_pages": tmdb_data.get("total_pages", 1),
        })


class NowPlayingDetailView(APIView):
    """
    Renvoie les détails enrichis d'un film au cinéma (casting, réalisateur, bande-annonce).

    - GET /api/films/now-playing/<tmdb_id>/

    Appelle 2 endpoints TMDB à la volée :
    - /movie/{id}/credits → 5 acteurs principaux + réalisateur
    - /movie/{id}/videos → bande-annonce YouTube

    Ces appels ne sont faits que quand l'utilisateur clique sur un film,
    pas pour toute la liste (ce qui serait trop lent : 20 films × 2 appels).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, tmdb_id):
        """
        Récupère le casting et la bande-annonce d'un film.

        Vérifie d'abord si le film existe en base de données.
        Si oui, renvoie les infos directement (0 appel TMDB).
        Si non, appelle TMDB credits + videos à la volée.
        """
        # --- Étape 1 : Chercher le film en base ---
        db_film = Films.objects.filter(
            tmdb_id=tmdb_id, type="Film"
        ).select_related("director").prefetch_related("main_actors").first()

        if db_film:
            # Le film existe en base → on renvoie les infos sans appeler TMDB
            return Response({
                "tmdb_id": tmdb_id,
                "main_actors": [str(a) for a in db_film.main_actors.all()],
                "director": str(db_film.director) if db_film.director else None,
                "trailer_url": db_film.trailer_url,
            })

        # --- Étape 2 : Film pas en base → appeler TMDB ---
        try:
            # Casting (acteurs + réalisateur)
            credits_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/credits?language=fr-FR"
            credits_res = http_requests.get(credits_url, headers=TMDB_HEADERS)
            credits_data = credits_res.json() if credits_res.status_code == 200 else {}

            # 5 acteurs les plus populaires
            actors = credits_data.get("cast", [])
            nb_actors = min(5, len(actors))
            popular_actors = sorted(
                actors, key=lambda x: x.get("popularity", 0), reverse=True
            )[:nb_actors]
            actor_names = [a["name"] for a in popular_actors]

            # Réalisateur : premier membre d'équipe avec job="Director"
            director_name = None
            for crew_member in credits_data.get("crew", []):
                if crew_member.get("job") == "Director":
                    director_name = crew_member["name"]
                    break

            # Bande-annonce YouTube
            videos_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/videos"
            videos_res = http_requests.get(videos_url, headers=TMDB_HEADERS)
            videos_data = videos_res.json().get("results", []) if videos_res.status_code == 200 else []

            trailer_url = None
            for video in videos_data:
                if "Trailer" in video.get("name", "") and video.get("site") == "YouTube":
                    trailer_url = f"https://www.youtube.com/embed/{video['key']}"
                    break

            return Response({
                "tmdb_id": tmdb_id,
                "main_actors": actor_names,
                "director": director_name,
                "trailer_url": trailer_url,
            })

        except Exception as e:
            logger.error("Erreur détails TMDB pour tmdb_id=%s : %s", tmdb_id, e)
            return Response(
                {"error": "Impossible de récupérer les détails du film."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class NowPlayingSwipeView(APIView):
    """
    Enregistre un swipe sur un film au cinéma.

    - POST /api/films/now-playing/swipe/
    - Body : { "tmdb_id": 12345, "status": "like" }

    Si le film n'existe pas encore dans notre base, il est créé
    automatiquement avec un enrichissement à la volée :
    - Casting (5 acteurs principaux + réalisateur)
    - Plateformes de streaming (si disponibles)
    - Bande-annonce YouTube (si disponible)

    Contrairement à get_films qui ignore les films sans plateforme,
    ici on crée le film même sans plateforme car il est au cinéma.

    Après la création/récupération du film, le swipe est enregistré
    avec la même logique que SwipeCreateView (détection de matchs incluse).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Crée le film en base si nécessaire, puis enregistre le swipe."""
        tmdb_id = request.data.get("tmdb_id")
        swipe_status = request.data.get("status")

        # Validation des données reçues
        if not tmdb_id or not swipe_status:
            return Response(
                {"error": "Les champs 'tmdb_id' et 'status' sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if swipe_status not in ("like", "dislike", "seen"):
            return Response(
                {"error": "Le statut doit être 'like', 'dislike' ou 'seen'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Étape 1 : Chercher le film dans notre base par tmdb_id + type="Film"
        film = Films.objects.filter(tmdb_id=tmdb_id, type="Film").first()

        # Étape 2 : Si le film n'existe pas, le créer avec enrichissement
        if not film:
            film = self._create_film_from_tmdb(tmdb_id)
            if not film:
                return Response(
                    {"error": "Impossible de récupérer les informations du film depuis TMDB."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        # Étape 3 : Enregistrer le swipe (ou mettre à jour s'il existe déjà)
        user = request.user
        existing_swipe = Swipe.objects.filter(user=user, film=film).first()

        if existing_swipe:
            # Le swipe existe déjà → on met à jour le statut
            existing_swipe.status = swipe_status
            existing_swipe.rating = None  # Pas de note depuis cette page
            existing_swipe.save()
            logger.info(
                "Swipe mis à jour (cinéma) : %s - %s (%s)",
                user.username, film.title, swipe_status
            )
            response_data = SwipeSerializer(existing_swipe).data
        else:
            # Nouveau swipe
            swipe = Swipe.objects.create(user=user, film=film, status=swipe_status)
            logger.info(
                "Swipe (cinéma) : %s - %s (%s)",
                user.username, film.title, swipe_status
            )
            response_data = SwipeSerializer(swipe).data

        # Étape 4 : Si c'est un "like", chercher les matchs avec les amis
        # (même logique que SwipeCreateView)
        matched_friends = []
        if swipe_status == "like":
            friendships = Friendship.objects.filter(
                Q(sender=user) | Q(receiver=user),
                accepted=True,
            )
            friends = [
                f.receiver if f.sender == user else f.sender
                for f in friendships
            ]
            matched_swipes = Swipe.objects.filter(
                user__in=friends,
                film=film,
                status="like",
            ).select_related("user", "user__profile")

            for swipe_obj in matched_swipes:
                profile = getattr(swipe_obj.user, "profile", None)
                avatar_name = profile.avatar if profile else "avatar-popcorn.svg"
                matched_friends.append({
                    "username": swipe_obj.user.username,
                    "avatar": avatar_name,
                })

            if matched_friends:
                friend_names = [f["username"] for f in matched_friends]
                logger.info(
                    "Match trouvé (cinéma) ! %s et %s ont liké %s",
                    user.username, friend_names, film.title
                )

        response_data["matched_friends"] = matched_friends
        return Response(response_data, status=status.HTTP_200_OK)

    def _create_film_from_tmdb(self, tmdb_id):
        """
        Crée un film en base à partir de son ID TMDB, avec enrichissement complet.

        Fait 4 appels à l'API TMDB :
        1. /movie/{id} → titre, poster, synopsis, date, genres, popularité
        2. /movie/{id}/credits → casting (5 acteurs) + réalisateur
        3. /movie/{id}/watch/providers → plateformes de streaming en France
        4. /movie/{id}/videos → bande-annonce YouTube

        Le film est créé même si aucune plateforme n'est disponible
        (car il est au cinéma, c'est sa "plateforme" principale).

        Args:
            tmdb_id (int): L'ID TMDB du film

        Returns:
            Films: L'instance du film créé, ou None en cas d'erreur
        """
        try:
            # --- 1. Infos de base du film ---
            detail_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?language=fr-FR"
            detail_res = http_requests.get(detail_url, headers=TMDB_HEADERS)
            if detail_res.status_code != 200:
                logger.error("TMDB detail erreur pour tmdb_id=%s : %s", tmdb_id, detail_res.text)
                return None
            detail = detail_res.json()

            # --- 2. Casting (acteurs + réalisateur) ---
            cast_list, director_id = self._get_casting(tmdb_id)

            # --- 3. Plateformes de streaming ---
            plateform_ids = self._get_plateforms(tmdb_id)

            # --- 4. Bande-annonce YouTube ---
            trailer_url = self._get_trailer(tmdb_id)

            # --- 5. Genres ---
            # Les genres dans /movie/{id} sont des objets {id, name},
            # on extrait les IDs pour les lier au modèle Genres.
            genre_ids = [g["id"] for g in detail.get("genres", [])]

            # --- Création du film en base ---
            poster_path = detail.get("poster_path", "")
            img_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else ""
            release_date = detail.get("release_date", "")
            release_year = int(release_date[:4]) if release_date and len(release_date) >= 4 else 0

            film = Films.objects.create(
                tmdb_id=tmdb_id,
                type="Film",
                title=detail.get("title", ""),
                img=img_url,
                release_year=release_year,
                synopsis=detail.get("overview", ""),
                popularity=detail.get("popularity", 0),
                trailer_url=trailer_url,
                director_id=director_id,
            )

            # Ajout des relations ManyToMany (acteurs, genres, plateformes)
            film.main_actors.set(cast_list)
            film.genres.set(genre_ids)
            if plateform_ids:
                film.plateforms.set(plateform_ids)

            logger.info("Film cinéma créé en base : %s (tmdb_id=%s)", film.title, tmdb_id)
            return film

        except Exception as e:
            logger.error("Erreur création film cinéma tmdb_id=%s : %s", tmdb_id, e)
            return None

    def _get_casting(self, movie_id):
        """
        Récupère les 5 acteurs principaux et le réalisateur depuis TMDB.

        Même logique que get_films.py > get_casting(), mais en méthode
        de la vue plutôt qu'en méthode de la commande de management.

        Args:
            movie_id (int): L'ID TMDB du film

        Returns:
            tuple: (liste d'IDs d'acteurs en base, ID du réalisateur en base ou None)
        """
        url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?language=fr-FR"
        response = http_requests.get(url, headers=TMDB_HEADERS)
        data = response.json()

        # Acteurs : on prend les 5 plus populaires
        actors = data.get("cast", [])
        nb_actors = min(5, len(actors))
        popular_actors = sorted(actors, key=lambda x: x.get("popularity", 0), reverse=True)[:nb_actors]

        cast_list = []
        for actor in popular_actors:
            obj, _ = Casting.objects.get_or_create(name=actor["name"])
            cast_list.append(obj.id)

        # Réalisateur : on cherche le premier membre d'équipe avec job="Director"
        director_id = None
        for crew_member in data.get("crew", []):
            if crew_member.get("job") == "Director":
                obj, _ = Director.objects.get_or_create(name=crew_member["name"])
                director_id = obj.id
                break

        return cast_list, director_id

    def _get_plateforms(self, movie_id):
        """
        Récupère les plateformes de streaming disponibles en France.

        Contrairement à get_films.py qui ignore les films sans plateforme FR,
        ici on renvoie une liste vide si aucune plateforme n'est disponible
        (le film est au cinéma, donc c'est normal).

        Args:
            movie_id (int): L'ID TMDB du film

        Returns:
            list: Liste d'IDs TMDB de plateformes (peut être vide)
        """
        url = f"https://api.themoviedb.org/3/movie/{movie_id}/watch/providers"
        response = http_requests.get(url, headers=TMDB_HEADERS)
        data = response.json()

        # Vérifier si des données existent pour la France
        fr_data = data.get("results", {}).get("FR")
        if not fr_data:
            return []

        # Combiner les plateformes par abonnement, location et achat
        all_plateforms = (
            fr_data.get("flatrate", [])
            + fr_data.get("rent", [])
            + fr_data.get("buy", [])
        )

        list_plateforms = []
        seen_ids = set()  # Pour éviter les doublons
        for plateform in all_plateforms:
            provider_id = plateform["provider_id"]
            if provider_id in seen_ids:
                continue
            seen_ids.add(provider_id)

            logo_url = (
                f"https://image.tmdb.org/t/p/w200{plateform['logo_path']}"
                if plateform.get("logo_path") else None
            )
            obj, created = Plateform.objects.get_or_create(
                tmdb_id=provider_id,
                defaults={"plateform": plateform["provider_name"]},
            )
            if created and logo_url:
                obj.logo = logo_url
                obj.save()
            list_plateforms.append(provider_id)

        return list_plateforms

    def _get_trailer(self, movie_id):
        """
        Récupère l'URL de la bande-annonce YouTube du film.

        Cherche une vidéo dont le nom contient "Trailer" sur YouTube.
        Renvoie un lien embed pour l'intégration dans le frontend.

        Args:
            movie_id (int): L'ID TMDB du film

        Returns:
            str|None: URL embed YouTube ou None si pas de bande-annonce
        """
        url = f"https://api.themoviedb.org/3/movie/{movie_id}/videos"
        response = http_requests.get(url, headers=TMDB_HEADERS)
        results = response.json().get("results", [])

        if not results:
            return None

        # Chercher un trailer YouTube
        trailer_keys = [
            video["key"] for video in results
            if "Trailer" in video.get("name", "") and video.get("site") == "YouTube"
        ]
        if trailer_keys:
            return f"https://www.youtube.com/embed/{trailer_keys[0]}"

        return None
