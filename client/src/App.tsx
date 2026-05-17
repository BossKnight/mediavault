// --- This is the root of your application ---
// Every React app has one root component (App) that contains everything else.
// React works by composing small components together into a tree - App contains
// the header, the tabs, and the collection grid. Each of those contains smaller
// components, and so on.
//
// "useState" is how components remember things. When state changes, React
// automatically re-renders the component with the new value.
//
// "useQuery" (from React Query) fetches data from the server and caches it.
// It automatically re-fetches when the data gets stale.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getItems } from './api';
import ItemCard from './components/ItemCard';
import AddItemModal from './components/AddItemModal';
import ItemDetailModal from './components/ItemDetailModal';
import type { MediaType, Item, OwnedStatus, BookItem } from './types';

type FilterStatus = 'all' | OwnedStatus;
type FilterConsumed = 'all' | 'consumed' | 'not_yet';
type MovieSort = 'title-asc' | 'title-desc';
type GameSort  = 'title-asc' | 'title-desc' | 'platform';
type BookSort  = 'title-asc' | 'title-desc' | 'author';

const TYPE_LABELS: Record<MediaType, string> = {
  movie: '🎬 Movies',
  game: '🎮 Games',
  book: '📖 Books',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<MediaType>('movie');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterConsumed, setFilterConsumed] = useState<FilterConsumed>('all');
  const [searchText, setSearchText] = useState('');
  const [movieSort, setMovieSort] = useState<MovieSort>('title-asc');
  const [gameSort,  setGameSort]  = useState<GameSort>('title-asc');
  const [bookSort, setBookSort] = useState<BookSort>('title-asc');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Fetch items from the backend. React Query caches the result and re-fetches
  // whenever the query key changes (i.e., when filters or the active tab changes).
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['items', activeTab, filterStatus, filterConsumed],
    queryFn: () => getItems({
      type: activeTab,
      status_owned: filterStatus !== 'all' ? filterStatus : undefined,
      status_consumed: filterConsumed !== 'all' ? filterConsumed : undefined,
    }),
  });

  // Client-side text search — filters the already-fetched list by title.
  const filteredItems = searchText.trim()
    ? items.filter(i => i.title.toLowerCase().includes(searchText.toLowerCase()))
    : items;

  // Sorting for books. Takes the last word of an author name as the sort key
  // so "J.R.R. Tolkien" sorts under T, not J.
  function authorLastName(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase();
  }

  const displayedItems = [...filteredItems].sort((a, b) => {
    if (activeTab === 'movie') {
      if (movieSort === 'title-asc')  return a.title.localeCompare(b.title);
      if (movieSort === 'title-desc') return b.title.localeCompare(a.title);
    }
    if (activeTab === 'game') {
      if (gameSort === 'title-asc')  return a.title.localeCompare(b.title);
      if (gameSort === 'title-desc') return b.title.localeCompare(a.title);
      // platform sort — items with no platform sort to the end
      const aPlatform = ((a as import('./types').GameItem).meta.platform ?? '').toLowerCase();
      const bPlatform = ((b as import('./types').GameItem).meta.platform ?? '').toLowerCase();
      return aPlatform.localeCompare(bPlatform);
    }
    if (activeTab === 'book') {
      if (bookSort === 'title-asc')  return a.title.localeCompare(b.title);
      if (bookSort === 'title-desc') return b.title.localeCompare(a.title);
      // author sort — use first author's last name
      const aFirst = (a as BookItem).meta.authors[0] ?? '';
      const bFirst = (b as BookItem).meta.authors[0] ?? '';
      return authorLastName(aFirst).localeCompare(authorLastName(bFirst));
    }
    return 0;
  });

  const consumedLabel: Record<MediaType, { consumed: string; not_yet: string }> = {
    movie: { consumed: 'Watched', not_yet: 'Unwatched' },
    game: { consumed: 'Completed', not_yet: 'Not yet' },
    book: { consumed: 'Read', not_yet: 'Unread' },
  };

  function switchTab(t: MediaType) {
    setActiveTab(t);
    setSearchText('');
    setFilterStatus('all');
    setFilterConsumed('all');
    setMovieSort('title-asc');
    setGameSort('title-asc');
    setBookSort('title-asc');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: 8,
      }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', letterSpacing: '-0.5px', flexShrink: 0 }}>
          MediaVault
        </span>

        {/* Tab navigation */}
        <nav style={{ display: 'flex', gap: 4, marginLeft: 20 }}>
          {(['movie', 'game', 'book'] as MediaType[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: activeTab === t ? 'var(--surface-2)' : 'transparent',
                color: activeTab === t ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: activeTab === t ? 600 : 400,
                border: '1px solid ' + (activeTab === t ? 'var(--border)' : 'transparent'),
                fontSize: 13,
              }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </nav>

        <button
          className="btn-primary"
          onClick={() => setShowAdd(true)}
          style={{ marginLeft: 'auto', fontSize: 13 }}
        >
          + Add
        </button>
      </header>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 24px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <input
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder={`Search ${TYPE_LABELS[activeTab].split(' ')[1]}…`}
          style={{ width: 220 }}
        />

        {/* Owned / Wishlist filter pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'owned', 'wishlist'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '5px 12px', borderRadius: 20,
                background: filterStatus === s ? 'var(--accent)' : 'var(--surface-2)',
                color: filterStatus === s ? '#000' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                fontSize: 12,
                fontWeight: filterStatus === s ? 600 : 400,
              }}
            >
              {s === 'all' ? 'All' : s === 'owned' ? 'Owned' : 'Wishlist'}
            </button>
          ))}
        </div>

        {/* Consumed filter pills — not shown for movies */}
        {activeTab !== 'movie' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'not_yet', 'consumed'] as FilterConsumed[]).map(s => (
              <button
                key={s}
                onClick={() => setFilterConsumed(s)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  background: filterConsumed === s ? 'var(--accent)' : 'var(--surface-2)',
                  color: filterConsumed === s ? '#000' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  fontWeight: filterConsumed === s ? 600 : 400,
                }}
              >
                {s === 'all' ? 'All' : consumedLabel[activeTab][s as 'consumed' | 'not_yet']}
              </button>
            ))}
          </div>
        )}

        {/* Game sort — only visible on the Games tab */}
        {activeTab === 'game' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {([['title-asc', 'A → Z'], ['title-desc', 'Z → A'], ['platform', 'By Platform']] as [GameSort, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setGameSort(val)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  background: gameSort === val ? 'var(--accent)' : 'var(--surface-2)',
                  color: gameSort === val ? '#000' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  fontWeight: gameSort === val ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Movie sort — only visible on the Movies tab */}
        {activeTab === 'movie' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {([['title-asc', 'A → Z'], ['title-desc', 'Z → A']] as [MovieSort, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setMovieSort(val)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  background: movieSort === val ? 'var(--accent)' : 'var(--surface-2)',
                  color: movieSort === val ? '#000' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  fontWeight: movieSort === val ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Book sort — only visible on the Books tab */}
        {activeTab === 'book' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {([['title-asc', 'A → Z'], ['title-desc', 'Z → A'], ['author', 'By Author']] as [BookSort, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setBookSort(val)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  background: bookSort === val ? 'var(--accent)' : 'var(--surface-2)',
                  color: bookSort === val ? '#000' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  fontWeight: bookSort === val ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>
          {displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Collection grid ────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: 24 }}>
        {isLoading && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 60 }}>Loading…</p>
        )}
        {isError && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <p style={{ color: '#e05252', fontSize: 15 }}>Could not reach the server.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
              Make sure <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>npm run dev</code> is running inside the <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>server/</code> folder.
            </p>
          </div>
        )}
        {!isLoading && !isError && displayedItems.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>
              {activeTab === 'movie' ? '🎬' : activeTab === 'game' ? '🎮' : '📖'}
            </div>
            <p style={{ fontSize: 16 }}>
              No {TYPE_LABELS[activeTab].split(' ')[1].toLowerCase()} here yet.
            </p>
            <p style={{ marginTop: 8, fontSize: 13 }}>
              Click <strong style={{ color: 'var(--accent)' }}>+ Add</strong> to add your first one.
            </p>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
        }}>
          {displayedItems.map(item => (
            <ItemCard key={item.id} item={item} onClick={setSelectedItem} />
          ))}
        </div>
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showAdd && (
        <AddItemModal defaultType={activeTab} onClose={() => setShowAdd(false)} />
      )}
      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
