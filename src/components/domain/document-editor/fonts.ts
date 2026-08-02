export type FontGroup = {
  label: string;
  fonts: { name: string; stack: string }[];
};

/** Word-like font catalog for the Document Editor ribbon. */
export const DOCUMENT_FONT_GROUPS: FontGroup[] = [
  {
    label: "Sans",
    fonts: [
      { name: "Plus Jakarta Sans", stack: '"Plus Jakarta Sans", system-ui, sans-serif' },
      { name: "Inter", stack: '"Inter", system-ui, sans-serif' },
      { name: "Roboto", stack: '"Roboto", system-ui, sans-serif' },
      { name: "Open Sans", stack: '"Open Sans", system-ui, sans-serif' },
      { name: "Lato", stack: '"Lato", system-ui, sans-serif' },
      { name: "Montserrat", stack: '"Montserrat", system-ui, sans-serif' },
      { name: "Poppins", stack: '"Poppins", system-ui, sans-serif' },
      { name: "Nunito", stack: '"Nunito", system-ui, sans-serif' },
      { name: "Arial", stack: "Arial, Helvetica, sans-serif" },
    ],
  },
  {
    label: "Serif",
    fonts: [
      { name: "Merriweather", stack: '"Merriweather", Georgia, serif' },
      { name: "Playfair Display", stack: '"Playfair Display", Georgia, serif' },
      { name: "Libre Baskerville", stack: '"Libre Baskerville", Georgia, serif' },
      { name: "Source Serif 4", stack: '"Source Serif 4", Georgia, serif' },
      { name: "Georgia", stack: "Georgia, 'Times New Roman', serif" },
      { name: "Times New Roman", stack: "'Times New Roman', Times, serif" },
    ],
  },
  {
    label: "Display",
    fonts: [
      { name: "Syne", stack: '"Syne", system-ui, sans-serif' },
      { name: "Space Grotesk", stack: '"Space Grotesk", system-ui, sans-serif' },
    ],
  },
  {
    label: "Mono",
    fonts: [
      { name: "IBM Plex Mono", stack: '"IBM Plex Mono", ui-monospace, monospace' },
      { name: "Courier New", stack: "'Courier New', Courier, monospace" },
    ],
  },
];

/** Google Fonts CSS for faces that need loading (system fonts omitted). */
export const DOCUMENT_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Inter:wght@400;500;600;700",
    "family=Roboto:wght@400;500;700",
    "family=Open+Sans:wght@400;600;700",
    "family=Lato:wght@400;700",
    "family=Montserrat:wght@400;600;700",
    "family=Poppins:wght@400;500;600;700",
    "family=Nunito:wght@400;600;700",
    "family=Merriweather:wght@400;700",
    "family=Playfair+Display:wght@400;600;700",
    "family=Libre+Baskerville:wght@400;700",
    "family=Source+Serif+4:wght@400;600;700",
    "family=Space+Grotesk:wght@400;500;600;700",
    "family=Plus+Jakarta+Sans:wght@400;500;600;700;800",
    "family=Syne:wght@600;700;800",
    "family=IBM+Plex+Mono:wght@400;500",
  ].join("&") +
  "&display=swap";

export function fontStackForName(name: string): string {
  for (const group of DOCUMENT_FONT_GROUPS) {
    const hit = group.fonts.find((f) => f.name === name);
    if (hit) return hit.stack;
  }
  return `"${name}", system-ui, sans-serif`;
}
