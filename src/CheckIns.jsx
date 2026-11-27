import { useState } from 'react';
import { MOODS, moodLabel, newId, upsertById } from './days.js';
import { formatLong, nowTime } from './dates.js';

// Check-ins on past days default to midday, since the real time is unknown.
const PAST_DAY_TIME = '12:00';

function blankCheckIn(isToday) {
  return { id: null, time: isToday ? nowTime() : PAST_DAY_TIME, mood: null, emotions: [], note: '' };
}

// Emotions are added and edited under Settings.
export default function CheckIns({ date, isToday, checkIns, emotions, onChange }) {
  const [draft, setDraft] = useState(() => blankCheckIn(isToday));
  const isEditing = draft.id !== null;
  const update = (change) => setDraft({ ...draft, ...change });

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
                <EmotionNames checkIn={checkIn} emotions={emotions} />
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

      <OptionPicker title="Emotions" options={emotions} pickedIds={draft.emotions} onChange={(ids) => update({ emotions: ids })} />

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

// The names of the emotions a check-in picked: "tired, calm".
function EmotionNames({ checkIn, emotions }) {
  if (checkIn.emotions.length === 0) return null;
  const names = checkIn.emotions.map((id) => emotions.find((emotion) => emotion.id === id)?.name);
  return <span className="check-in-emotions">{names.join(', ')}</span>;
}

// Chips to pick emotions. An archived one still shows while it is picked, so editing an old check-in keeps it.
function OptionPicker({ title, options, pickedIds, onChange }) {
  const pickable = options.filter((option) => !option.archived || pickedIds.includes(option.id));

  function toggle(optionId) {
    onChange(pickedIds.includes(optionId) ? pickedIds.filter((id) => id !== optionId) : [...pickedIds, optionId]);
  }

  return (
    <fieldset>
      <legend>{title}</legend>
      {pickable.length === 0 ? (
        <p className="empty">No {title.toLowerCase()} yet. Add some under Settings and data.</p>
      ) : (
        <div className="chips">
          {pickable.map((option) => (
            <button
              key={option.id}
              className={`chip small ${pickedIds.includes(option.id) ? 'on' : ''}`}
              aria-pressed={pickedIds.includes(option.id)}
              onClick={() => toggle(option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
