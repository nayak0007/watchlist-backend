/**
 * Media and TMDB-related type definitions.
 */

export type MediaType = 'movie' | 'tv' | 'person';
export type SearchType = 'movie' | 'tv' | 'person' | 'multi';
export type TimeWindow = 'day' | 'week';

export interface Provider {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  type: 'subscription' | 'rent' | 'buy' | 'free';
}

export interface MediaItem {
  id: number;
  tmdbId: number;
  title: string;
  mediaType: MediaType;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  releaseDate: string;
  voteAverage: number;
  providers: Provider[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath: string | null;
}

export interface MediaDetail extends MediaItem {
  tagline?: string;
  runtime?: number;
  genres: string[];
  director: Person | null;
  cast: CastMember[];
  crew: CrewMember[];
  similar: MediaItem[];
}

export interface Person {
  id: number;
  tmdbId: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  profilePath: string | null;
  knownForDepartment: string;
  alsoKnownAs: string[];
  filmography: MediaItem[];
}

export interface TrendingQuery {
  mediaType: 'all' | 'movie' | 'tv' | 'person';
  timeWindow: TimeWindow;
  page: number;
}

export interface SearchQuery {
  query: string;
  type: SearchType;
  page: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface GeminiEnrichment {
  aiSummary: string;
  themes: string[];
  similarTitles: string[];
  moodTags: string[];
  watchReason: string;
}

export interface GeminiRecommendation {
  tmdbId: number;
  title: string;
  reason: string;
}
