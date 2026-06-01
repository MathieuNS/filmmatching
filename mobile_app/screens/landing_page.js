// React : useState (mémoire d'état), useEffect (effets de bord), useRef (valeur persistante)
import { useState, useEffect, useLayoutEffect, useRef } from "react";
// Composants natifs de base de React Native (équivalents des balises HTML)
import {
  View, // équivalent d'un <div> : un conteneur
  Text, // équivalent d'un <span>/<p>/<h1> : OBLIGATOIRE pour afficher du texte
  Image, // équivalent d'un <img>
  Pressable, // une zone "cliquable" (équivalent d'un <button>/<a>)
  StyleSheet, // pour créer les styles en JavaScript (remplace le CSS)
  Animated, // API d'animation de React Native (remplace les transitions CSS)
  Easing, // courbes d'accélération pour les animations
} from "react-native";
// SafeAreaView : conteneur qui évite les zones "dangereuses" (encoche, barre d'état)
import { SafeAreaView } from "react-native-safe-area-context";
// Barre d'état du téléphone (heure, batterie...) : on la veut en clair sur fond sombre
import { StatusBar } from "expo-status-bar";
// LinearGradient : permet de faire des dégradés (impossible en pur React Native)
import { LinearGradient } from "expo-linear-gradient";
// Palette et dégradés centralisés (source unique, réutilisée par tous les écrans)
import { COLORS, GRADIENTS } from "../constants/colors";
// Polices centralisées : Outfit (titres) et Sora (texte), comme le site web.
// Chaque graisse a son propre nom (ex : FONTS.displayBold) — voir constants/fonts.js.
import { FONTS } from "../constants/fonts";
// Composant réutilisable : texte coloré en dégradé (source unique, voir components/)
import GradientText from "../components/GradientText";

/**
 * Liste des films/séries utilisés pour la démo de swipe.
 * Données codées en dur (pas de requête API) pour que la page
 * s'affiche instantanément, même si le backend est éteint.
 */
const DEMO_FILMS = [
  {
    title: "Inception",
    img: "https://image.tmdb.org/t/p/w500/aej3LRUga5rhgkmRP6XMFw3ejbl.jpg",
    type: "Film",
    year: 2010,
    director: "Christopher Nolan",
  },
  {
    title: "Stranger Things",
    img: "https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg",
    type: "Serie",
    year: 2016,
    director: "Duffer Brothers",
  },
  {
    title: "Interstellar",
    img: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    type: "Film",
    year: 2014,
    director: "Christopher Nolan",
  },
  {
    title: "Breaking Bad",
    img: "https://image.tmdb.org/t/p/w500/4YLQj5XRrMJ7gp8eb0h6umd0iNx.jpg",
    type: "Serie",
    year: 2008,
    director: "Vince Gilligan",
  },
  {
    title: "Parasite",
    img: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    type: "Film",
    year: 2019,
    director: "Bong Joon-ho",
  },
];

/**
 * Séquence des directions de swipe (comme sur le web).
 * "right" = like (♥), "left" = dislike (✕), "up" = déjà vu (👁).
 */
const SWIPE_SEQUENCE = ["right", "left", "up", "right", "left"];

// Dimensions de la pile de cartes (en pixels logiques)
const CARD_WIDTH = 200;
const CARD_HEIGHT = 290;

/**
 * Contenu visuel d'une carte de film (image + dégradé + infos).
 * Réutilisé pour la carte du dessus et celle du dessous.
 *
 * @param {Object} props
 * @param {Object} props.film - les données du film à afficher
 * @returns {JSX.Element} Le contenu de la carte
 */
function CardContent({ film }) {
  // Une série a un badge rose, un film un badge indigo (comme sur le web)
  const isSerie = film.type === "Serie";

  return (
    <>
      {/* L'affiche du film, qui remplit toute la carte */}
      <Image
        style={styles.cardImage}
        source={{ uri: film.img }} // sur mobile, une image distante se charge via { uri }
        resizeMode="cover" // équivalent de object-fit: cover
      />

      {/* Dégradé sombre en bas pour rendre le texte lisible sur l'image */}
      <LinearGradient
        colors={["transparent", "rgba(13,13,15,0.7)", COLORS.noirCinema]}
        style={styles.cardGradient}
        pointerEvents="none" // ce dégradé ne doit pas intercepter les clics
      />

      {/* Bloc d'infos en bas de la carte */}
      <View style={styles.cardInfo}>
        <View
          style={[
            styles.cardBadge,
            isSerie ? styles.cardBadgeSerie : styles.cardBadgeFilm,
          ]}
        >
          <Text
            style={[
              styles.cardBadgeText,
              { color: isSerie ? "#f472b6" : "#818cf8" },
            ]}
          >
            {film.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.cardTitle}>{film.title}</Text>
        <Text style={styles.cardMeta}>
          {film.year} · {film.director}
        </Text>
      </View>
    </>
  );
}

/**
 * LandingPage — Page d'accueil publique de FilmMatching (version mobile).
 *
 * C'est la première page que voit un visiteur non connecté.
 * Son but : expliquer le concept en un coup d'œil et donner envie
 * de créer un compte.
 *
 * Note : la vérification du token (redirection auto vers l'accueil si
 * déjà connecté) sera ajoutée plus tard, quand l'authentification mobile
 * (stockage sécurisé des tokens + Redux) sera en place.
 *
 * @param {Object} props
 * @param {Object} [props.navigation] - objet de navigation (fourni par React
 *   Navigation une fois branché). Optionnel pour l'instant.
 * @returns {JSX.Element} La page d'accueil
 */
export default function LandingPage({ navigation }) {
  // Index du film actuellement affiché sur la carte du dessus
  const [currentIndex, setCurrentIndex] = useState(0);
  // Index dans la séquence de directions (SWIPE_SEQUENCE)
  const [swipeStep, setSwipeStep] = useState(0);
  // Phase de l'animation : "visible" (carte en place) ou "exiting" (carte qui sort)
  const [animPhase, setAnimPhase] = useState("visible");
  // Film matché à afficher dans l'overlay "It's a Match !", ou null si pas de match
  const [matchFilm, setMatchFilm] = useState(null);

  // useRef garde une valeur stable entre les rendus sans relancer de rendu.
  // Ici c'est notre "moteur" d'animation : un nombre de 0 (carte en place) à 1 (carte sortie).
  const anim = useRef(new Animated.Value(0)).current;
  // Valeur d'animation pour l'apparition de l'overlay de match (effet "pop")
  const matchAnim = useRef(new Animated.Value(0)).current;

  // Direction du swipe en cours
  const swipeDirection = SWIPE_SEQUENCE[swipeStep];
  // Film du dessus (celui qui va sortir)
  const currentFilm = DEMO_FILMS[currentIndex];
  // Film du dessous (visible en arrière-plan, prochain à venir)
  const nextFilm = DEMO_FILMS[(currentIndex + 1) % DEMO_FILMS.length];

  // --- Remise au centre SANS clignotement ---
  // useLayoutEffect s'exécute juste après le rendu mais AVANT l'affichage
  // ("paint"). Quand on passe au film suivant (currentIndex change), on remet
  // la carte au centre ICI : le nouveau film ET sa position centrée sont donc
  // appliqués dans le même affichage. Résultat : on ne voit jamais l'ancienne
  // carte réapparaître au centre (c'était l'origine du clignotement).
  useLayoutEffect(() => {
    anim.setValue(0);
  }, [currentIndex]);

  // --- Effet : le cycle d'animation (équivalent du setInterval du web) ---
  useEffect(() => {
    // Si un match est affiché, on met le cycle en pause 2s puis on le ferme
    if (matchFilm) {
      // Petite animation d'apparition de l'overlay
      Animated.spring(matchAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }).start();

      const matchTimer = setTimeout(() => {
        matchAnim.setValue(0); // on réinitialise pour la prochaine fois
        setMatchFilm(null);
      }, 2000);
      return () => clearTimeout(matchTimer);
    }

    // Toutes les 3 secondes : on fait sortir la carte du dessus
    const cycle = setTimeout(() => {
      setAnimPhase("exiting");

      // On anime la valeur 0 -> 1 sur 400ms (la carte glisse hors de l'écran)
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        easing: Easing.ease,
        // useNativeDriver: false -> l'animation tourne côté JavaScript. C'est
        // volontaire : ça permet de recentrer la carte EXACTEMENT au même
        // affichage que le changement de film (via le useLayoutEffect plus
        // haut), donc sans clignotement (comme sur le web).
        useNativeDriver: false,
      }).start(({ finished }) => {
        // Si l'animation a été interrompue (ex : page quittée), on s'arrête là.
        if (!finished) return;

        // La carte est maintenant sortie (hors écran, donc invisible). On passe
        // au film suivant. Le recentrage est géré par le useLayoutEffect
        // (déclenché par le changement de currentIndex) : l'ancienne carte ne
        // revient donc jamais au centre.
        setSwipeStep((prevStep) => {
          const direction = SWIPE_SEQUENCE[prevStep];
          // Si c'était un like, on déclenche l'animation "It's a Match !"
          if (direction === "right") {
            setMatchFilm(DEMO_FILMS[currentIndex]);
          }
          return (prevStep + 1) % SWIPE_SEQUENCE.length;
        });
        setCurrentIndex((prev) => (prev + 1) % DEMO_FILMS.length);
        setAnimPhase("visible");
      });
    }, 3000);

    // Nettoyage : on annule le timer si le composant disparaît
    return () => clearTimeout(cycle);
  }, [matchFilm, currentIndex]);

  // --- Calcul des transformations animées de la carte du dessus ---
  // interpolate = "traduit" notre valeur 0->1 en valeurs concrètes (pixels, degrés).
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      0,
      swipeDirection === "right" ? 220 : swipeDirection === "left" ? -220 : 0,
    ],
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, swipeDirection === "up" ? -260 : 0],
  });
  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "0deg",
      swipeDirection === "right" ? "20deg" : swipeDirection === "left" ? "-20deg" : "0deg",
    ],
  });
  const cardOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0], // la carte devient transparente en sortant
  });

  // Les icônes s'illuminent quand le swipe part dans leur direction
  const isExiting = animPhase === "exiting";
  const likeActive = isExiting && swipeDirection === "right";
  const dislikeActive = isExiting && swipeDirection === "left";
  const seenActive = isExiting && swipeDirection === "up";

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Conteneur PLEIN ÉCRAN (pas de défilement) : comme le web (100vh,
          colonne centrée). flex:1 occupe tout l'écran, et le contenu est
          centré verticalement. SafeAreaView évite l'encoche / la barre d'état. */}
      <SafeAreaView style={styles.content}>
        {/* --- Logo --- */}
        <View style={styles.logoRow}>
          {/* Logo identique au site web. require() charge une image LOCALE
              (livrée avec l'app), contrairement à { uri } pour une image distante. */}
          <Image
            style={styles.logoIcon}
            source={require("../assets/filmmatching-icon.png")}
            resizeMode="contain"
          />
          <GradientText colors={GRADIENTS.passion} style={styles.logoText}>
            FilmMatching
          </GradientText>
        </View>

        {/* --- Titre + sous-titre --- */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Marre de manger froid?{"\n"}Arrête de scroller!
          </Text>
          <Text style={styles.subtitle}>
            Swipe et trouve un film ou une série qui plaît à tout le monde en
            2 minutes
          </Text>
        </View>

        {/* --- Zone démo : icônes de swipe + pile de cartes --- */}
        <View style={styles.demoSection}>
          <View style={styles.demoRow}>
            {/* Icône dislike (croix) à gauche */}
            <View
              style={[
                styles.swipeIcon,
                styles.swipeIconDislike,
                dislikeActive && styles.swipeIconDislikeActive,
              ]}
            >
              <Text style={[styles.swipeIconText, { color: COLORS.grisTexte }]}>
                ✕
              </Text>
            </View>

            {/* Pile de 2 cartes */}
            <View style={styles.cardStack}>
              {/* Carte du DESSOUS (prochain film), légèrement réduite */}
              <View style={[styles.card, styles.cardBack]}>
                <CardContent film={nextFilm} />
              </View>

              {/* Carte du DESSUS (film actuel), celle qui est animée.
                  Animated.View = une View dont on peut animer le style. */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardFront,
                  {
                    opacity: cardOpacity,
                    transform: [{ translateX }, { translateY }, { rotate }],
                  },
                ]}
              >
                <CardContent film={currentFilm} />
              </Animated.View>
            </View>

            {/* Icône like (cœur) à droite */}
            <View
              style={[
                styles.swipeIcon,
                styles.swipeIconLike,
                likeActive && styles.swipeIconLikeActive,
              ]}
            >
              <Text style={[styles.swipeIconText, { color: COLORS.corailVif }]}>
                ♥
              </Text>
            </View>
          </View>

          {/* Bouton "Déjà vu" sous la pile */}
          <View style={[styles.seenIcon, seenActive && styles.seenIconActive]}>
            <Text style={styles.seenIconText}>👁 Déjà vu</Text>
          </View>

          {/* --- Overlay "It's a Match !" --- */}
          {matchFilm && (
            <Animated.View
              style={[
                styles.matchOverlay,
                {
                  opacity: matchAnim, // apparition en fondu
                  transform: [
                    {
                      // effet "pop" : passe de 0.7 à 1
                      scale: matchAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <GradientText
                colors={GRADIENTS.match}
                style={styles.matchTitle}
              >
                It's a Match !
              </GradientText>
              <Text style={styles.matchSubtitle}>
                Toi et Alex aimez le même film
              </Text>
              <Image
                style={styles.matchFilmImg}
                source={{ uri: matchFilm.img }}
                resizeMode="cover"
              />
              <Text style={styles.matchFilmTitle}>{matchFilm.title}</Text>
              <View style={styles.matchFriend}>
                <LinearGradient
                  colors={GRADIENTS.connexion}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.matchAvatar}
                >
                  <Text style={styles.matchAvatarText}>A</Text>
                </LinearGradient>
                <Text style={styles.matchFriendName}>Alex</Text>
              </View>
            </Animated.View>
          )}
        </View>

        {/* --- Badges de stats --- */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>🎬</Text>
            <Text style={styles.statText}>
              <Text style={styles.statValue}>21 000+</Text> films et séries
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>🤝</Text>
            <Text style={styles.statText}>
              <Text style={styles.statValue}>Matchs</Text> entre amis
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.statText}>
              Trouve en <Text style={styles.statValue}>2 min</Text>
            </Text>
          </View>
        </View>

        {/* --- Zone CTA : bouton d'inscription + lien de connexion --- */}
        <View style={styles.cta}>
          {/* Pressable = zone cliquable. On appelle navigation.navigate si dispo. */}
          <Pressable
            style={styles.ctaButton}
            onPress={() => navigation?.navigate?.("CreateLogin")}
          >
            <LinearGradient
              colors={GRADIENTS.passion}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaButtonGradient}
            >
              <Text style={styles.ctaButtonText}>Commencer à swiper</Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.loginLink}>
            Déjà un compte ?{" "}
            <Text
              style={styles.loginLinkAccent}
              onPress={() => navigation?.navigate?.("Login")}
            >
              Se connecter
            </Text>
          </Text>
        </View>

        {/* --- Attribution TMDB (obligatoire quand on utilise leurs données) ---
            Le logo TMDB est un SVG : on l'ajoutera plus tard (react-native-svg
            ou une image PNG). Pour l'instant on garde la mention texte. */}
        <View style={styles.tmdb}>
          <Text style={styles.tmdbText}>
            Cette application utilise l'API de TMDB mais n'est ni approuvée ni
            certifiée par TMDB.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ============================================================
   STYLES
   StyleSheet.create remplace le fichier CSS. Chaque clé est une
   "classe", chaque valeur un objet de propriétés (camelCase :
   background-color -> backgroundColor).
   ============================================================ */
const styles = StyleSheet.create({
  root: {
    flex: 1, // occupe tout l'écran
    backgroundColor: COLORS.noirCinema,
  },
  content: {
    flex: 1, // occupe tout l'écran (plein écran, comme le web 100vh)
    alignItems: "center", // centre les enfants horizontalement
    justifyContent: "center", // ...et verticalement (toute la colonne est centrée)
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  // --- Logo ---
  logoRow: {
    flexDirection: "row", // icône + texte côte à côte
    alignItems: "center",
    alignSelf: "flex-start", // collé à gauche comme sur le web
    gap: 10,
    marginBottom: 24,
  },
  logoIcon: {
    width: 40,
    height: 40,
  },
  logoText: {
    fontFamily: FONTS.displayExtraBold,
    fontSize: 28,
  },

  // --- Header ---
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: FONTS.displayBlack,
    fontSize: 30,
    color: COLORS.blancDoux,
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.grisTexte,
    textAlign: "center",
    lineHeight: 22,
  },

  // --- Zone démo ---
  demoSection: {
    position: "relative", // sert de repère pour l'overlay de match (absolute)
    marginBottom: 20,
    alignItems: "center",
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  cardStack: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: "relative",
  },

  // Icônes de swipe rondes
  swipeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26, // moitié de la taille = cercle parfait
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  swipeIconText: {
    fontSize: 22,
  },
  swipeIconDislike: {
    backgroundColor: "rgba(139,139,158,0.12)",
  },
  swipeIconLike: {
    backgroundColor: "rgba(255,77,106,0.12)",
  },
  // États "actifs" : l'icône grossit et s'illumine (ombre = effet de halo)
  swipeIconDislikeActive: {
    transform: [{ scale: 1.2 }],
    backgroundColor: "rgba(139,139,158,0.3)",
    shadowColor: COLORS.grisTexte,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8, // ombre sur Android
  },
  swipeIconLikeActive: {
    transform: [{ scale: 1.2 }],
    backgroundColor: "rgba(255,77,106,0.3)",
    shadowColor: COLORS.corailVif,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  // Bouton "Déjà vu"
  seenIcon: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: "rgba(255,170,43,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  seenIconActive: {
    transform: [{ scale: 1.15 }],
    backgroundColor: "rgba(255,170,43,0.3)",
    shadowColor: COLORS.ambreDore,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  seenIconText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 13,
    color: COLORS.ambreDore,
  },

  // --- Cartes de film ---
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden", // coupe l'image qui dépasse les coins arrondis
    position: "absolute",
    top: 0,
    left: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardBack: {
    zIndex: 1,
    transform: [{ scale: 0.95 }, { translateY: 10 }], // plus petite et décalée
  },
  cardFront: {
    // Pas d'ombre ici : sur Android, "elevation" dessinait une ombre dure
    // bien visible autour de la carte, absente de la version web. On garde
    // seulement le zIndex pour que cette carte reste au-dessus de l'autre.
    zIndex: 2,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  cardInfo: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  cardBadge: {
    alignSelf: "flex-start", // le badge ne prend que sa largeur de texte
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 100,
    marginBottom: 6,
  },
  cardBadgeFilm: {
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  cardBadgeSerie: {
    backgroundColor: "rgba(236,72,153,0.25)",
  },
  cardBadgeText: {
    fontFamily: FONTS.displayBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: COLORS.blancDoux,
  },
  cardMeta: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: "rgba(240,238,242,0.6)",
    marginTop: 4,
  },

  // --- Overlay "It's a Match !" ---
  matchOverlay: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: "rgba(13,13,15,0.92)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    // L'overlay doit passer AU-DESSUS des cartes. Sur Android, l'ordre
    // d'empilement dépend de "elevation" (pas seulement de zIndex) : les
    // cartes ont elevation 10, on met donc une valeur bien plus haute ici.
    zIndex: 100,
    elevation: 100,
  },
  matchTitle: {
    fontFamily: FONTS.displayBlack,
    fontSize: 34,
    marginBottom: 8,
  },
  matchSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.blancDoux,
    marginBottom: 20,
  },
  matchFilmImg: {
    width: 110,
    height: 165,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.vertMatch,
  },
  matchFilmTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.blancDoux,
    marginTop: 12,
    marginBottom: 16,
  },
  matchFriend: {
    alignItems: "center",
    gap: 6,
  },
  matchAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  matchAvatarText: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: "#fff",
  },
  matchFriendName: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.blancDoux,
  },

  // --- Stats ---
  stats: {
    flexDirection: "row",
    flexWrap: "wrap", // passe à la ligne si pas la place
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 100,
    backgroundColor: COLORS.noirCarte,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  statIcon: {
    fontSize: 16,
  },
  statText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.grisTexte,
  },
  statValue: {
    fontFamily: FONTS.displayBold,
    color: COLORS.blancDoux,
  },

  // --- CTA ---
  cta: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 16,
  },
  ctaButton: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden", // pour que le dégradé respecte les coins arrondis
    shadowColor: COLORS.corailVif,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  ctaButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaButtonText: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: "#fff",
  },
  loginLink: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.grisTexte,
  },
  loginLinkAccent: {
    color: COLORS.violetNuit,
    fontFamily: FONTS.bodyMedium,
  },

  // --- TMDB ---
  tmdb: {
    marginTop: 20,
    paddingVertical: 12,
    opacity: 0.5,
    alignItems: "center",
  },
  tmdbText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.grisTexte,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 16,
  },
});
