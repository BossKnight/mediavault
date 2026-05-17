// These mirror the types on the server. Both ends agree on the shape of the data.
export type MediaType = 'movie' | 'game' | 'book';
export type OwnedStatus = 'owned' | 'wishlist';

export interface MovieMeta {
  director: string | null;
  runtime_minutes: number | null;
  format: string | null; // 'DVD' | 'Blu-ray' | '4K UHD'
}
export interface GameMeta {
  platform: string | null;
  developer: string | null;
  publisher: string | null;
}
export interface BookMeta {
  authors: string[];
  isbn: string | null;
  publisher: string | null;
  page_count: number | null;
}

export interface BaseItem {
  id: string;
  type: MediaType;
  title: string;
  year: number | null;
  cover_path: string | null;
  genres: string[];
  status_owned: OwnedStatus;
  status_consumed: 'consumed' | 'not_yet' | null;
  rating: number | null;
  api_id: string;
  api_source: string;
  created_at: string;
  updated_at: string;
}

export type MovieItem = BaseItem & { type: 'movie'; meta: MovieMeta };
export type GameItem  = BaseItem & { type: 'game';  meta: GameMeta  };
export type BookItem  = BaseItem & { type: 'book';  meta: BookMeta  };
export type Item = MovieItem | GameItem | BookItem;

export interface SearchResult {
  api_id: string;
  api_source: string;
  title: string;
  year: number | null;
  cover_url: string | null;
  genres: string[];
  meta: MovieMeta | GameMeta | BookMeta;
}
