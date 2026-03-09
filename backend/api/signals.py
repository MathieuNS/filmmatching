import random
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile, AVATAR_CHOICES


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Signal déclenché automatiquement après la sauvegarde d'un User.

    Un signal est un mécanisme de Django qui permet d'exécuter du code
    automatiquement quand un événement se produit. Ici, post_save
    signifie "après la sauvegarde" d'un objet User.

    Si c'est un NOUVEAU User (created=True), on crée un Profile
    avec un avatar choisi aléatoirement parmi les 5 disponibles.

    random.choice() prend un élément au hasard dans une liste.
    AVATAR_CHOICES est une liste de tuples (nom_fichier, label),
    donc random.choice(...)[0] prend le nom du fichier.

    Args:
        sender: Le modèle qui a envoyé le signal (User)
        instance: L'objet User qui vient d'être sauvegardé
        created: True si c'est une création, False si c'est une mise à jour
    """
    if created:
        # Choisir un avatar au hasard parmi les 5 disponibles
        random_avatar = random.choice(AVATAR_CHOICES)[0]
        Profile.objects.create(user=instance, avatar=random_avatar)
