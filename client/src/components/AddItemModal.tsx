// The modal dialog for searching and adding new items to the collection.
// It uses "debouncing" — waiting until the user stops typing before firing
// the search request. This prevents spamming the API with every keystroke.

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { searchApi, createItem, checkDuplicate } from '../api';
import type { MediaType, SearchResult, GameMeta } from '../types';

interface Props {
  defaultType: MediaType;
  onClose: () => void;
}

export default function AddItemModal({ defaultType, onClose }: Props) {
  const [type,    setType]    = useState<MediaType>(defaultType);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [adding,  setAdding]  = useState<string | null>(null); // api_id being added
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // Debounce: wait 400ms after the user stops typing before searching.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await searchApi(type, query);
        setResults(data);
      } catch (e) {
        setError('Search failed — is the server running? Is your API key set?');
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, type]);

  // Reset results when the media type changes.
  useEffect(() => { setResults([]); setQuery(''); }, [type]);

  async function handleAdd(result: SearchResult) {
    setAdding(result.api_id);

    // Check for duplicates before adding.
    const platform = type === 'game' ? (result.meta as GameMeta).platform ?? undefined : undefined;
    const dup = await checkDuplicate({ api_id: result.api_id, api_source: result.api_source, title: result.title, year: result.year, type, platform });
    if (dup) {
      const yes = window.confirm(`"${result.title}" is already in your collection.\n\nAdd anyway?`);
      if (!yes) { setAdding(null); return; }
    }

    try {
      await createItem({
        type,
        title:           result.title,
        year:            result.year,
        cover_path:      result.cover_url ?? null,
        genres:          result.genres,
        status_owned:    'owned',
        status_consumed: 'not_yet',
        rating:          null,
        api_id:          result.api_id,
        api_source:      result.api_source,
        meta:            result.meta,
      } as Parameters<typeof createItem>[0]);

      // Tell React Query that the items list is stale so it re-fetches.
      queryClient.invalidateQueries({ queryKey: ['items'] });
      onClose();
    } catch {
      alert('Failed to add item. Check the browser console for details.');
    } finally {
      setAdding(null);
    }
  }

  const typeLabels: Record<MediaType, string> = { movie: 'Movies', game: 'Games', book: 'Books' };
  const placeholders: Record<MediaType, string> = { movie: 'e.g. The Dark Knight', game: 'e.g. Elden Ring', book: 'e.g. Dune' };

  return (
    // Backdrop — clicking outside the modal closes it.
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
    >
      {/* Modal box — stop clicks from bubbling to the backdrop. */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>Add Item</span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {(['movie', 'game', 'book'] as MediaType[]).map(t => (
              <button key={t} onClick={() => setType(t)} style={{ padding: '4px 12px', borderRadius: 20, background: type === t ? 'var(--accent)' : 'var(--surface-2)', color: type === t ? '#000' : 'var(--text-muted)', fontWeight: type === t ? 600 : 400, border: '1px solid var(--border)' }}>
                {typeLabels[t]}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 20, padding: '0 4px' }}>✕</button>
        </div>

        {/* Search input */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${typeLabels[type]}… ${placeholders[type]}`}
          />
        </div>

        {/* Results list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <p style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>Searching…</p>}
          {error   && <p style={{ padding: 20, color: '#e05252', textAlign: 'center' }}>{error}</p>}
          {!loading && !error && results.length === 0 && query.trim() && (
            <p style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>No results found.</p>
          )}
          {results.map(r => (
            <div
              key={r.api_id}
              style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}
            >
              {/* Cover thumbnail */}
              <div style={{ flexShrink: 0, width: 48, height: 72, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                {r.cover_url ? (
                  <img src={r.cover_url} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 20 }}>
                    {type === 'movie' ? '🎬' : type === 'game' ? '🎮' : '📖'}
                  </div>
                )}
              </div>

              {/* Title + year + genres */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.year ?? '—'}</div>
                {r.genres.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {r.genres.slice(0, 3).map(g => (
                      <span key={g} style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>{g}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Add button */}
              <button
                className="btn-primary"
                onClick={() => handleAdd(r)}
                disabled={adding === r.api_id}
                style={{ flexShrink: 0, fontSize: 13 }}
              >
                {adding === r.api_id ? '…' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
