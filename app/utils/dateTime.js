export const APP_TIME_ZONE = 'America/Campo_Grande';
export const APP_DATE_LOCALE = 'pt-BR';

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormatter = new Intl.DateTimeFormat(APP_DATE_LOCALE, {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const dateTimeFormatter = new Intl.DateTimeFormat(APP_DATE_LOCALE, {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

function getDateOnlyMatch(value) {
  if (typeof value !== 'string') return null;
  return DATE_ONLY_REGEX.exec(value.trim());
}

function toValidDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateInAppTimezone(value, fallback = '-') {
  if (!value) return fallback;

  const dateOnlyMatch = getDateOnlyMatch(value);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
  }

  const parsed = toValidDate(value);
  if (!parsed) return fallback;
  return dateFormatter.format(parsed);
}

export function formatDateTimeInAppTimezone(value, fallback = '-') {
  if (!value) return fallback;

  const parsed = toValidDate(value);
  if (!parsed) return fallback;
  return dateTimeFormatter.format(parsed);
}

export function getTodayDateInputValue() {
  const parts = dateFormatter.formatToParts(new Date());
  const values = parts.reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  return `${values.year}-${values.month}-${values.day}`;
}
