https://www.youtube.com/watch?v=c-QsfbznSXI&t=6734s

Todo:

=== BACKEND ===

[ ] Créer une commande Django (manage.py) pour lancer l'import des films/séries automatiquement
[ ] Récupérer les nouveautés TMDB qui ne sont pas déjà dans la database (mise à jour périodique)
[ ] Endpoint pour supprimer un ami (DELETE /api/friends/<id>/)
[ ] Endpoint pour supprimer son compte utilisateur (DELETE /api/users/me/)
[ ] Endpoint pour récupérer/modifier les données perso de l'utilisateur (GET/PATCH /api/users/me/)
[ ] Endpoint pour le choix aléatoire d'un film parmi les matchs avec un ami
[ ] Filtres sur l'endpoint films/random : par type (Film/Série) et par genre
[ ] Filtres sur l'endpoint matchs : par type (Film/Série) et par genre
[ ] Passer la base de données sur PostgreSQL (pour la mise en prod)

=== FRONTEND ===

[ ] Créer la landing page (page d'accueil publique, présentation de l'app)
[ ] Page de swipe : afficher un film avec ses détails + boutons like/dislike/déjà vu
[ ] Animation de swipe (style Tinder : glisser à droite = like, gauche = dislike)
[ ] Page profil utilisateur :
    [ ] Données personnelles (username, email)
    [ ] Suppression du compte
    [ ] Liste des films likés
    [ ] Liste des films dislikés
    [ ] Liste des films déjà vus
[ ] Page amis :
    [ ] Liste des amis
    [ ] Envoyer une demande d'ami
    [ ] Accepter/refuser une demande d'ami
    [ ] Supprimer un ami
[ ] Page matchs (avec un ami) :
    [ ] Liste des films likés en commun
    [ ] Filtres par type (Film/Série) et par genre
    [ ] Bouton "choix aléatoire" parmi les matchs
[ ] Appliquer l'identité visuelle sur toutes les pages (design system CLAUDE.md)

=== DÉPLOIEMENT ===

[ ] Configurer PostgreSQL et migrer les données
[ ] Déployer le backend (Railway, Render ou autre)
[ ] Déployer le frontend (Vercel, Netlify ou autre)
[ ] Configurer les variables d'environnement en production
[ ] Mettre CORS_ALLOWED_ORIGINS au lieu de CORS_ALLOW_ALL_ORIGINS
