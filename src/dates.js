// Dates are handled as ISO day strings ("2026-11-18") and computed in UTC,
// so daylight saving changes never shift a day.
const MS_PER_DAY = 86400000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(text) {
  return typeof text === 'string' && ISO_DATE_PATTERN.test(text) && formatIso(parseIso(text)) === text;
}

function parseIso(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatIso(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  return formatIso(parseIso(isoDate) + days * MS_PER_DAY);
}

export function daysBetween(fromIsoDate, toIsoDate) {
  return Math.round((parseIso(toIsoDate) - parseIso(fromIsoDate)) / MS_PER_DAY);
}

// Today's date for a day that starts at `dayStartTime`: with "04:00", 01:30 still belongs to yesterday.
export function todayIso(dayStartTime = MIDNIGHT) {
  const now = new Date(Date.now() - minutesOfDay(dayStartTime) * 60000);
  return formatIso(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export const MIDNIGHT = '00:00';

// Minutes since midnight of an "HH:MM" time.
export function minutesOfDay(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isoForYearMonthDay(year, monthIndex, day) {
  return formatIso(Date.UTC(year, monthIndex, day));
}

export function weekdayMondayFirst(isoDate) {
  return (new Date(parseIso(isoDate)).getUTCDay() + 6) % 7;
}

export function formatShort(isoDate) {
  return new Date(parseIso(isoDate)).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatLong(isoDate) {
  return new Date(parseIso(isoDate)).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// The current local time as "HH:MM".
export function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
