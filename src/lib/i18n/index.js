import en from './en.js';
import de from './de.js';

export const defaultLocale = 'en';

export const translations = {
  en,
  de
};

/**
 * @param {string | Record<string, string> | null | undefined} value
 * @param {'en' | 'de'} [locale]
 */
export function resolveLocalizedValue(value, locale = defaultLocale) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value[defaultLocale] ?? value.de ?? value.en ?? '';
}
