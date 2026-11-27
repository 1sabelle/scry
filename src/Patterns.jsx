import { useState } from 'react';
import { moodLabel } from './days.js';
import { formatShort } from './dates.js';
import {
  MIN_DAYS_TO_COMPARE,
  TIMEFRAMES,
  averageMoodOn,
  compareMoodByHabit,
  countEmotions,
  periodsEnding,
  timeframeDayCount,
} from './insights.js';

// Roughly how many date labels fit under the grid.
const TICKS_SHOWN = 6;

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describePeriod(dates) {
  return dates.length === 1 ? formatShort(dates[0]) : `${formatShort(dates[0])} - ${formatShort(dates.at(-1))}`;
}

export default function Patterns({ data, today, onSelect }) {
  const [hovered, setHovered] = useState(null);
  const [timeframeId, setTimeframeId] = useState('3-months');
  const { days, habits } = data;
  const timeframe = TIMEFRAMES.find((candidate) => candidate.id === timeframeId);
  const dayCount = timeframeDayCount(timeframe, days, today);
  const periods = periodsEnding(today, dayCount);
  const activeHabits = habits.filter((habit) => !habit.archived);
  const comparisons = compareMoodByHabit(days, habits, periods[0][0]);
  const emotions = countEmotions(days, data.emotions, today, dayCount);
  const hasAnything = Object.keys(days).length > 0;
  const tickEvery = Math.ceil(periods.length / TICKS_SHOWN);

  return (
    <details className="patterns collapsible" open>
      <summary>Patterns</summary>
      {!hasAnything ? (
        <p className="empty">Check in and tick off habits for a while, and patterns will show here.</p>
      ) : (
        <>
          <div className="chips timeframes">
            {TIMEFRAMES.map((candidate) => (
              <button
                key={candidate.id}
                className={`chip small ${candidate.id === timeframeId ? 'on' : ''}`}
                aria-pressed={candidate.id === timeframeId}
                onClick={() => setTimeframeId(candidate.id)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <p className="readout">{hovered ?? ' '}</p>
          <div className="pattern-grid" style={{ gridTemplateColumns: `max-content repeat(${periods.length}, minmax(4px, 1fr))` }}>
            <span className="pattern-label">Mood</span>
            {periods.map((dates) => {
              const mood = averageMoodOn(days, dates);
              const description = `${describePeriod(dates)} · ${mood === null ? 'no check-ins' : `${moodLabel(Math.round(mood))} (${mood.toFixed(1)})`}`;
              return (
                <PatternCell key={dates[0]} dates={dates} className={mood !== null ? `mood-${Math.round(mood)}` : ''} description={description} onHover={setHovered} onSelect={onSelect} />
              );
            })}
            {activeHabits.map((habit) => (
              <HabitRow key={habit.id} habit={habit} periods={periods} days={days} onHover={setHovered} onSelect={onSelect} />
            ))}
            <span />
            {periods.map((dates, i) => (
              <span key={dates[0]} className="pattern-tick">{i % tickEvery === 0 ? formatShort(dates[0]) : ''}</span>
            ))}
          </div>

          {comparisons.length > 0 && (
            <>
              <h3>Mood and habits</h3>
              <p className="subheading">Average mood on days you did each habit versus days you didn't, since you first did it in this timeframe.</p>
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

          <h3>Emotions</h3>
          {emotions.length === 0 ? (
            <p className="empty">No emotions picked in check-ins yet.</p>
          ) : (
            <div className="chips">
              {emotions.map(({ emotion, count }) => (
                <span key={emotion.id} className="chip static">
                  {emotion.name} <span className="count">{count}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </details>
  );
}

function HabitRow({ habit, periods, days, onHover, onSelect }) {
  return (
    <>
      <span className="pattern-label">{habit.name}</span>
      {periods.map((dates) => {
        const doneDayCount = dates.filter((date) => days[date]?.habitsDone.includes(habit.id)).length;
        const doneText = dates.length === 1
          ? (doneDayCount === 1 ? 'done' : 'not done')
          : `done ${doneDayCount} of ${dates.length} days`;
        return (
          <PatternCell
            key={dates[0]}
            dates={dates}
            className={doneDayCount > 0 ? 'is-done' : ''}
            style={{ '--done-share': doneDayCount / dates.length }}
            description={`${describePeriod(dates)} · ${habit.name} ${doneText}`}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}
    </>
  );
}

// One period in the grid; selecting it opens its most recent day.
function PatternCell({ dates, className, style, description, onHover, onSelect }) {
  return (
    <button
      className={`pattern-cell ${className}`}
      style={style}
      aria-label={description}
      onMouseEnter={() => onHover(description)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(description)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(dates.at(-1))}
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
