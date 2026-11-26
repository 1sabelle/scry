import { useState } from 'react';
import { newId, reflectionPromptFor, upsertById } from './days.js';
import { formatShort, nowTime } from './dates.js';

const FREEFORM = 'freeform';

// What an entry answers: nothing (freeform), a journal prompt, or a reflection on a habit.
// Encoded as one string so it can be the value of a single <select>.
function topicFor(entry) {
  if (entry.habitId) return `habit:${entry.habitId}`;
  if (entry.prompt) return `prompt:${entry.prompt}`;
  return FREEFORM;
}

function blankEntry(isToday) {
  return { id: null, time: isToday ? nowTime() : '21:00', prompt: null, habitId: null, text: '' };
}

export default function Journal({ date, isToday, day, habits, prompts, onChange }) {
  const [draft, setDraft] = useState(() => blankEntry(isToday));
  const isEditing = draft.id !== null;
  const activeHabits = habits.filter((habit) => !habit.archived);
  // Habits done on this day come first: those are the ones worth reflecting on.
  const reflectableHabits = [
    ...activeHabits.filter((habit) => day.habitsDone.includes(habit.id)),
    ...activeHabits.filter((habit) => !day.habitsDone.includes(habit.id)),
  ];

  function chooseTopic(topic) {
    if (topic === FREEFORM) setDraft({ ...draft, prompt: null, habitId: null });
    else if (topic.startsWith('prompt:')) setDraft({ ...draft, prompt: topic.slice('prompt:'.length), habitId: null });
    else {
      const habit = habits.find((h) => `habit:${h.id}` === topic);
      setDraft({ ...draft, prompt: reflectionPromptFor(habit), habitId: habit.id });
    }
  }

  function chooseRandomPrompt() {
    const others = prompts.filter((prompt) => prompt.text !== draft.prompt);
    if (others.length === 0) return;
    const prompt = others[Math.floor(Math.random() * others.length)];
    setDraft({ ...draft, prompt: prompt.text, habitId: null });
  }

  function save() {
    onChange(upsertById(day.journal, { ...draft, id: draft.id ?? newId(), text: draft.text.trim() }));
    setDraft(blankEntry(isToday));
  }

  function remove(id) {
    if (!confirm('Delete this journal entry?')) return;
    onChange(day.journal.filter((entry) => entry.id !== id));
    if (draft.id === id) setDraft(blankEntry(isToday));
  }

  // An entry whose prompt or habit was edited or removed since it was written still shows what it answered.
  const draftTopic = topicFor(draft);
  const listedTopics = [FREEFORM, ...prompts.map((prompt) => `prompt:${prompt.text}`), ...reflectableHabits.map((habit) => `habit:${habit.id}`)];
  const isDraftTopicListed = listedTopics.includes(draftTopic);

  return (
    <section className="journal">
      <h2>Journal <span className="heading-date">{formatShort(date)}</span></h2>
      {day.journal.length > 0 && (
        <ul className="journal-entries">
          {day.journal.map((entry) => (
            <li key={entry.id} className={entry.id === draft.id ? 'is-editing' : ''}>
              <div className="journal-entry-head">
                <span className="entry-time">{entry.time}</span>
                {entry.prompt && <span className="journal-prompt">{entry.prompt}</span>}
                <span className="journal-entry-actions">
                  <button onClick={() => setDraft(entry)}>Edit</button>
                  <button onClick={() => remove(entry.id)}>Delete</button>
                </span>
              </div>
              <p className="journal-text">{entry.text}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="journal-composer">
        <div className="journal-topic">
          <select value={draftTopic} onChange={(e) => chooseTopic(e.target.value)} aria-label="Write about">
            <option value={FREEFORM}>Freeform</option>
            {!isDraftTopicListed && <option value={draftTopic}>{draft.prompt}</option>}
            {prompts.length > 0 && (
              <optgroup label="Prompts">
                {prompts.map((prompt) => (
                  <option key={prompt.id} value={`prompt:${prompt.text}`}>{prompt.text}</option>
                ))}
              </optgroup>
            )}
            {reflectableHabits.length > 0 && (
              <optgroup label="Reflect on a habit">
                {reflectableHabits.map((habit) => (
                  <option key={habit.id} value={`habit:${habit.id}`}>
                    {habit.name}{day.habitsDone.includes(habit.id) ? ' (done)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button onClick={chooseRandomPrompt} disabled={prompts.length === 0} title="Pick a random prompt">Surprise me</button>
        </div>
        {draft.prompt && <p className="journal-prompt">{draft.prompt}</p>}
        <textarea rows={5} placeholder="Write whatever comes" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        <div className="form-actions">
          <button className="primary" disabled={draft.text.trim() === ''} onClick={save}>
            {isEditing ? 'Save entry' : 'Add entry'}
          </button>
          {isEditing && <button onClick={() => setDraft(blankEntry(isToday))}>Cancel</button>}
        </div>
      </div>
    </section>
  );
}
