"use client";

import {
  DataGrid,
  createDataGridColumns,
  useDataGrid,
  type DataGridLabels,
} from "@/registry/kadal/ui/data-grid";

import { makePeople, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.text("name", { header: "Nom" }),
  col.enum("status", {
    header: "Statut",
    options: [
      { value: "active", label: "Actif" },
      { value: "invited", label: "Invité" },
      { value: "paused", label: "En pause" },
      { value: "churned", label: "Résilié" },
    ],
  }),
  col.currency("mrr", { header: "MRR", currency: "EUR" }),
  col.percent("usage", { header: "Utilisation" }),
  col.boolean("active", { header: "Actif" }),
  col.date("joinedAt", { header: "Inscrit le" }),
  col.datetime("lastSeenAt", { header: "Vu le" }),
]);

/** A partial translation: anything left out falls back to English. */
const fr: Partial<DataGridLabels> = {
  search: "Rechercher…",
  clearFilters: "Effacer",
  filters: (n) => (n === 1 ? "1 filtre" : `${n} filtres`),
  view: "Affichage",
  viewColumns: "Colonnes",
  searchColumns: "Rechercher une colonne…",
  hidden: (n) => (n === 1 ? "1 masquée" : `${n} masquées`),
  showAll: "Tout afficher",
  resetView: "Réinitialiser",
  density: "Densité",
  densityCompact: "Compacte",
  densityComfortable: "Confortable",
  densitySpacious: "Aérée",
  export: "Exporter",
  exportCsv: "Télécharger en CSV",
  exportJson: "Télécharger en JSON",
  exportCopy: "Copier",
  exportSelectedOnly: "Lignes sélectionnées uniquement",
  group: "Grouper",
  groupBy: (c) => `Grouper par ${c}`,
  ungroup: "Dégrouper",
  groupedBy: "Groupé par",
  clearGrouping: "Supprimer le regroupement",
  fullscreen: "Plein écran",
  exitFullscreen: "Quitter le plein écran",
  sortAsc: "Tri croissant",
  sortDesc: "Tri décroissant",
  clearSort: "Annuler le tri",
  pinStart: "Épingler au début",
  pinEnd: "Épingler à la fin",
  unpin: "Désépingler",
  hideColumn: "Masquer la colonne",
  autosize: "Ajuster au contenu",
  filter: "Filtrer",
  filterPlaceholder: "Rechercher une valeur…",
  filterTrue: "Oui",
  filterFalse: "Non",
  rowsPerPage: "Lignes par page",
  pageOf: (page, pages) => `Page ${page} sur ${pages}`,
  previousPage: "Page précédente",
  nextPage: "Page suivante",
  rowsCount: (n) => (n === 1 ? "1 ligne" : `${n.toLocaleString("fr-FR")} lignes`),
  selected: (n) => (n === 1 ? "1 sélectionnée" : `${n} sélectionnées`),
  copied: (n) => (n === 1 ? "1 cellule copiée" : `${n} cellules copiées`),
  copiedRows: (n) => (n === 1 ? "1 ligne copiée" : `${n} lignes copiées`),
  columnMenu: "Menu de la colonne",
  rowActions: "Actions",
  moveLeft: "Déplacer à gauche",
  moveRight: "Déplacer à droite",
  values: (n) => (n === 1 ? "1 valeur" : `${n} valeurs`),
  outOfRange: (min, max) =>
    min !== undefined && max !== undefined
      ? `Doit être entre ${min} et ${max}`
      : min !== undefined
        ? `Doit être au moins ${min}`
        : max !== undefined
          ? `Doit être au plus ${max}`
          : "Hors limites",
  empty: "Aucun enregistrement.",
  emptyFiltered: "Aucune ligne ne correspond aux filtres.",
  yes: "Oui",
  no: "Non",
};

const data = makePeople(40, 47);

/** French labels and `fr-FR` number and date formatting. */
export default function DataGridI18n() {
  const grid = useDataGrid<Person>({
    name: "i18n",
    data,
    columns,
    getRowId: (r) => r.id,
    labels: fr,
    locale: "fr-FR",
    selection: false,
    pagination: { pageSize: 8 },
  });
  return <DataGrid grid={grid} />;
}
