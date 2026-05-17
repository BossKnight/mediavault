// Shows a single item's full details and lets you update status and rating.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateItem, deleteItem } from '../api';
import StarRating from './StarRating';
import type { Item } from '../types';


interface Props {
  item: Item;
  onClose: () => void;
}

export default function ItemDetailModal({ item, onClose }: Props) {
  const queryClient = useQueryClient();
  const [localItem, setLocalItem] = useState(item);

  async function patch(updates: Partial<Item>) {
    const updated = await updateItem(item.id, updates);
    setLocalItem(updated);
    queryClient.invalidateQueries({ queryKey: ['items'] });
  }

  async function handleDelete() {
    if (!window.confirm(`Remove "${item.title}" from your collection?`)) return;
    await deleteItem(item.id);
    queryClient.invalidateQueries({ queryKey: ['items'] });
    onClose();
  }

  const coverSrc = localItem.cover_path
    ? (localItem.cover_path.startsWith('http') ? localItem.cover_path : `/${localItem.cover_path}`)
    : null;

  function metaLine(): string {
    if (localItem.type === 'movie') {
      const parts: string[] = [];
      if (localItem.meta.director)        parts.push(`Dir. ${localItem.meta.director}`);
      if (localItem.meta.runtime_minutes) parts.push(`${localItem.meta.runtime_minutes} min`);
      return parts.join(' · ');
    }
    if (localItem.type === 'game') {
      const parts: string[] = [];
      if (localItem.meta.platform)  parts.push(localItem.meta.platform);
      if (localItem.meta.developer) parts.push(localItem.meta.developer);
      return parts.join(' · ');
    }
    if (localItem.type === 'book') {
      const parts: string[] = [];
      if (localItem.meta.authors?.length) parts.push(localItem.meta.authors.join(', '));
      if (localItem.meta.page_count)      parts.push(`${localItem.meta.page_count} pages`);
      return parts.join(' · ');
    }
    return '';
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 520, overflow: 'hidden' }}
      >
        {/* Cover banner */}
        <div style={{ height: 180, background: 'var(--surface-2)', position: 'relative', overflow: 'hidden' }}>
          {coverSrc && (
            <img src={coverSrc} alt={localItem.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(6px) brightness(0.4)', transform: 'scale(1.1)' }} />
          )}
          {/* Foreground cover (small, left-aligned) */}
          <div style={{ position: 'absolute', bottom: -32, left: 24, width: 80, height: 120, borderRadius: 6, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.7)', background: 'var(--border)' }}>
            {coverSrc ? (
              <img src={coverSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 30 }}>
                {localItem.type === 'movie' ? '🎬' : localItem.type === 'game' ? '🎮' : '📖'}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'rgba(0,0,0,0.6)', color: 'var(--text)', fontSize: 18, padding: '2px 8px', borderRadius: 6 }}>✕</button>
        </div>

        {/* Info */}
        <div style={{ padding: '44px 24px 24px' }}>
          <h2 style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700 }}>{localItem.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {[localItem.year, metaLine()].filter(Boolean).join(' · ')}
          </p>

          {localItem.genres.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {localItem.genres.map(g => (
                <span key={g} style={{ background: 'var(--surface-2)', fontSize: 12, padding: '3px 10px', borderRadius: 20, color: 'var(--text-muted)' }}>{g}</span>
              ))}
            </div>
          )}

          {/* Controls */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Owned / Wishlist toggle */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, width: 80 }}>Status</span>
              {(['owned', 'wishlist'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => patch({ status_owned: s, ...(s === 'owned' && localItem.status_consumed === null ? { status_consumed: 'not_yet' } : {}), ...(s === 'wishlist' ? { status_consumed: null } : {}) } as Partial<Item>)}
                  style={{ padding: '5px 14px', borderRadius: 20, background: localItem.status_owned === s ? 'var(--accent)' : 'var(--surface-2)', color: localItem.status_owned === s ? '#000' : 'var(--text-muted)', fontWeight: localItem.status_owned === s ? 600 : 400, border: '1px solid var(--border)', fontSize: 13 }}
                >
                  {s === 'owned' ? 'Owned' : 'Wishlist'}
                </button>
              ))}
            </div>

            {/* Consumed toggle (games and books only, not movies) */}
            {localItem.status_owned === 'owned' && localItem.type !== 'movie' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, width: 80 }}>Progress</span>
                {(['not_yet', 'consumed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => patch({ status_consumed: s } as Partial<Item>)}
                    style={{ padding: '5px 14px', borderRadius: 20, background: localItem.status_consumed === s ? 'var(--accent)' : 'var(--surface-2)', color: localItem.status_consumed === s ? '#000' : 'var(--text-muted)', fontWeight: localItem.status_consumed === s ? 600 : 400, border: '1px solid var(--border)', fontSize: 13 }}
                  >
                    {s === 'not_yet' ? 'Not yet' : localItem.type === 'game' ? 'Completed' : 'Read'}
                  </button>
                ))}
              </div>
            )}

            {/* Format — movies only */}
            {localItem.type === 'movie' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, width: 80 }}>Format</span>
                {(['DVD', 'Blu-ray', '4K UHD'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => patch({ meta: { ...localItem.meta, format: localItem.meta.format === f ? null : f } } as Partial<Item>)}
                    style={{ padding: '5px 14px', borderRadius: 20, background: localItem.meta.format === f ? 'var(--accent)' : 'var(--surface-2)', color: localItem.meta.format === f ? '#000' : 'var(--text-muted)', fontWeight: localItem.meta.format === f ? 600 : 400, border: '1px solid var(--border)', fontSize: 13 }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Rating */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, width: 80 }}>Rating</span>
              <StarRating value={localItem.rating} size={22} onChange={r => patch({ rating: r } as Partial<Item>)} />
              {localItem.rating && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(click same star to clear)</span>}
            </div>
          </div>

          {/* Delete */}
          <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button className="btn-danger" onClick={handleDelete}>Remove from collection</button>
          </div>
        </div>
      </div>
    </div>
  );
}
