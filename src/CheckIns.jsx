import { useState } from 'react';
import { EMOTIONS, MOODS, moodLabel, newId, upsertById } from './days.js';
import { formatLong, nowTime } from './dates.js';

// Check-ins on past days default to midday, since the real time is unknown.
const PAST_DAY_TIME = '12:00';

function blankCheckIn(isToday) {
  return { id: null, time: isToday ? nowTime() : PAST_DAY_TIME, mood: null, emotions: [], note: '' };
}

export default function CheckIns({ date, isToday, checkIns, onChange }) {
  const [draft, setDraft] = useState(() => blankCheckIn(isToday));
  const isEditing = draft.id !== null;
  const update = (change) => setDraft({ ...draft, ...change });

  function toggleEmotion(emotion) {
    const emotions = draft.emotions.includes(emotion) ? draft.emotions.filter((e) => e !== emotion) : [...draft.emotions, emotion];
    update({ emotions });
  }

  function save() {
    onChange(upsertById(checkIns, { ...draft, id: draft.id ?? newId(), note: draft.note.trim() }));
    setDraft(blankCheckIn(isToday));
  }

  function remove(id) {
    onChange(checkIns.filter((checkIn) => checkIn.id !== id));
    if (draft.id === id) setDraft(blankCheckIn(isToday));
  }

  return (
    <div className="check-ins">
      <h2>{formatLong(date)}</h2>
      {checkIns.length > 0 && (
        <ul className="entry-list">
          {checkIns.map((checkIn) => (
            <li key={checkIn.id} className={`check-in ${checkIn.id === draft.id ? 'is-editing' : ''}`}>
              <button className="entry-body" onClick={() => setDraft(checkIn)} aria-label={`Edit the ${checkIn.time} check-in`}>
                <span className="entry-time">{checkIn.time}</span>
                <span className={`mood-dot mood-${checkIn.mood}`} />
                <span className="check-in-mood">{moodLabel(checkIn.mood)}</span>
                {checkIn.emotions.length > 0 && <span className="check-in-emotions">{checkIn.emotions.join(', ')}</span>}
                {checkIn.note && <span className="check-in-note">{checkIn.note}</span>}
              </button>
              <button className="remove" onClick={() => remove(checkIn.id)} aria-label={`Delete the ${checkIn.time} check-in`}>×</button>
            </li>
          ))}
        </ul>
      )}

      <fieldset>
        <legend>
          {isEditing ? 'Edit check-in' : 'How are you feeling?'}
          <input type="time" className="time-input" value={draft.time} onChange={(e) => e.target.value && update({ time: e.target.value })} aria-label="Time" />
        </legend>
        <div className="chips">
          {MOODS.map((mood) => (
            <button
              key={mood.level}
              className={`chip mood-chip mood-${mood.level} ${draft.mood === mood.level ? 'on' : ''}`}
              aria-pressed={draft.mood === mood.level}
              onClick={() => update({ mood: mood.level })}
            >
              <span className={`mood-dot mood-${mood.level}`} />
              {mood.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Emotions</legend>
        <div className="chips">
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              className={`chip small ${draft.emotions.includes(emotion) ? 'on' : ''}`}
              aria-pressed={draft.emotions.includes(emotion)}
              onClick={() => toggleEmotion(emotion)}
            >
              {emotion}
            </button>
          ))}
        </div>
      </fieldset>

      <textarea rows={2} placeholder="A note about this moment (optional)" value={draft.note} onChange={(e) => update({ note: e.target.value })} />
      <div className="form-actions">
        <button className="primary" disabled={draft.mood === null} onClick={save}>
          {isEditing ? 'Save check-in' : 'Check in'}
        </button>
        {isEditing && <button onClick={() => setDraft(blankCheckIn(isToday))}>Cancel</button>}
      </div>
    </div>
  );
}
