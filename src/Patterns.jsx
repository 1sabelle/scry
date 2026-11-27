import { useState } from 'react';
import { moodLabel } from './days.js';
import { formatShort } from './dates.js';
import {
  MIN_DAYS_TO_COMPARE,
  TIMEFRAMES,
  compareMoodByHabit,
  countEmotions,
  isNeutralMood,
  medianMoodOn,
  moodByActivity,
  periodsEnding,
  timeframeDayCount,
} from './insights.js';

// The chosen timeframe is remembered in this browser, apart from the logged data (it is not exported).
const TIMEFRAME_KEY = 'scry.patterns.timeframe';
const DEFAULT_TIMEFRAME_ID = '3-months';

function loadTimeframeId() {
  try {
    const savedId = localStorage.getItem(TIMEFRAME_KEY);
    return TIMEFRAMES.some((timeframe) => timeframe.id === savedId) ? savedId : DEFAULT_TIMEFRAME_ID;
  } catch {
    return DEFAULT_TIMEFRAME_ID;
  }
}

function saveTimeframeId(timeframeId) {
  try {
    localStorage.setItem(TIMEFRAME_KEY, timeframeId);
  } catch {
    /* it is only a convenience; the default shows next time */
  }
}

// Roughly how many date labels fit under the grid.
const TICKS_SHOWN = 6;

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// Middling periods are grey rather than coloured, so the good and bad stretches stand out.
function moodClass(medianMood) {
  if (medianMood === null) return '';
  return isNeutralMood(medianMood) ? 'mood-neutral' : `mood-${Math.round(medianMood)}`;
}

function describeMedianMood(medianMood) {
  if (medianMood === null) return 'no check-ins';
  return `${isNeutralMood(medianMood) ? 'neutral' : moodLabel(Math.round(medianMood))} (median ${medianMood})`;
}

function describePeriod(dates) {
  return dates.length === 1 ? formatShort(dates[0]) : `${formatShort(dates[0])} - ${formatShort(dates.at(-1))}`;
}

export default function Patterns({ data, today, onSelect }) {
  const [hovered, setHovered] = useState(null);
  const [timeframeId, setTimeframeId] = useState(loadTimeframeId);
  const { days, habits } = data;
  const timeframe = TIMEFRAMES.find((candidate) => candidate.id === timeframeId);
  const dayCount = timeframeDayCount(timeframe, days, today);
  const periods = periodsEnding(today, dayCount);
  const activeHabits = habits.filter((habit) => !habit.archived);
  const comparisons = compareMoodByHabit(days, habits, periods[0][0]);
  const emotions = countEmotions(days, data.emotions, today, dayCount);
  const activities = moodByActivity(days, data.activities, today, dayCount);
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
                onClick={() => {
                  setTimeframeId(candidate.id);
                  saveTimeframeId(candidate.id);
                }}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <p className="readout">{hovered ?? ' '}</p>
          <div className="pattern-grid" style={{ gridTemplateColumns: `max-content repeat(${periods.length}, minmax(4px, 1fr))` }}>
            <span className="pattern-label">Mood</span>
            {periods.map((dates) => {
              const mood = medianMoodOn(days, dates);
              return (
                <PatternCell key={dates[0]} dates={dates} className={moodClass(mood)} description={`${describePeriod(dates)} · ${describeMedianMood(mood)}`} onHover={setHovered} onSelect={onSelect} />
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

          <h3>Mood and activities</h3>
          {activities.length === 0 ? (
            <p className="empty">No activities picked in check-ins yet.</p>
          ) : (
            <>
              <p className="subheading">Average mood of the check-ins you picked each activity in.</p>
              <div className="chips">
                {activities.map(({ activity, count, averageMood }) => (
                  <span key={activity.id} className="chip static">
                    <span className={`mood-dot mood-${Math.round(averageMood)}`} />
                    {activity.name} <span className="count">{averageMood.toFixed(1)} · {count}×</span>
                  </span>
                ))}
              </div>
            </>
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
