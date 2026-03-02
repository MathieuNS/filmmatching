from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Films, Genres, Plateform, Swipe, Friendship


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer pour créer un compte utilisateur.
    Le mot de passe est en 'write_only' : on peut l'envoyer pour créer
    le compte, mais il n'apparaît jamais dans les réponses de l'API.
    """

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        """
        Utilise create_user() au lieu de create() pour que
        le mot de passe soit hashé (chiffré) automatiquement.
        Sans ça, le mot de passe serait stocké en clair dans la BDD.
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
        fields = ['id', 'user', 'film', 'status', 'created_at']
        # created_at est en lecture seule car il se remplit tout seul (auto_now_add)
        read_only_fields = ['created_at']


class FriendshipSerializer(serializers.ModelSerializer):
    """
    Serializer pour les demandes d'amis.

    Le champ 'sender' est en lecture seule : c'est toujours l'utilisateur
    connecté qui envoie la demande.
    Le champ 'receiver' attend l'ID de l'utilisateur à qui on envoie la demande.
    """

    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    # On affiche le username du receiver dans les réponses pour plus de lisibilité
    receiver_username = serializers.CharField(source='receiver.username', read_only=True)

    class Meta:
        model = Friendship
        fields = ['id', 'sender', 'receiver', 'receiver_username', 'accepted', 'created_at']
        read_only_fields = ['accepted', 'created_at']