import { useState } from 'react';
import { MOODS, averageMood } from './days.js';
import { formatMonth, isoForYearMonthDay, weekdayMondayFirst } from './dates.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Calendar({ days, today, selectedDate, onSelect }) {
  const [shownMonth, setShownMonth] = useState(() => {
    const [year, month] = today.split('-').map(Number);
    return { year, monthIndex: month - 1 };
  });
  const { year, monthIndex } = shownMonth;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingBlanks = weekdayMondayFirst(isoForYearMonthDay(year, monthIndex, 1));
  const dates = Array.from({ length: daysInMonth }, (_, i) => isoForYearMonthDay(year, monthIndex, i + 1));

  function shiftMonth(delta) {
    const shifted = new Date(Date.UTC(year, monthIndex + delta, 1));
    setShownMonth({ year: shifted.getUTCFullYear(), monthIndex: shifted.getUTCMonth() });
  }

  return (
    <section className="calendar">
      <div className="calendar-nav">
        <button onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
        <h2>{formatMonth(year, monthIndex)}</h2>
        <button onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
      </div>
      <div className="grid">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="weekday">{weekday}</div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {dates.map((date) => {
          const day = days[date];
          const mood = averageMood(day);
          const classes = [
            'day',
            mood !== null && `mood-${Math.round(mood)}`,
            date === today && 'is-today',
            date === selectedDate && 'is-selected',
            date > today && 'is-future',
          ].filter(Boolean);
          return (
            <button key={date} className={classes.join(' ')} onClick={() => onSelect(date)}>
              <span className="number">{Number(date.slice(8))}</span>
              <span className="marks">
                {day?.habitsDone.length > 0 && <HabitMark count={day.habitsDone.length} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="legend">
        {MOODS.map((mood) => (
          <span key={mood.level}><i className={`swatch mood-${mood.level}`} /> {mood.label}</span>
        ))}
        <span><HabitMark count={1} /> Habit done</span>
      </div>
    </section>
  );
}

// One tick per habit done, up to three.
function HabitMark({ count }) {
  return <span className="habit-mark">{'✓'.repeat(Math.min(count, 3))}</span>;
}
