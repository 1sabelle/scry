import { DEFAULT_EMOTIONS, MOOD_LEVELS, isEmptyDay } from './days.js';
import { MIDNIGHT, isIsoDate } from './dates.js';

const STORAGE_KEY = 'scry.v1';
const CORRUPT_BACKUP_KEY = 'scry.v1.corrupt';
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const EMPTY_DATA = {
  habits: [],
  emotions: DEFAULT_EMOTIONS,
  dayStartTime: MIDNIGHT,
  days: {},
};

export function loadData() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_DATA;
  }
  if (!raw) return EMPTY_DATA;
  try {
    return parseData(JSON.parse(raw)).data;
  } catch {
    // Keep the unreadable data aside instead of overwriting it on the next save.
    try {
      localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      /* nothing more we can do */
    }
    return EMPTY_DATA;
  }
}

// Asks the browser not to clear this site's storage on its own (for example when disk space runs low).
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Validates every entry and reports all problems at once; invalid entries are skipped.
export function parseData(json) {
  if (typeof json !== 'object' || json === null || typeof json.days !== 'object' || json.days === null) {
    throw new Error('Expected an object with a "days" field.');
  }
  const errors = [];
  const habits = parseList(json.habits, 'habits', errors, collectHabitErrors, normalizeHabit);
  // Data saved before emotions became editable has none, and starts with the default ones.
  const emotions = json.emotions === undefined ? DEFAULT_EMOTIONS : parseList(json.emotions, 'emotions', errors, collectOptionErrors, normalizeOption);
  const dayStartTime = parseDayStartTime(json.dayStartTime, errors);
  const habitIds = new Set(habits.map((habit) => habit.id));
  const optionIds = { emotions: idsOf(emotions) };
  const days = {};
  for (const [date, savedDay] of Object.entries(json.days)) {
    const day = parseDay(date, savedDay, habitIds, optionIds, errors);
    if (day && !isEmptyDay(day)) days[date] = day;
  }
  return { data: { habits, emotions, dayStartTime, days }, errors };
}

function idsOf(list) {
  return new Set(list.map((entry) => entry.id));
}

function parseDayStartTime(dayStartTime, errors) {
  if (dayStartTime === undefined) return MIDNIGHT;
  if (TIME_PATTERN.test(dayStartTime)) return dayStartTime;
  errors.push(`dayStartTime: "${dayStartTime}" is not a time in HH:MM format, so the day starts at ${MIDNIGHT}.`);
  return MIDNIGHT;
}

function parseList(list, name, errors, collectErrors, normalize) {
  if (list === undefined) return [];
  if (!Array.isArray(list)) {
    errors.push(`${name}: "${JSON.stringify(list)}" is not a list.`);
    return [];
  }
  const parsed = [];
  list.forEach((entry, i) => {
    const entryErrors = collectErrors(entry, `${name}[${i}]`);
    if (entryErrors.length > 0) errors.push(...entryErrors);
    else parsed.push(normalize(entry));
  });
  return parsed;
}

function collectHabitErrors(habit, where) {
  if (!isObject(habit)) return [`${where}: expected an object, got "${JSON.stringify(habit)}".`];
  const errors = [];
  if (!isNonEmptyText(habit.id)) errors.push(`${where}: id "${habit.id}" is not text.`);
  // An empty name is allowed: it can be saved mid-edit, while the name is being retyped.
  if (typeof habit.name !== 'string') errors.push(`${where}: name "${habit.name}" is not text.`);
  if (habit.archived !== undefined && typeof habit.archived !== 'boolean')
    errors.push(`${where}: archived "${habit.archived}" is not true or false.`);
  return errors;
}

function normalizeHabit(habit) {
  return { id: habit.id, name: habit.name, archived: habit.archived ?? false };
}

// An option is an emotion a check-in can pick.
function collectOptionErrors(option, where) {
  if (!isObject(option)) return [`${where}: expected an object, got "${JSON.stringify(option)}".`];
  const errors = [];
  if (!isNonEmptyText(option.id)) errors.push(`${where}: id "${option.id}" is not text.`);
  // An empty name is allowed: it can be saved mid-edit, while the name is being retyped.
  if (typeof option.name !== 'string') errors.push(`${where}: name "${option.name}" is not text.`);
  if (option.archived !== undefined && typeof option.archived !== 'boolean')
    errors.push(`${where}: archived "${option.archived}" is not true or false.`);
  return errors;
}

function normalizeOption(option) {
  return { id: option.id, name: option.name, archived: option.archived ?? false };
}

// A day keeps its valid entries; each invalid entry is reported and dropped on its own.
function parseDay(date, day, habitIds, optionIds, errors) {
  if (!isIsoDate(date)) {
    errors.push(`${date}: "${date}" is not a date in YYYY-MM-DD format.`);
    return null;
  }
  if (!isObject(day)) {
    errors.push(`${date}: expected an object, got "${JSON.stringify(day)}".`);
    return null;
  }
  const checkIns = parseList(
    day.checkIns,
    `${date} checkIns`,
    errors,
    (checkIn, where) => collectCheckInErrors(checkIn, where, optionIds),
    normalizeCheckIn,
  );
  const habitsDone = [];
  if (day.habitsDone !== undefined && !Array.isArray(day.habitsDone)) errors.push(`${date}: habitsDone "${day.habitsDone}" is not a list.`);
  for (const habitId of Array.isArray(day.habitsDone) ? day.habitsDone : []) {
    if (habitIds.has(habitId)) habitsDone.push(habitId);
    else errors.push(`${date}: habitsDone "${habitId}" is not the id of a habit.`);
  }
  const gratitude = parseOptionalText(day.gratitude, `${date}: gratitude`, errors);
  const success = parseOptionalText(day.success, `${date}: success`, errors);
  return { checkIns, habitsDone, gratitude, success };
}

function parseOptionalText(text, where, errors) {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  errors.push(`${where} "${text}" is not text.`);
  return '';
}

function collectCheckInErrors(checkIn, where, optionIds) {
  if (!isObject(checkIn)) return [`${where}: expected an object, got "${JSON.stringify(checkIn)}".`];
  const errors = [];
  if (!isNonEmptyText(checkIn.id)) errors.push(`${where}: id "${checkIn.id}" is not text.`);
  if (!TIME_PATTERN.test(checkIn.time)) errors.push(`${where}: time "${checkIn.time}" is not a time in HH:MM format.`);
  if (!MOOD_LEVELS.includes(checkIn.mood)) errors.push(`${where}: mood "${checkIn.mood}" is not one of ${MOOD_LEVELS.join(', ')}.`);
  errors.push(...collectPickedOptionErrors(checkIn.emotions, optionIds.emotions, 'emotions', 'emotion', where));
  if (checkIn.note !== undefined && typeof checkIn.note !== 'string') errors.push(`${where}: note "${checkIn.note}" is not text.`);
  return errors;
}

function collectPickedOptionErrors(pickedIds, optionIds, field, singular, where) {
  if (pickedIds === undefined) return [];
  if (!Array.isArray(pickedIds)) return [`${where}: ${field} "${pickedIds}" is not a list.`];
  const article = /^[aeiou]/.test(singular) ? 'an' : 'a';
  return pickedIds.filter((id) => !optionIds.has(id)).map((id) => `${where}: ${singular} "${id}" is not the id of ${article} ${singular}.`);
}

function normalizeCheckIn(checkIn) {
  return { id: checkIn.id, time: checkIn.time, mood: checkIn.mood, emotions: checkIn.emotions ?? [], note: checkIn.note ?? '' };
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim() !== '';
}
