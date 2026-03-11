import type { QuickAccessSite } from '@shiroani/shared';

/** Favicon URL helper using Google's favicon service */
const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

/** Predefined quick access sites shown on the new tab page */
export const PREDEFINED_SITES: QuickAccessSite[] = [
  {
    id: 'predefined-ogladajanime',
    name: 'ogladajanime.pl',
    url: 'https://ogladajanime.pl',
    icon: favicon('ogladajanime.pl'),
    isPredefined: true,
  },
  {
    id: 'predefined-shinden',
    name: 'shinden.pl',
    url: 'https://shinden.pl',
    icon: favicon('shinden.pl'),
    isPredefined: true,
  },
  {
    id: 'predefined-lycoris',
    name: 'lycoris.cafe',
    url: 'https://lycoris.cafe',
    icon: favicon('lycoris.cafe'),
    isPredefined: true,
  },
  {
    id: 'predefined-anilist',
    name: 'anilist.co',
    url: 'https://anilist.co',
    icon: favicon('anilist.co'),
    isPredefined: true,
  },
  {
    id: 'predefined-myanimelist',
    name: 'myanimelist.net',
    url: 'https://myanimelist.net',
    icon: favicon('myanimelist.net'),
    isPredefined: true,
  },
];
