const moment = require('moment-timezone');

const APP_TIMEZONE = process.env.APP_TIMEZONE || process.env.TIMEZONE || 'America/Campo_Grande';
const DATE_ONLY_FORMAT = 'YYYY-MM-DD';
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function now() {
  return moment.tz(APP_TIMEZONE).toDate();
}

function todayDateOnly() {
  return moment.tz(APP_TIMEZONE).format(DATE_ONLY_FORMAT);
}

function isDateOnlyString(value) {
  return typeof value === 'string' && DATE_ONLY_REGEX.test(value.trim());
}

function parseDateOnly(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;

  const parsed = moment.tz(normalized, DATE_ONLY_FORMAT, true, APP_TIMEZONE);
  return parsed.isValid() ? parsed : null;
}

function toDateOnlyString(value) {
  if (value === undefined || value === null) return null;

  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return dateOnly.format(DATE_ONLY_FORMAT);
  }

  const parsed = moment(value);
  if (!parsed.isValid()) return null;
  return parsed.tz(APP_TIMEZONE).format(DATE_ONLY_FORMAT);
}

function toDate(value) {
  if (value === undefined || value === null) return null;

  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return dateOnly.toDate();
  }

  const parsed = moment(value);
  return parsed.isValid() ? parsed.toDate() : null;
}

function toStartOfDay(value) {
  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return dateOnly.startOf('day').toDate();
  }

  const parsed = moment(value);
  if (!parsed.isValid()) return null;
  return parsed.tz(APP_TIMEZONE).startOf('day').toDate();
}

function toEndOfDay(value) {
  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return dateOnly.endOf('day').toDate();
  }

  const parsed = moment(value);
  if (!parsed.isValid()) return null;
  return parsed.tz(APP_TIMEZONE).endOf('day').toDate();
}

function buildDayRange(value) {
  const parsed = parseDateOnly(value);
  if (!parsed) return null;

  return {
    iso: parsed.format(DATE_ONLY_FORMAT),
    start: parsed.clone().startOf('day').toDate(),
    end: parsed.clone().endOf('day').toDate()
  };
}

module.exports = {
  APP_TIMEZONE,
  buildDayRange,
  isDateOnlyString,
  now,
  parseDateOnly,
  toDate,
  toDateOnlyString,
  toEndOfDay,
  toStartOfDay,
  todayDateOnly
};
