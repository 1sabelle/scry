import { DAILY_LINES } from './days.js';

// Every piece of writing whose text contains `query`, ignoring case: check-in notes and each
// day's gratitude and success. Newest day first, and within a day in the order they are shown.
export function searchWriting(days, query) {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];
  const matches = [];
  for (const date of Object.keys(days).sort().reverse()) {
    for (const piece of writingOn(date, days[date])) if (piece.text.toLowerCase().includes(needle)) matches.push(piece);
  }
  return matches;
}

function writingOn(date, day) {
  return [
    ...day.checkIns.map((checkIn) => ({ id: checkIn.id, date, label: checkIn.time, text: checkIn.note })),
    ...DAILY_LINES.map((line) => ({ id: `${date}-${line.field}`, date, label: line.label, text: day[line.field] })),
  ].filter((piece) => piece.text.trim() !== '');
}
