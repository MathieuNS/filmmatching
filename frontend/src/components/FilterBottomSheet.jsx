import { useState, useEffect } from "react";
import "../styles/FilterBottomSheet.css";

/**
 * Bottom sheet (panneau glissant depuis le bas) pour filtrer les films.
 *
 * Ce composant affiche un panneau avec 4 sections de filtres :
 * - Type : Film ou Série
 * - Genres : sélection multiple parmi les genres disponibles
 * - Plateformes : sélection multiple parmi les plateformes disponibles
 * - Année : année minimum et maximum
 *
 * Le composant utilise un "brouillon" (draftFilters) : les modifications
 * ne sont envoyées au parent que quand l'utilisateur clique "Appliquer".
 * Ça permet de modifier plusieurs filtres avant de valider.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Si true, le panneau est visible
 * @param {Function} props.onClose - Appelée quand l'utilisateur ferme le panneau
 * @param {Function} props.onApply - Appelée avec les nouveaux filtres quand on clique "Appliquer"
 * @param {Object} props.currentFilters - Les filtres actuellement actifs
 * @param {Array} props.availableGenres - Liste des genres disponibles depuis l'API
 * @param {Array} props.availablePlateforms - Liste des plateformes disponibles depuis l'API
 * @returns {JSX.Element|null} Le bottom sheet ou null s'il est fermé
 */
function FilterBottomSheet({
  isOpen,
  onClose,
  onApply,
  currentFilters,
  availableGenres,
  availablePlateforms,
}) {
  // Le brouillon contient les filtres en cours de modification.
  // On copie les filtres actuels à chaque ouverture du panneau.
  const [draftFilters, setDraftFilters] = useState(currentFilters);

  // Quand le panneau s'ouvre, on recopie les filtres actifs dans le brouillon.
  // Comme ça, si l'utilisateur ferme sans appliquer, les modifications sont perdues.
  useEffect(() => {
    if (isOpen) {
      setDraftFilters({ ...currentFilters });
    }
  }, [isOpen, currentFilters]);

  // Si le panneau est fermé, on n'affiche rien
  if (!isOpen) return null;

  /**
   * Active ou désactive le filtre "type" (Film / Série).
   * Si le type cliqué est déjà sélectionné, on le désactive (toggle).
   *
   * @param {string} type - "Film" ou "Serie"
   */
  function handleTypeToggle(type) {
    setDraftFilters((prev) => ({
      ...prev,
      // Si le type est déjà sélectionné, on remet à "" (pas de filtre)
      type: prev.type === type ? "" : type,
    }));
  }

  /**
   * Active ou désactive un genre dans la sélection multiple.
   *
   * @param {string} genre - Le nom du genre à toggle (ex: "Action")
   */
  function handleGenreToggle(genre) {
    setDraftFilters((prev) => {
      const genres = [...prev.genres];
      const index = genres.indexOf(genre);
      if (index >= 0) {
        // Le genre est déjà sélectionné → on le retire
        genres.splice(index, 1);
      } else {
        // Le genre n'est pas sélectionné → on l'ajoute
        genres.push(genre);
      }
      return { ...prev, genres };
    });
  }

  /**
   * Active ou désactive une plateforme dans la sélection multiple.
   *
   * @param {string} plateform - Le nom de la plateforme à toggle
   */
  function handlePlateformToggle(plateform) {
    setDraftFilters((prev) => {
      const plateforms = [...prev.plateforms];
      const index = plateforms.indexOf(plateform);
      if (index >= 0) {
        plateforms.splice(index, 1);
      } else {
        plateforms.push(plateform);
      }
      return { ...prev, plateforms };
    });
  }

  /**
   * Met à jour l'année min ou max dans le brouillon.
   *
   * @param {string} field - "yearMin" ou "yearMax"
   * @param {string} value - La valeur saisie par l'utilisateur
   */
  function handleYearChange(field, value) {
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /**
   * Réinitialise tous les filtres du brouillon à leur valeur par défaut.
   */
  function handleReset() {
    setDraftFilters({
      type: "",
      genres: [],
      plateforms: [],
      yearMin: "",
      yearMax: "",
    });
  }

  /**
   * Applique les filtres du brouillon et ferme le panneau.
   */
  function handleApply() {
    onApply(draftFilters);
    onClose();
  }

  return (
    <>
      {/* Backdrop : fond sombre cliquable pour fermer */}
      <div className="filter-backdrop" onClick={onClose} />

      {/* Le panneau de filtres */}
      <div className="filter-sheet">
        {/* Petite barre décorative (poignée) */}
        <div className="filter-sheet__handle">
          <div className="filter-sheet__handle-bar" />
        </div>

        {/* En-tête : titre + bouton fermer */}
        <div className="filter-sheet__header">
          <h2 className="filter-sheet__title">Filtres</h2>
          <button className="filter-sheet__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="filter-sheet__content">
          {/* --- Section Type (Film / Série) --- */}
          <div className="filter-section">
            <div className="filter-section__label">Type</div>
            <div className="filter-chips">
              {["Film", "Série"].map((type) => (
                <button
                  key={type}
                  className={`filter-chip ${
                    draftFilters.type === type ? "filter-chip--active" : ""
                  }`}
                  onClick={() => handleTypeToggle(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* --- Section Genres --- */}
          <div className="filter-section">
            <div className="filter-section__label">Genres</div>
            <div className="filter-chips">
              {availableGenres.map((g) => (
                <button
                  key={g.tmdb_id}
                  className={`filter-chip ${
                    draftFilters.genres.includes(g.genre)
                      ? "filter-chip--active"
                      : ""
                  }`}
                  onClick={() => handleGenreToggle(g.genre)}
                >
                  {g.genre}
                </button>
              ))}
            </div>
          </div>

          {/* --- Section Plateformes --- */}
          <div className="filter-section">
            <div className="filter-section__label">Plateformes</div>
            <div className="filter-chips">
              {availablePlateforms.map((p) => (
                <button
                  key={p.tmdb_id}
                  className={`filter-chip ${
                    draftFilters.plateforms.includes(p.plateform)
                      ? "filter-chip--active"
                      : ""
                  }`}
                  onClick={() => handlePlateformToggle(p.plateform)}
                >
                  {p.plateform}
                </button>
              ))}
            </div>
          </div>

          {/* --- Section Année --- */}
          <div className="filter-section">
            <div className="filter-section__label">Année de sortie</div>
            <div className="filter-year-row">
              <input
                type="number"
                className="filter-year-input"
                placeholder="Min"
                value={draftFilters.yearMin}
                onChange={(e) => handleYearChange("yearMin", e.target.value)}
              />
              <span className="filter-year-separator">à</span>
              <input
                type="number"
                className="filter-year-input"
                placeholder="Max"
                value={draftFilters.yearMax}
                onChange={(e) => handleYearChange("yearMax", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Pied du panneau : boutons d'action */}
        <div className="filter-sheet__footer">
          <button className="filter-btn-reset" onClick={handleReset}>
            Réinitialiser
          </button>
          <button className="filter-btn-apply" onClick={handleApply}>
            Appliquer
          </button>
        </div>
      </div>
    </>
  );
}

export default FilterBottomSheet;
