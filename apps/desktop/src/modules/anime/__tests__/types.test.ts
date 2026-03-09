import type {
  PaginatedMediaResponse,
  SearchAnimeResponse,
  TrendingAnimeResponse,
  PopularThisSeasonResponse,
} from '../types';

/**
 * Type-level test: verify that the paginated response aliases
 * are assignable to PaginatedMediaResponse.
 *
 * These compile-time assertions ensure the aliases stay in sync.
 * If any alias diverges, TypeScript will report an error here.
 */

describe('PaginatedMediaResponse type aliases', () => {
  it('SearchAnimeResponse is assignable to PaginatedMediaResponse', () => {
    const value: PaginatedMediaResponse = {
      Page: { pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false }, media: [] },
    };
    const _check: SearchAnimeResponse = value;
    expect(_check).toBeDefined();
  });

  it('TrendingAnimeResponse is assignable to PaginatedMediaResponse', () => {
    const value: PaginatedMediaResponse = {
      Page: { pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false }, media: [] },
    };
    const _check: TrendingAnimeResponse = value;
    expect(_check).toBeDefined();
  });

  it('PopularThisSeasonResponse is assignable to PaginatedMediaResponse', () => {
    const value: PaginatedMediaResponse = {
      Page: { pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false }, media: [] },
    };
    const _check: PopularThisSeasonResponse = value;
    expect(_check).toBeDefined();
  });
});
