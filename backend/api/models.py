from django.db import models
from django.contrib.auth.models import User

class Tag(models.Model):
    tag = models.CharField(max_length=50)
    class Meta:
        verbose_name = "Tag"
        verbose_name_plural = "Tags"

    def __str__(self):
        return self.tag
    
class Plateform(models.Model):
    plateform = models.CharField(max_length=100)
    class Meta:
        verbose_name = "Plateform"
        verbose_name_plural = "Plateforms"

    def __str__(self):
        return self.plateform
class Films(models.Model):

    TYPE_CHOICES = [
        ('Film', 'Film'),
        ('Serie', 'Serie'),
    ]

    title = models.CharField(max_length=200)
    img = models.ImageField(upload_to='images/')
    release_year = models.IntegerField()
    director = models.CharField(max_length=100)
    main_actors = models.CharField(max_length=200)
    synopsis = models.TextField()
    tags = models.ManyToManyField('Tag', blank=True)
    plateforms = models.ManyToManyField('Plateform', blank=True)
    type = models.CharField(max_length=10,
                            choices=TYPE_CHOICES,
                            default='Film')
    popularity = models.FloatField(default=0.0)

    class Meta:
        verbose_name = "Film"
        verbose_name_plural = "Films"
        unique_together = ('title', 'release_year', 'director')  # Empêche les doublons de films


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

