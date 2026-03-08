/**
 * AniList GraphQL Query Definitions
 *
 * All GraphQL queries for the AniList API are defined here
 * as template literal constants. This keeps queries centralized
 * and easy to maintain.
 */

/** Common media fields reused across queries */
const MEDIA_FIELDS_BASIC = `
  id
  title { romaji english native }
  coverImage { large medium }
  episodes
  status
  format
  genres
  averageScore
  popularity
  nextAiringEpisode { airingAt episode }
`;

export const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String!, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      ${MEDIA_FIELDS_BASIC}
      bannerImage
      season
      seasonYear
      description(asHtml: false)
    }
  }
}
`;

export const ANIME_DETAILS_QUERY = `
query AnimeDetails($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    episodes
    status
    season
    seasonYear
    format
    genres
    averageScore
    popularity
    description(asHtml: false)
    studios(isMain: true) { nodes { name } }
    nextAiringEpisode { airingAt episode timeUntilAiring }
    relations {
      edges {
        relationType
        node {
          id
          title { romaji }
          format
          type
          coverImage { medium }
        }
      }
    }
    recommendations(sort: RATING_DESC, perPage: 5) {
      nodes {
        mediaRecommendation {
          id
          title { romaji }
          coverImage { medium }
          format
          averageScore
        }
      }
    }
    externalLinks { url site }
    streamingEpisodes { title thumbnail url site }
  }
}
`;

export const AIRING_SCHEDULE_QUERY = `
query AiringSchedule($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
      id
      airingAt
      episode
      media {
        id
        title { romaji english native }
        coverImage { large medium }
        episodes
        status
        format
        genres
        averageScore
        popularity
      }
    }
  }
}
`;

export const TRENDING_ANIME_QUERY = `
query TrendingAnime($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, sort: TRENDING_DESC) {
      ${MEDIA_FIELDS_BASIC}
    }
  }
}
`;

export const POPULAR_THIS_SEASON_QUERY = `
query PopularThisSeason($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) {
      ${MEDIA_FIELDS_BASIC}
    }
  }
}
`;
