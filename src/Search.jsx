import { useState } from 'react';
import { formatShort } from './dates.js';
import { searchWriting } from './search.js';

// Finds check-in notes, gratitudes and successes containing the typed text. Picking one opens its day.
export default function Search({ days, onSelect }) {
  const [query, setQuery] = useState('');
  const matches = searchWriting(days, query);
  const hasQuery = query.trim() !== '';

  return (
    <details className="search collapsible">
      <summary>Search</summary>
      <input type="search" className="search-input" placeholder="Search notes, gratitudes and successes" value={query} onChange={(e) => setQuery(e.target.value)} />
      {hasQuery && matches.length === 0 && <p className="empty">Nothing matches "{query.trim()}".</p>}
      {matches.length > 0 && (
        <ul className="entry-list search-results">
          {matches.map((match) => (
            <li key={match.id}>
              <button className="entry-body" onClick={() => onSelect(match.date)}>
                <span className="entry-time">{formatShort(match.date)} · {match.label}</span>
                <span className="check-in-note"><Highlighted text={match.text} query={query.trim()} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

// The text with each occurrence of `query` (ignoring case) marked.
function Highlighted({ text, query }) {
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}
