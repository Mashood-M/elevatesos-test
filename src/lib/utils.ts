import { clsx, type ClassValue } from "clsx";
import { formatDate as formatDateTz, formatDateTime as formatDateTimeTz } from "@/lib/datetime";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso: string) {
  return formatDateTz(iso);
}

export function formatDateTime(iso: string) {
  return formatDateTimeTz(iso);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
