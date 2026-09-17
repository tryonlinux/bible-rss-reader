/* eslint-disable */
import express from 'express';
import path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fullBookList from './resources/full.json';
import otBookList from './resources/ot.json';
import ntBookList from './resources/nt.json';
import translationsJSON from './resources/translations.json';
// Check if the code is running in development or production
const isDevelopment = process.env.NODE_ENV !== 'production';

// Set the resources path based on the environment

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

const app = express();
app.use(compression());
//Use Limit
app.use(limiter);
// Use Helmet
app.use(helmet());
app.use(helmet.hidePoweredBy());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"], // Only allow content from our own domain
      scriptSrc: ["'self'"], // Only allow scripts from our own domain
    },
  })
);
app.use(
  helmet.hsts({
    maxAge: 31536000, // Preferably set it for one year
    includeSubDomains: true, // Apply rule to subdomains as well
    preload: true,
  })
);

const port = 3000;
const bibleGatewaySlug = 'https://www.biblegateway.com/passage/?search=';

interface BookListMap {
  full: typeof fullBookList;
  ot: typeof otBookList;
  nt: typeof ntBookList;
  [key: string]: typeof fullBookList | typeof otBookList | typeof ntBookList;
}
interface BookChapter {
  Book: string;
  Chapter: number;
}

interface RSSItem {
  title: string;
  description: string;
  url: string;
  author: string;
  date: Date;
}

// Helper function to escape XML special characters
const escapeXML = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Helper function to format date for RSS (RFC 822)
const formatRSSDate = (date: Date): string => {
  return date.toUTCString();
};

// Generate RSS XML manually
const generateRSSXML = (
  feedMetadata: {
    title: string;
    description: string;
    feedUrl: string;
    siteUrl: string;
    imageUrl: string;
    managingEditor: string;
    webMaster: string;
    copyright: string;
    language: string;
    pubDate: Date;
    ttl: number;
  },
  items: RSSItem[]
): string => {
  const itemsXML = items
    .map(
      (item) => `
    <item>
      <title>${escapeXML(item.title)}</title>
      <description>${escapeXML(item.description)}</description>
      <link>${escapeXML(item.url)}</link>
      <guid isPermaLink="true">${escapeXML(item.url)}</guid>
      <pubDate>${formatRSSDate(item.date)}</pubDate>
      <author>${escapeXML(item.author)}</author>
    </item>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXML(feedMetadata.title)}</title>
    <description>${escapeXML(feedMetadata.description)}</description>
    <link>${escapeXML(feedMetadata.siteUrl)}</link>
    <atom:link href="${escapeXML(feedMetadata.feedUrl)}" rel="self" type="application/rss+xml"/>
    <language>${escapeXML(feedMetadata.language)}</language>
    <managingEditor>${escapeXML(feedMetadata.managingEditor)}</managingEditor>
    <webMaster>${escapeXML(feedMetadata.webMaster)}</webMaster>
    <copyright>${escapeXML(feedMetadata.copyright)}</copyright>
    <pubDate>${formatRSSDate(feedMetadata.pubDate)}</pubDate>
    <ttl>${feedMetadata.ttl}</ttl>
    <image>
      <url>${escapeXML(feedMetadata.imageUrl)}</url>
      <title>${escapeXML(feedMetadata.title)}</title>
      <link>${escapeXML(feedMetadata.siteUrl)}</link>
    </image>${itemsXML}
  </channel>
</rss>`;
};

if (isDevelopment) {
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
  });
}

//localhost:3000/rssbible/ot/esv/20230801/3/feed.rss
app.get('/rssbible/:plan/:translation/:startDate/:chapters/feed.rss', (req, res) => {
  let plan = SanitizePlan(req.params.plan);
  let chapters = SanitizeChapters(req.params.chapters);
  let startDate = ClampStartDate(SanitizeDate(req.params.startDate), plan, chapters);
  let translation = SanitizeTranslation(req.params.translation);

  const feedMetadata = {
    title: 'Bible Plan Feed',
    description: 'Go to www.bibleplanfeed.com for more information.',
    feedUrl: `https://www.bibleplanfeed.com/rssbible/${plan}/${translation}/${formatDateToyyyyMMdd(
      startDate
    )}/${chapters}/feed.rss`,
    siteUrl: 'https://www.bibleplanfeed.com/',
    imageUrl: 'https://www.bibleplanfeed.com/icon.png',
    managingEditor: 'github.com/tryonlinux - Not affiliated with Bible Gateway',
    webMaster: 'github.com/tryonlinux',
    copyright: 'github.com/tryonlinux  - Not affiliated with Bible Gateway',
    language: 'en',
    pubDate: new Date(),
    ttl: 60,
  };

  const items = BuildRSSFeedItems(plan, translation, startDate, chapters);
  const rssXML = generateRSSXML(feedMetadata, items);

  res.type('application/rss+xml');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(rssXML);
});
//Ensure the plan is valid, if not return full
const SanitizePlan = (plan: any): 'nt' | 'ot' | 'full' => {
  const validValues: Array<'nt' | 'ot' | 'full'> = ['nt', 'ot', 'full'];
  const normalized = typeof plan === 'string' ? plan.toLowerCase() : plan;
  return validValues.includes(normalized) ? normalized : 'full';
};

//Ensure the date is valid, if not return today
const SanitizeDate = (dateString: string): Date => {
  if (dateString.length !== 8) {
    return new Date(); // Return today's date as default
  }
  try {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1; // months are 0-indexed in JavaScript
    const day = parseInt(dateString.substring(6, 8));

    // Validate ranges
    if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
      return new Date();
    }

    const date = new Date(Date.UTC(year, month, day));
    // Check if date rolled over (e.g., Feb 30 became Mar 2)
    if (date.getUTCMonth() !== month) {
      return new Date();
    }

    return date;
  } catch {
    return new Date();
  }
};

//Ensure the translation is valid, if not return ESV
const SanitizeTranslation = (translation: string): string => {
  const found = translationsJSON.find((item) => item.Code === translation.toUpperCase());
  return found ? found.Code : 'ESV';
};

//Ensure the Chapter is valid, if not return 1
const SanitizeChapters = (chapters: string): number => {
  if (chapters.length > 2) {
    return 1; // Return 1 if over 99 chapters
  }

  const result = parseInt(chapters, 10);
  if (isNaN(result) || result < 1 || result > 99) {
    return 1;
  }
  return result;
};

// Keep the start date within the range that can change a feed: no earlier than
// the day the plan would already be finished, and at most a year ahead
const MAX_DAYS_AHEAD = 365;
const ClampStartDate = (date: Date, plan: 'nt' | 'ot' | 'full', chapters: number): Date => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const planLength = { full: fullBookList.length, ot: otBookList.length, nt: ntBookList.length }[plan];
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const earliest = todayUTC - Math.ceil(planLength / chapters) * DAY_MS;
  const latest = todayUTC + MAX_DAYS_AHEAD * DAY_MS;
  const startUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(Math.min(Math.max(startUTC, earliest), latest));
};

function formatDateToyyyyMMdd(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const MM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${MM}${dd}`;
}

// Build the RSS Feed Items
const BuildRSSFeedItems = (
  plan: string,
  translation: string,
  startDate: Date,
  numberOfChapters: number
): RSSItem[] => {
  let daysBetween = getDaysBetween(startDate);
  let chaptersToGet = daysBetween * numberOfChapters;

  // Security: Cap maximum chapters to prevent resource exhaustion
  // Full Bible has 1189 chapters - this is the absolute maximum
  chaptersToGet = Math.min(chaptersToGet, 1189);

  let bookList;
  const bookListMap: BookListMap = {
    full: fullBookList,
    ot: otBookList,
    nt: ntBookList,
  };

  bookList = bookListMap[plan] || fullBookList;

  const processChapter = (chapter: BookChapter, index: number): RSSItem => ({
    title: `${chapter.Book} ${chapter.Chapter}`,
    description: `Day ${Math.ceil(
      (index + 1) / numberOfChapters
    )} of ${plan.toUpperCase()} plan in ${translation.toUpperCase()}`,
    url: BuildBibleGatewayURL(chapter.Book, chapter.Chapter, translation),
    author: 'Bible Gateway',
    // Midnight UTC on the day the chapter becomes available (day N appears N days
    // after the start date), so the timestamp is stable across fetches
    date: new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()) +
        Math.ceil((index + 1) / numberOfChapters) * 24 * 60 * 60 * 1000
    ),
  });

  return bookList.slice(0, chaptersToGet).map(processChapter);
};

// Get the number of days between the start date and today
function getDaysBetween(date: Date): number {
  // Use UTC dates to ensure consistency between local dev and production
  const now = new Date();
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const compareUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  // A start date in the future has no chapters available yet
  const diffInMilliSeconds = Math.max(0, nowUTC - compareUTC);
  return Math.floor(diffInMilliSeconds / (1000 * 60 * 60 * 24));
}

// Build the bible gateway url
const BuildBibleGatewayURL = (book: string, chapter: number, translation: string): string =>
  `${bibleGatewaySlug}${encodeURIComponent(book)}%20${chapter}&version=${translation}`;

//Listen on port port (only when run directly, not when imported for testing)
if (require.main === module) {
  app.listen(port, () => console.log(`Express is listening at http://localhost:${port}`));
}

// Export app for testing
export default app;
