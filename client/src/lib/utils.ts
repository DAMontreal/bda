import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd MMMM yyyy", { locale: fr });
}

export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd MMM", { locale: fr });
}

export function formatDateWithTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy HH:mm", { locale: fr });
}

export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: fr });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export const disciplines = [
  { value: "visual-arts", label: "Arts visuels" },
  { value: "music", label: "Musique" },
  { value: "theater", label: "Théâtre" },
  { value: "dance", label: "Danse" },
  { value: "literature", label: "Littérature" },
  { value: "digital-arts", label: "Arts numériques" },
  { value: "cinema", label: "Cinéma" },
  { value: "photography", label: "Photographie" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Autre" },
];

export const trocCategories = [
  { value: "collaboration", label: "Collaborations" },
  { value: "equipment", label: "Équipement" },
  { value: "service", label: "Services" },
  { value: "event", label: "Événements" },
];

export function getDisciplineLabel(value: string): string {
  const discipline = disciplines.find((d) => d.value === value);
  return discipline ? discipline.label : value;
}

export function getTrocCategoryLabel(value: string): string {
  const category = trocCategories.find((c) => c.value === value);
  return category ? category.label : value;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function getSocialMediaIcon(platform: string): string {
  switch (platform.toLowerCase()) {
    case "instagram":
      return "instagram";
    case "facebook":
      return "facebook";
    case "twitter":
      return "twitter";
    case "youtube":
      return "youtube";
    case "spotify":
      return "spotify";
    case "behance":
      return "behance";
    case "linkedin":
      return "linkedin";
    default:
      return "globe";
  }
}
