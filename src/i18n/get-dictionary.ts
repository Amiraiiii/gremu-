import "server-only";
import type { Locale } from "./config";
import ru from "./dictionaries/ru";
import uz from "./dictionaries/uz";

const dictionaries = { ru, uz };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
