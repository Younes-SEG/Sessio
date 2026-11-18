/** Locale-aware numbers for UI copy: fr-CA writes 8,5 % (comma, no-break space), en-CA 8.5%. */
export function formatNumber(
  value: number,
  locale: string,
  maximumFractionDigits = 1,
  minimumFractionDigits = 0,
): string {
  return value.toLocaleString(locale, { maximumFractionDigits, minimumFractionDigits });
}

export function formatPercent(
  value: number,
  locale: string,
  maximumFractionDigits = 1,
  minimumFractionDigits = 0,
): string {
  const number = formatNumber(value, locale, maximumFractionDigits, minimumFractionDigits);
  return locale.startsWith('fr') ? `${number} %` : `${number}%`;
}

/** Singular wording for this count? French uses the singular for 0 and 1 (« 0 tâche »). */
export function isSingular(count: number, locale: string): boolean {
  return new Intl.PluralRules(locale).select(count) === 'one';
}
