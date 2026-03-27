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
    idMal
    title { romaji english native }
    coverImage { large extraLarge color }
    bannerImage
    episodes
    duration
    status
    season
    seasonYear
    format
    source
    genres
    averageScore
    meanScore
    popularity
    favourites
    isAdult
    siteUrl
    description(asHtml: false)
    startDate { year month day }
    endDate { year month day }
    trailer { id site thumbnail }
    tags { id name rank isGeneralSpoiler isMediaSpoiler }
    studios { edges { isMain node { id name isAnimationStudio } } }
    staff(perPage: 8, sort: RELEVANCE) {
      edges {
        role
        node {
          id
          name { full userPreferred }
          image { medium }
        }
      }
    }
    characters(perPage: 8, sort: [ROLE, RELEVANCE]) {
      edges {
        role
        node {
          id
          name { full userPreferred }
          image { medium }
        }
      }
    }
    nextAiringEpisode { airingAt episode timeUntilAiring }
    relations {
      edges {
        relationType
        node {
          id
          title { romaji english }
          format
          type
          status
          coverImage { medium }
          averageScore
        }
      }
    }
    recommendations(sort: RATING_DESC, perPage: 6) {
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
    externalLinks { url site type icon color }
    streamingEpisodes { title thumbnail url site }
    rankings { id rank type format year season allTime context }
    stats {
      scoreDistribution { score amount }
      statusDistribution { status amount }
    }
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
