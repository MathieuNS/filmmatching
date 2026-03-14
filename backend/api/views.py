import os
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
from .models import Films, Genres, Plateform, Swipe, Friendship, Profile, AVATAR_CHOICES
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
        user = serializer.save(is_active=False)

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

        # Envoyer l'email de confirmation
        send_mail(
            subject="Confirme ton compte FilmMatching 🎬",
            message=(
                f"Salut {user.username} !\n\n"
                f"Bienvenue sur FilmMatching !\n"
                f"Clique sur ce lien pour activer ton compte :\n\n"
                f"{activation_link}\n\n"
                f"Ce lien est à usage unique. Une fois ton compte activé, "
                f"tu pourras te connecter et commencer à swiper des films.\n\n"
                f"À bientôt sur FilmMatching !"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,  # Si l'envoi échoue, on lève une erreur
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
            return Response(
                {"message": "Ton compte a été activé avec succès ! Tu peux maintenant te connecter."},
                status=status.HTTP_200_OK,
            )
        else:
            # Token invalide (déjà utilisé, expiré, ou falsifié)
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
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"error": "Le pseudo et le mot de passe sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Étape 1 : vérifier si le pseudo existe
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"error": "Identifiants incorrects."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Étape 2 : vérifier si le compte est activé
        if not user.is_active:
            return Response(
                {"error": "Vous devez activer votre compte pour vous connecter. Vérifiez votre boîte mail."},
                # 403 Forbidden : le serveur comprend la requête mais refuse
                # de l'exécuter (contrairement à 401 qui signifie "non identifié")
                status=status.HTTP_403_FORBIDDEN,
            )

        # Étape 3 : vérifier le mot de passe
        # authenticate() vérifie le mot de passe hashé en BDD
        # Renvoie l'objet User si c'est correct, None sinon
        authenticated_user = authenticate(username=username, password=password)
        if authenticated_user is None:
            return Response(
                {"error": "Identifiants incorrects."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Étape 4 : générer les tokens JWT
        # RefreshToken.for_user() crée un refresh token lié à cet utilisateur
        # .access_token génère le token d'accès correspondant
        refresh = RefreshToken.for_user(authenticated_user)
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
        # .delete() supprime l'utilisateur et toutes ses données liées
        # (swipes, amitiés, etc.) grâce aux relations CASCADE en BDD.
        user.delete()
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
        Surcharge de create() pour ajouter les matchs d'amis dans la réponse
        quand le swipe est un "like".

        On vérifie quels amis confirmés ont aussi liké ce film,
        et on retourne leurs noms + avatars dans matched_friends.
        """
        # Appel de la méthode create() de base pour enregistrer le swipe
        response = super().create(request, *args, **kwargs)

        # Si c'est un "like", on cherche les amis qui ont aussi liké ce film
        if request.data.get('status') == 'like':
            user = request.user
            film_id = request.data.get('film')

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
            return Response(
                {"error": "Une erreur est survenue lors de l'envoi. Réessaie plus tard."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
