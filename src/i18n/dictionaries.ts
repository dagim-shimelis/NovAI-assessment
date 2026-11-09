export const en = {
  title: "Companies",
  placeholder: "Company management is coming soon.",
  languageLabel: "Language",
  english: "English",
  dutch: "Dutch",
} as const;

export type Dictionary = { [Key in keyof typeof en]: string };

export const nl: Dictionary = {
  title: "Bedrijven",
  placeholder: "Bedrijfsbeheer is binnenkort beschikbaar.",
  languageLabel: "Taal",
  english: "Engels",
  dutch: "Nederlands",
};
