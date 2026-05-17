// --- What is a TypeScript "type" or "interface"? ---
// Think of it as a blueprint. Before you can use a piece of data (like an item
// in your collection), TypeScript wants to know exactly what shape that data has.
// If you try to access a field that doesn't exist, TypeScript tells you immediately
// instead of letting your app crash at runtime.

export type MediaType = 'movie' | 'game' | 'book';
export type OwnedStatus = 'owned' | 'wishlist';
export type ConsumedStatus = 'consumed' | 'not_yet';
export type ApiSource = 'tmdb' | 'igdb' | 'rawg' | 'openlibrary' | 'manual';

// Every item in the collection — regardless of type — has these fields.
export interface BaseItem {
  id: string;
  type: MediaType;
  title: string;
  year: number | null;
  cover_path: string | null;
  genres: string[];
  status_owned: OwnedStatus;
  status_consumed: ConsumedStatus | null;
  rating: number | null;
  api_id: string;
  api_source: ApiSource;
  created_at: string;
  updated_at: string;
}

// Movies also have director, runtime, and physical format.
export interface MovieMeta {
  director: string | null;
  runtime_minutes: number | null;
  format: string | null; // 'DVD' | 'Blu-ray' | '4K UHD'
}

// Games also have platform (PS5, PC, etc.) and publisher info.
export interface GameMeta {
  platform: string | null;
  developer: string | null;
  publisher: string | null;
}

// Books also have authors, ISBN, and page count.
export interface BookMeta {
  authors: string[];
  isbn: string | null;
  publisher: string | null;
  page_count: number | null;
}

// A full item combines the base with its specific metadata.
export type MovieItem = BaseItem & { type: 'movie'; meta: MovieMeta };
export type GameItem  = BaseItem & { type: 'game';  meta: GameMeta  };
export type BookItem  = BaseItem & { type: 'book';  meta: BookMeta  };
export type Item = MovieItem | GameItem | BookItem;

// This is what the lookup endpoints return before the user saves anything.
export interface SearchResult {
  api_id: string;
  api_source: ApiSource;
  title: string;
  year: number | null;
  cover_url: string | null;
  genres: string[];
  meta: MovieMeta | GameMeta | BookMeta;
}
