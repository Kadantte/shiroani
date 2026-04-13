/**
 * Canonical AniList anime genres.
 * Static list — stable, offline-safe, mirrors AniList's `GenreCollection`.
 */
export const ANIME_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
] as const;

export type AnimeGenre = (typeof ANIME_GENRES)[number];

/** Polish display labels for the genre picker UI */
export const ANIME_GENRE_LABELS_PL: Record<AnimeGenre, string> = {
  Action: 'Akcja',
  Adventure: 'Przygodowe',
  Comedy: 'Komedia',
  Drama: 'Dramat',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasy',
  Horror: 'Horror',
  'Mahou Shoujo': 'Mahou Shoujo',
  Mecha: 'Mecha',
  Music: 'Muzyczne',
  Mystery: 'Tajemnica',
  Psychological: 'Psychologiczne',
  Romance: 'Romans',
  'Sci-Fi': 'Sci-Fi',
  'Slice of Life': 'Slice of Life',
  Sports: 'Sportowe',
  Supernatural: 'Nadprzyrodzone',
  Thriller: 'Thriller',
};
