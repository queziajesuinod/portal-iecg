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

// Offset (ms) do fuso `timeZone` no instante `date`: asUTC(wall-clock) - date.
function getTimeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return asUTC - date.getTime();
}

// "YYYY-MM-DDTHH:mm" (hora de parede no fuso do app) -> ISO (instante UTC) para gravar.
// Ex.: "2026-09-18T18:00" em Campo Grande (UTC-4) -> "2026-09-18T22:00:00.000Z".
export function dateTimeLocalToISO(value, timeZone = APP_TIME_ZONE) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value).trim());
  if (!match) return null;
  const asUTC = Date.UTC(
    Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0
  );
  const offset = getTimeZoneOffsetMs(new Date(asUTC), timeZone);
  const instant = new Date(asUTC - offset);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

// ISO/UTC armazenado -> "YYYY-MM-DDTHH:mm" no fuso do app, para o input datetime-local.
export function toDateTimeLocalInput(value, timeZone = APP_TIME_ZONE) {
  const parsed = toValidDate(value);
  if (!parsed) return '';
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  const parts = dtf.formatToParts(parsed).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
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
