from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Films, Genres, Plateform, Swipe, Friendship
from .serializers import (
    UserSerializer,
    FilmsSerializer,
    GenreSerializer,
    PlateformSerializer,
    SwipeSerializer,
    FriendshipSerializer,
)


class CreateUserView(generics.CreateAPIView):
    """
    Vue pour créer un nouveau compte utilisateur.

    - Endpoint : POST /api/users/create/
    - Accessible sans être connecté (AllowAny) car on ne peut pas
      demander à quelqu'un de se connecter avant de créer son compte.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


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


class UserSwipeListView(generics.ListAPIView):
    """
    Liste les films swipés par l'utilisateur connecté,
    filtrés par statut (like, dislike ou seen).

    - GET /api/swipes/              → tous les swipes de l'utilisateur
    - GET /api/swipes/?status=like  → seulement les films likés

    Le paramètre 'status' est passé dans l'URL (query parameter).
    """

    serializer_class = SwipeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        get_queryset() est la méthode que Django appelle pour savoir
        quels objets renvoyer. On la personnalise pour filtrer
        par utilisateur et éventuellement par statut.
        """
        # On ne renvoie que les swipes de l'utilisateur connecté
        queryset = Swipe.objects.filter(user=self.request.user)

        # self.request.query_params contient les paramètres de l'URL
        # Exemple : pour /api/swipes/?status=like, query_params = {'status': 'like'}
        swipe_status = self.request.query_params.get('status')
        if swipe_status:
            queryset = queryset.filter(status=swipe_status)

        return queryset


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
        """L'envoyeur est toujours l'utilisateur connecté."""
        serializer.save(sender=self.request.user)


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
