import { useState } from 'react';
import { averageMood, moodLabel } from './days.js';
import { formatShort } from './dates.js';
import { MIN_DAYS_TO_COMPARE, compareMoodByHabit, countEmotions, recentWeekDates } from './insights.js';

const WEEKS_SHOWN = 12;
const EMOTION_WINDOW_DAYS = 30;

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export default function Patterns({ data, today, onSelect }) {
  const [hovered, setHovered] = useState(null);
  const { days, habits } = data;
  const dates = recentWeekDates(today, WEEKS_SHOWN);
  const activeHabits = habits.filter((habit) => !habit.archived);
  const comparisons = compareMoodByHabit(days, habits);
  const emotions = countEmotions(days, today, EMOTION_WINDOW_DAYS);
  const hasAnything = Object.keys(days).length > 0;

  return (
    <details className="patterns collapsible" open>
      <summary>Patterns</summary>
      {!hasAnything ? (
        <p className="empty">Check in and tick off habits for a while, and patterns will show here.</p>
      ) : (
        <>
          <h3>Last {WEEKS_SHOWN} weeks</h3>
          <p className="readout">{hovered ?? ' '}</p>
          <div className="pattern-grid" style={{ gridTemplateColumns: `max-content repeat(${dates.length}, minmax(4px, 1fr))` }}>
            <span className="pattern-label">Mood</span>
            {dates.map((date) => {
              const mood = averageMood(days[date]);
              const description = `${formatShort(date)} · ${mood === null ? 'no check-ins' : `${moodLabel(Math.round(mood))} (${mood.toFixed(1)})`}`;
              return (
                <PatternCell key={date} date={date} today={today} className={mood !== null ? `mood-${Math.round(mood)}` : ''} description={description} onHover={setHovered} onSelect={onSelect} />
              );
            })}
            {activeHabits.map((habit) => (
              <HabitRow key={habit.id} habit={habit} dates={dates} days={days} today={today} onHover={setHovered} onSelect={onSelect} />
            ))}
            <span />
            {dates.map((date, i) => (
              <span key={date} className="pattern-tick">{i % 7 === 0 ? formatShort(date) : ''}</span>
            ))}
          </div>

          {comparisons.length > 0 && (
            <>
              <h3>Mood and habits</h3>
              <p className="subheading">Average mood on days you did each habit versus days you didn't, since you first did it.</p>
              <table className="comparison">
                <thead>
                  <tr><th>Habit</th><th>Done</th><th>Mood when done</th><th>Mood when not</th><th /></tr>
                </thead>
                <tbody>
                  {comparisons.map((comparison) => (
                    <ComparisonRow key={comparison.habit.id} comparison={comparison} />
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h3>Emotions in the last {EMOTION_WINDOW_DAYS} days</h3>
          {emotions.length === 0 ? (
            <p className="empty">No emotions picked in check-ins yet.</p>
          ) : (
            <div className="chips">
              {emotions.map(({ emotion, count }) => (
                <span key={emotion} className="chip static">
                  {emotion} <span className="count">{count}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </details>
  );
}

function HabitRow({ habit, dates, days, today, onHover, onSelect }) {
  return (
    <>
      <span className="pattern-label">{habit.name}</span>
      {dates.map((date) => {
        const isDone = days[date]?.habitsDone.includes(habit.id) ?? false;
        return (
          <PatternCell
            key={date}
            date={date}
            today={today}
            className={isDone ? 'is-done' : ''}
            description={`${formatShort(date)} · ${habit.name} ${isDone ? 'done' : 'not done'}`}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}
    </>
  );
}

function PatternCell({ date, today, className, description, onHover, onSelect }) {
  if (date > today) return <span className="pattern-cell is-future" />;
  return (
    <button
      className={`pattern-cell ${className}`}
      aria-label={description}
      onMouseEnter={() => onHover(description)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(description)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(date)}
    />
  );
}

function ComparisonRow({ comparison }) {
  const { habit, doneCount, skippedCount, moodWhenDone, moodWhenSkipped, hasEnoughDays } = comparison;
  const difference = hasEnoughDays ? moodWhenDone - moodWhenSkipped : null;
  return (
    <tr>
      <td>{habit.name}</td>
      <td>{plural(doneCount, 'day')}</td>
      <td>{moodWhenDone === null ? '-' : moodWhenDone.toFixed(1)}</td>
      <td>{moodWhenSkipped === null ? '-' : moodWhenSkipped.toFixed(1)}</td>
      <td className="hint">
        {hasEnoughDays
          ? `${difference >= 0 ? '+' : ''}${difference.toFixed(1)}`
          : `Needs ${MIN_DAYS_TO_COMPARE} days each way (${doneCount} done, ${skippedCount} not)`}
      </td>
    </tr>
  );
}
