import { useEffect, useState } from 'react';
import { MOODS, moodLabel, newId, upsertById } from './days.js';
import { formatLong, nowTime } from './dates.js';

// Check-ins on past days default to midday, since the real time is unknown.
const PAST_DAY_TIME = '12:00';

function blankCheckIn(isToday) {
  return { id: null, time: isToday ? nowTime() : PAST_DAY_TIME, mood: null, emotions: [], activities: [], note: '' };
}

// The check-in being written or edited on `date`, shared by the list (to pick one to edit) and the form.
// Switching to another day starts a blank one.
export function useCheckInDraft(date, isToday, checkIns, dayStartTime, onChange) {
  const [drafted, setDrafted] = useState(() => ({ date, checkIn: blankCheckIn(isToday) }));
  if (drafted.date !== date) setDrafted({ date, checkIn: blankCheckIn(isToday) });
  const draft = drafted.checkIn;
  const setDraft = (checkIn) => setDrafted({ date, checkIn });
  const isEditing = draft.id !== null;
  const hasUnsavedChanges = isEditing
    ? JSON.stringify(draft) !== JSON.stringify(checkIns.find((checkIn) => checkIn.id === draft.id))
    : draft.mood !== null || draft.emotions.length > 0 || draft.activities.length > 0 || draft.note.trim() !== '';

  // The browser asks before closing or reloading the page while a check-in is half written.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  return {
    draft,
    isEditing,
    update: (change) => setDraft({ ...draft, ...change }),
    edit: setDraft,
    cancel: () => setDraft(blankCheckIn(isToday)),
    save() {
      onChange(upsertById(checkIns, { ...draft, id: draft.id ?? newId(), note: draft.note.trim() }, dayStartTime));
      setDraft(blankCheckIn(isToday));
    },
    remove(id) {
      onChange(checkIns.filter((checkIn) => checkIn.id !== id));
      if (draft.id === id) setDraft(blankCheckIn(isToday));
    },
  };
}

// One compact line per check-in; opening one shows its whole note and lets it be edited or deleted.
export function CheckInList({ checkIns, emotions, activities, checkInDraft }) {
  const [openIds, setOpenIds] = useState([]);
  const toggle = (id) => setOpenIds(openIds.includes(id) ? openIds.filter((openId) => openId !== id) : [...openIds, id]);

  return (
    <section className="check-in-list">
      <h2>Check-ins</h2>
      {checkIns.length === 0 ? (
        <p className="empty">No check-ins on this day yet.</p>
      ) : (
        <ul className="entry-list">
          {checkIns.map((checkIn) => {
            const isOpen = openIds.includes(checkIn.id);
            const isEditing = checkIn.id === checkInDraft.draft.id;
            return (
              <li key={checkIn.id} className={`check-in ${isOpen ? 'is-open' : ''} ${isEditing ? 'is-editing' : ''}`}>
                <button className="entry-body" onClick={() => toggle(checkIn.id)} aria-expanded={isOpen}>
                  <span className="entry-time">{checkIn.time}</span>
                  <span className={`mood-dot mood-${checkIn.mood}`} />
                  <span className="check-in-mood">{moodLabel(checkIn.mood)}</span>
                  <PickedNames checkIn={checkIn} emotions={emotions} activities={activities} />
                  {checkIn.note && <span className="check-in-note">{checkIn.note}</span>}
                </button>
                {isOpen && (
                  <div className="check-in-actions">
                    <button onClick={() => checkInDraft.edit(checkIn)} disabled={isEditing}>{isEditing ? 'Editing' : 'Edit'}</button>
                    <button onClick={() => checkInDraft.remove(checkIn.id)}>Delete</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Emotions and activities are added and edited under Settings.
export function CheckInForm({ date, emotions, activities, checkInDraft }) {
  const { draft, isEditing, update, save, cancel } = checkInDraft;

  return (
    <div className="check-ins">
      <h2>{formatLong(date)}</h2>
      <fieldset>
        <legend>
          {isEditing ? `Edit the ${draft.time} check-in` : 'How are you feeling?'}
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
      <OptionPicker title="Activities" options={activities} pickedIds={draft.activities} onChange={(ids) => update({ activities: ids })} />

      <textarea rows={2} placeholder="A note about this moment (optional)" value={draft.note} onChange={(e) => update({ note: e.target.value })} />
      <div className="form-actions">
        <button className="primary" disabled={draft.mood === null} onClick={save}>
          {isEditing ? 'Save check-in' : 'Check in'}
        </button>
        {isEditing && <button onClick={cancel}>Cancel</button>}
      </div>
    </div>
  );
}

// The emotions a check-in picked, then its activities: "tired, calm · work".
function PickedNames({ checkIn, emotions, activities }) {
  const namesOf = (pickedIds, options) => pickedIds.map((id) => options.find((option) => option.id === id)?.name);
  const groups = [namesOf(checkIn.emotions, emotions), namesOf(checkIn.activities, activities)].filter((names) => names.length > 0);
  if (groups.length === 0) return null;
  return <span className="check-in-options">{groups.map((names) => names.join(', ')).join(' · ')}</span>;
}

// Chips to pick emotions or activities. An archived one still shows while it is picked, so editing an old check-in keeps it.
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
