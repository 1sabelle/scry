import { useEffect, useState } from 'react';
import { MOODS, countPicks, findOptionByName, moodLabel, newId, normaliseOptionName, upsertById } from './days.js';
import { formatLong, nowTime } from './dates.js';

// Check-ins on past days default to midday, since the real time is unknown.
const PAST_DAY_TIME = '12:00';

const NO_ADDED_OPTIONS = { emotions: [], activities: [] };

function blankCheckIn(isToday) {
  return { id: null, time: isToday ? nowTime() : PAST_DAY_TIME, mood: null, emotions: [], activities: [], note: '' };
}

function blankDraft(date, isToday) {
  return { date, checkIn: blankCheckIn(isToday), addedOptions: NO_ADDED_OPTIONS };
}

// The check-in being written or edited on `date`, shared by the list (to pick one to edit) and the form.
// Switching to another day starts a blank one.
// An emotion or activity typed for the first time waits in `addedOptions` and joins the lists when the check-in is saved,
// so one picked and then removed again never shows up anywhere. `onChange(checkIns, addedOptions)` saves both.
export function useCheckInDraft(date, isToday, checkIns, dayStartTime, onChange) {
  const [drafted, setDrafted] = useState(() => blankDraft(date, isToday));
  if (drafted.date !== date) setDrafted(blankDraft(date, isToday));
  const draft = drafted.checkIn;
  const setDraft = (checkIn) => setDrafted({ ...drafted, checkIn });
  const addedOptions = {
    emotions: drafted.addedOptions.emotions.filter((option) => draft.emotions.includes(option.id)),
    activities: drafted.addedOptions.activities.filter((option) => draft.activities.includes(option.id)),
  };
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
    addedOptions,
    update: (change) => setDraft({ ...draft, ...change }),
    edit: (checkIn) => setDrafted({ date, checkIn, addedOptions: NO_ADDED_OPTIONS }),
    cancel: () => setDrafted(blankDraft(date, isToday)),
    // Picks a new emotion or activity named `name`. `optionsField` is "emotions" or "activities".
    addOption(optionsField, name) {
      const option = { id: newId(), name, archived: false };
      setDrafted({
        date,
        checkIn: { ...draft, [optionsField]: [...draft[optionsField], option.id] },
        addedOptions: { ...addedOptions, [optionsField]: [...addedOptions[optionsField], option] },
      });
    },
    save() {
      onChange(upsertById(checkIns, { ...draft, id: draft.id ?? newId(), note: draft.note.trim() }, dayStartTime), addedOptions);
      setDrafted(blankDraft(date, isToday));
    },
    remove(id) {
      onChange(checkIns.filter((checkIn) => checkIn.id !== id), NO_ADDED_OPTIONS);
      if (draft.id === id) setDrafted(blankDraft(date, isToday));
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

// Emotions and activities are typed in; new ones are added as they are picked. Settings renames, merges and deletes them.
export function CheckInForm({ date, days, emotions, activities, checkInDraft }) {
  const { draft, isEditing, addedOptions, update, addOption, save, cancel } = checkInDraft;

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

      <OptionPicker
        title="Emotions"
        singular="emotion"
        options={[...emotions, ...addedOptions.emotions]}
        pickCounts={countPicks(days, 'emotions')}
        pickedIds={draft.emotions}
        onChange={(ids) => update({ emotions: ids })}
        onAdd={(name) => addOption('emotions', name)}
      />
      <OptionPicker
        title="Activities"
        singular="activity"
        options={[...activities, ...addedOptions.activities]}
        pickCounts={countPicks(days, 'activities')}
        pickedIds={draft.activities}
        onChange={(ids) => update({ activities: ids })}
        onAdd={(name) => addOption('activities', name)}
      />

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

// A box to type emotions or activities into, with the picked ones as chips inside it.
// Under it, the most picked ones to click, or while typing the ones that match; Tab completes the first match and Enter picks.
// A name not seen before is added with `onAdd`.
function OptionPicker({ title, singular, options, pickCounts, pickedIds, onChange, onAdd }) {
  const [typed, setTyped] = useState('');
  const typedName = normaliseOptionName(typed);
  const picked = pickedIds.map((id) => options.find((option) => option.id === id));
  const suggestions = suggestOptions(options, pickedIds, pickCounts, typedName);
  const completion = typedName && suggestions[0] && normaliseOptionName(suggestions[0].name) !== typedName ? suggestions[0] : null;
  const isNewName = typedName !== '' && !findOptionByName(options, typedName);

  function pick(name) {
    const option = findOptionByName(options, name);
    if (!option) onAdd(normaliseOptionName(name));
    else if (!pickedIds.includes(option.id)) onChange([...pickedIds, option.id]);
    setTyped('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Tab' && completion) {
      event.preventDefault();
      setTyped(completion.name);
    } else if (event.key === 'Enter' && typedName) {
      event.preventDefault();
      pick(typedName);
    } else if (event.key === 'Backspace' && typed === '' && pickedIds.length > 0) {
      onChange(pickedIds.slice(0, -1));
    }
  }

  return (
    <fieldset>
      <legend>{title}</legend>
      <div className="option-input">
        {picked.map((option) => (
          <button
            key={option.id}
            className="chip small on"
            onClick={() => onChange(pickedIds.filter((id) => id !== option.id))}
            aria-label={`Remove ${option.name}`}
          >
            {option.name} <span aria-hidden="true">×</span>
          </button>
        ))}
        <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Type ${article(singular)} ${singular}`} aria-label={title} />
      </div>
      {(suggestions.length > 0 || isNewName) && (
        <div className="chips option-suggestions">
          {suggestions.map((option) => (
            <button key={option.id} className="chip small" onClick={() => pick(option.name)}>
              {option.name}
              {option === completion && <kbd>Tab</kbd>}
            </button>
          ))}
          {isNewName && (
            <button className="chip small is-new" onClick={() => pick(typedName)}>
              Add "{typedName}"
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}

const SUGGESTION_COUNT = 5;

// With nothing typed, the most picked emotions or activities; otherwise those starting with the typed name, then those containing it.
// Archived and already picked ones are left out.
function suggestOptions(options, pickedIds, pickCounts, typedName) {
  const offered = options
    .filter((option) => !option.archived && !pickedIds.includes(option.id))
    .sort((a, b) => (pickCounts.get(b.id) ?? 0) - (pickCounts.get(a.id) ?? 0));
  if (!typedName) return offered.slice(0, SUGGESTION_COUNT);
  const startsWithTyped = offered.filter((option) => normaliseOptionName(option.name).startsWith(typedName));
  const containsTyped = offered.filter((option) => !startsWithTyped.includes(option) && normaliseOptionName(option.name).includes(typedName));
  return [...startsWithTyped, ...containsTyped].slice(0, SUGGESTION_COUNT);
}

function article(word) {
  return /^[aeiou]/.test(word) ? 'an' : 'a';
}
