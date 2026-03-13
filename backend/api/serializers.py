from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Films, Genres, Plateform, Swipe, Friendship, Profile


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer pour créer un compte utilisateur.
    Le mot de passe est en 'write_only' : on peut l'envoyer pour créer
    le compte, mais il n'apparaît jamais dans les réponses de l'API.

    Le champ 'avatar' est lu depuis le modèle Profile lié au User.
    SerializerMethodField permet de créer un champ calculé qui n'existe pas
    directement sur le modèle User, mais qu'on va chercher ailleurs (ici, sur le Profile).
    """

    # Champ calculé : on va chercher l'avatar dans le Profile lié au User
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'avatar']
        extra_kwargs = {'password': {'write_only': True}}

    def get_avatar(self, obj):
        """
        Récupère le nom de fichier de l'avatar depuis le Profile.

        hasattr() vérifie que le User a bien un Profile associé.
        C'est une précaution : si un User a été créé avant l'ajout
        du système de profils, il pourrait ne pas avoir de Profile.

        Args:
            obj: L'objet User dont on veut l'avatar

        Returns:
            Le nom du fichier avatar (ex: "avatar-popcorn.svg") ou None
        """
        if hasattr(obj, 'profile'):
            return obj.profile.avatar
        return None

    def validate_email(self, value):
        """
        Vérifie que l'email n'est pas déjà utilisé par un autre compte.

        Par défaut, Django n'impose pas l'unicité sur le champ email.
        On ajoute cette vérification ici pour éviter les doublons.

        Args:
            value: L'adresse email saisie par l'utilisateur

        Returns:
            L'email validé (en minuscules pour éviter les doublons de casse)

        Raises:
            ValidationError: Si un compte avec cet email existe déjà
        """
        # iexact = comparaison insensible à la casse
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value.lower()

    def create(self, validated_data):
        """
        Utilise create_user() au lieu de create() pour que
        le mot de passe soit hashé (chiffré) automatiquement.
        Sans ça, le mot de passe serait stocké en clair dans la BDD.

        Le Profile (avec un avatar aléatoire) est créé automatiquement
        par le signal post_save dans signals.py.
        """
        user = User.objects.create_user(**validated_data)
        return user


class FilmsSerializer(serializers.ModelSerializer):
    """
    Serializer complet pour le modèle Films.
    Utilisé pour créer des films (admin) et les lister.

    StringRelatedField renvoie le résultat de __str__() de chaque objet lié.
    Par exemple, pour un genre, ça renvoie "Action" au lieu de l'ID 28.
    many=True est nécessaire pour les champs ManyToMany (plusieurs valeurs).
    """

    # Au lieu de renvoyer des IDs (ex: [1, 3]), on renvoie les noms (ex: ["Action", "Drame"])
    genres = serializers.StringRelatedField(many=True, read_only=True)
    plateforms = serializers.StringRelatedField(many=True, read_only=True)
    main_actors = serializers.StringRelatedField(many=True, read_only=True)
    # Pour le réalisateur (ForeignKey, pas ManyToMany), pas besoin de many=True
    director = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Films
        fields = '__all__'


class GenreSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle Genres.
    Renvoie l'ID TMDB et le nom du genre (ex: "Action", "Comédie").
    Utilisé par l'endpoint /api/genres/ pour remplir les filtres côté frontend.
    """

    class Meta:
        model = Genres
        fields = ['tmdb_id', 'genre']


class PlateformSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle Plateform.
    Renvoie l'ID TMDB et le nom de la plateforme (ex: "Netflix", "Disney+").
    Utilisé par l'endpoint /api/platforms/ pour remplir les filtres côté frontend.
    """

    class Meta:
        model = Plateform
        fields = ['tmdb_id', 'plateform']


class SwipeSerializer(serializers.ModelSerializer):
    """
    Serializer pour enregistrer un swipe (like/dislike/déjà vu).

    Le champ 'user' est en lecture seule : il est rempli automatiquement
    avec l'utilisateur connecté dans la vue (perform_create).
    Ça empêche un utilisateur de swiper "au nom" de quelqu'un d'autre.
    """

    # read_only=True : le frontend n'a pas besoin d'envoyer le user,
    # c'est le backend qui le remplit automatiquement.
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Swipe
        fields = ['id', 'user', 'film', 'status', 'rating', 'created_at']
        # created_at est en lecture seule car il se remplit tout seul (auto_now_add)
        read_only_fields = ['created_at']

    def validate_rating(self, value):
        """
        Vérifie que la note est un multiple de 0.5 (demi-étoiles uniquement).

        Par exemple : 1.0, 1.5, 2.0 sont valides, mais 1.3 ou 2.7 ne le sont pas.
        On utilise l'opérateur modulo (%) pour vérifier que le reste de la division
        par 0.5 est bien égal à 0.

        Args:
            value: La note envoyée par le frontend (ex: 3.5)

        Returns:
            La note validée

        Raises:
            ValidationError: Si la note n'est pas un multiple de 0.5
        """
        if value is not None and float(value) % 0.5 != 0:
            raise serializers.ValidationError(
                "La note doit être un multiple de 0.5 (ex: 1.0, 1.5, 2.0, ...)."
            )
        return value

    def validate(self, data):
        """
        Validation croisée : la note n'est autorisée que pour les films "déjà vu".

        Cette méthode est appelée après les validations individuelles de chaque champ.
        Elle permet de vérifier des règles qui dépendent de plusieurs champs à la fois.

        Args:
            data: Dictionnaire contenant tous les champs validés

        Returns:
            Les données validées

        Raises:
            ValidationError: Si on essaie de noter un film qui n'est pas en statut "seen"
        """
        # On récupère le statut : soit celui envoyé dans la requête,
        # soit celui déjà en base (pour un PATCH partiel)
        status = data.get('status', getattr(self.instance, 'status', None))
        rating = data.get('rating')

        if rating is not None and status != 'seen':
            raise serializers.ValidationError({
                'rating': "La note n'est autorisée que pour les films déjà vus."
            })
        return data


class SwipeDetailSerializer(serializers.ModelSerializer):
    """
    Serializer enrichi pour afficher les swipes avec les données complètes du film.

    Contrairement à SwipeSerializer qui renvoie juste l'ID du film (ex: "film": 5),
    celui-ci renvoie toutes les infos du film (titre, image, genres, etc.).
    C'est utilisé par la page "Ma liste" pour afficher les cartes de films.

    Le mot-clé 'source' n'est pas nécessaire ici car le champ s'appelle déjà 'film'
    dans le modèle Swipe, et FilmsSerializer sait quoi faire avec l'objet Film.
    """

    # On imbrique le FilmsSerializer dans le champ 'film' :
    # au lieu de renvoyer film: 5, on renvoie film: { id: 5, title: "...", img: "...", ... }
    film = FilmsSerializer(read_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Swipe
        fields = ['id', 'user', 'film', 'status', 'rating', 'created_at']
        read_only_fields = ['created_at']


class FriendshipSerializer(serializers.ModelSerializer):
    """
    Serializer pour les demandes d'amis.

    Le champ 'sender' est en lecture seule : c'est toujours l'utilisateur
    connecté qui envoie la demande.
    Le champ 'receiver' attend l'ID de l'utilisateur à qui on envoie la demande.
    """

    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    # On affiche les usernames pour que le frontend puisse afficher des noms
    # au lieu de simples IDs numériques (ex: "Alice" au lieu de "3")
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    receiver_username = serializers.CharField(source='receiver.username', read_only=True)
    # On ajoute les avatars pour afficher les images dans la liste d'amis
    sender_avatar = serializers.CharField(source='sender.profile.avatar', read_only=True)
    receiver_avatar = serializers.CharField(source='receiver.profile.avatar', read_only=True)

    class Meta:
        model = Friendship
        fields = [
            'id', 'sender', 'sender_username', 'sender_avatar',
            'receiver', 'receiver_username', 'receiver_avatar',
            'accepted', 'created_at',
        ]
        read_only_fields = ['accepted', 'created_at']