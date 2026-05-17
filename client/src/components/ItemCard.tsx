// --- What is a "component"? ---
// A component is a reusable piece of UI. This ItemCard component is rendered
// once for every item in your collection. React calls this function and gets
// back the HTML to display. The "props" (properties) are the inputs — like
// function arguments — that tell the component what to show.

import StarRating from './StarRating';
import type { Item } from '../types';

interface Props {
  item: Item;
  onClick: (item: Item) => void;
}

function subtitleFor(item: Item): string {
  if (item.type === 'game')  return item.meta.platform ?? '';
  if (item.type === 'book')  return item.meta.authors?.join(', ') ?? '';
  if (item.type === 'movie') return item.meta.format ?? item.meta.director ?? '';
  return '';
}

export default function ItemCard({ item, onClick }: Props) {
  const coverSrc = item.cover_path
    ? `/${item.cover_path}`
    : null;

  const subtitle = subtitleFor(item);

  return (
    <div
      onClick={() => onClick(item)}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Cover image */}
      <div style={{ aspectRatio: '2/3', background: 'var(--surface-2)', position: 'relative', overflow: 'hidden' }}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 36 }}>
            {item.type === 'movie' ? '🎬' : item.type === 'game' ? '🎮' : '📖'}
          </div>
        )}
        {/* Status badge */}
        {item.status_owned === 'wishlist' && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.75)', color: 'var(--accent)', fontSize: 11, padding: '2px 7px', borderRadius: 12 }}>
            Wishlist
          </div>
        )}
        {item.status_consumed === 'consumed' && (
          <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(245,166,35,0.85)', color: '#000', fontSize: 11, padding: '2px 7px', borderRadius: 12, fontWeight: 600 }}>
            ✓
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3, WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
          {item.title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 4 }}>
          <StarRating value={item.rating} size={13} />
        </div>
      </div>
    </div>
  );
}
