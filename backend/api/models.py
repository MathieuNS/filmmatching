import random
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from pytz import timezone


# Liste des avatars disponibles dans frontend/public/avatars/
AVATAR_CHOICES = [
    ('avatar-camera.svg', 'Caméra'),
    ('avatar-clapperboard.svg', 'Clap'),
    ('avatar-popcorn.svg', 'Popcorn'),
    ('avatar-reel.svg', 'Bobine'),
    ('avatar-ticket.svg', 'Ticket'),
]


class Profile(models.Model):
    """
    Profil étendu de l'utilisateur.

    Le modèle User de Django est fourni par le framework et ne peut pas
    être modifié directement. Pour ajouter des champs personnalisés
    (comme l'avatar), on crée un modèle Profile lié au User par
    une relation OneToOneField.

    Chaque User a exactement un Profile, créé automatiquement
    via un signal (voir signals.py).
    """

    # OneToOneField = chaque User a exactement un Profile (et vice versa).
    # related_name='profile' permet d'accéder au profil via user.profile
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Nom du fichier avatar (ex: "avatar-popcorn.svg")
    # On stocke juste le nom du fichier, pas le chemin complet,
    # car les avatars sont dans frontend/public/avatars/
    avatar = models.CharField(
        max_length=50,
        choices=AVATAR_CHOICES,
        default='avatar-popcorn.svg',
    )

    # Préférence de l'utilisateur pour recevoir des notifications par email
    # (nouveaux matchs, nouvelles demandes d'ami, etc.)
    # True par défaut si l'utilisateur a coché la case à l'inscription,
    # False sinon. Modifiable à tout moment dans "Mon compte".
    email_notifications = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"

    def __str__(self):
        return f"Profil de {self.user.username}"

class Genres(models.Model):
    tmdb_id = models.IntegerField(unique=True, primary_key=True)  # ID du genre dans TMDB, pour éviter les doublons
    genre = models.CharField(max_length=50)
    class Meta:
        verbose_name = "Genre"
        verbose_name_plural = "Genres"

    def __str__(self):
        return self.genre
    
class Plateform(models.Model):
    tmdb_id = models.IntegerField(unique=True, primary_key=True)  # ID de la plateforme dans TMDB, pour éviter les doublons
    plateform = models.CharField(max_length=100)
    link = models.URLField(null=True, blank=True)  # Lien vers la page de la plateforme
    logo = models.URLField(null=True, blank=True)  # URL du logo de la plateforme (optionnel)
    class Meta:
        verbose_name = "Plateform"
        verbose_name_plural = "Plateforms"

    def __str__(self):
        return self.plateform
    
class Casting(models.Model):
    name = models.CharField(max_length=100, unique=True)  # Nom de l'acteur, unique pour éviter les doublons
    class Meta:
        verbose_name = "Casting"
        verbose_name_plural = "Castings"

    def __str__(self):
        return self.name
    
class Director(models.Model):
    name = models.CharField(max_length=100, unique=True)  # Nom du réalisateur, unique pour éviter les doublons
    class Meta:
        verbose_name = "Director"
        verbose_name_plural = "Directors"

    def __str__(self):
        return self.name
class Films(models.Model):

    TYPE_CHOICES = [
        ('Film', 'Film'),
        ('Série', 'Série'),
    ]

    tmdb_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=200)
    img = models.URLField()
    release_year = models.IntegerField()
    director = models.ForeignKey('Director', blank=True, null=True, on_delete=models.SET_NULL)
    main_actors = models.ManyToManyField('Casting', blank=True)
    synopsis = models.TextField()
    genres = models.ManyToManyField('Genres', blank=True)
    plateforms = models.ManyToManyField('Plateform', blank=True)
    type = models.CharField(max_length=10,
                            choices=TYPE_CHOICES,
                            default='Film')
    popularity = models.FloatField(default=0.0)
    trailer_url = models.URLField(blank=True, null=True)
    # True si le film est actuellement à l'affiche au cinéma en France.
    # Mis à jour quotidiennement par la commande get_now_playing.
    now_playing = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Film"
        verbose_name_plural = "Films"
        unique_together = ('tmdb_id', 'type')  # Un même tmdb_id peut exister pour un Film ET une Série, mais pas deux fois pour le même type
        ordering = ['-popularity', '-release_year', 'title']  # Tri par popularité décroissante par défaut

    def __str__(self):
        return self.title


class Swipe(models.Model):
    """
    Enregistre l'interaction d'un utilisateur avec un film.
    Chaque fois qu'un utilisateur swipe (like, dislike ou déjà vu),
    une ligne est créée ici. C'est la table centrale de l'application.

    Exemple : l'utilisateur "Alice" like le film "Inception"
    → Swipe(user=Alice, film=Inception, status='like')
    """

    STATUS_CHOICES = [
        ('like', 'Like'),         # L'utilisateur veut voir ce film
        ('dislike', 'Dislike'),   # L'utilisateur ne veut pas voir ce film
        ('seen', 'Déjà vu'),     # L'utilisateur a déjà vu ce film
    ]

    # ForeignKey = "clé étrangère" : ça crée un lien vers un autre modèle.
    # on_delete=CASCADE signifie : si l'utilisateur est supprimé,
    # tous ses swipes sont supprimés aussi.
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='swipes')
    film = models.ForeignKey(Films, on_delete=models.CASCADE, related_name='swipes')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    # Note attribuée par l'utilisateur (uniquement pour les films "déjà vu").
    # DecimalField avec 1 décimale permet les demi-étoiles : 0.5, 1.0, 1.5, ..., 5.0
    # null=True car seuls les films vus peuvent être notés (les likes/dislikes n'ont pas de note).
    rating = models.DecimalField(
        max_digits=2,           # 2 chiffres au total (ex: "4.5")
        decimal_places=1,       # 1 chiffre après la virgule
        null=True,              # Permet la valeur NULL en base de données
        blank=True,             # Permet de ne pas remplir le champ dans les formulaires
        validators=[
            MinValueValidator(0.5),   # Note minimum : 0.5 étoile
            MaxValueValidator(5.0),   # Note maximum : 5 étoiles
        ],
    )

    class Meta:
        verbose_name = "Swipe"
        verbose_name_plural = "Swipes"
        # unique_together empêche un utilisateur de swiper deux fois le même film.
        # Si Alice a déjà liké Inception, elle ne peut pas le re-liker.
        unique_together = ('user', 'film')

    def __str__(self):
        return f"{self.user.username} → {self.film.title} ({self.status})"


class Friendship(models.Model):
    """
    Représente une connexion entre deux utilisateurs.
    Fonctionne comme une demande d'ami :
    1. Un utilisateur (sender) envoie une demande
    2. L'autre (receiver) accepte ou non
    3. Une fois acceptée (accepted=True), les deux peuvent voir leurs matchs

    Exemple : Alice envoie une demande à Bob
    → Friendship(sender=Alice, receiver=Bob, accepted=False)
    Bob accepte → accepted passe à True
    """

    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sent_friend_requests'
    )
    receiver = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='received_friend_requests'
    )
    # False = demande en attente, True = amis confirmés
    accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Friendship"
        verbose_name_plural = "Friendships"
        # Empêche d'envoyer deux fois la même demande d'ami
        unique_together = ('sender', 'receiver')

    def __str__(self):
        status = "amis" if self.accepted else "en attente"
        return f"{self.sender.username} ↔ {self.receiver.username} ({status})"