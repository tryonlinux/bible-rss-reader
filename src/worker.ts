import fullBookList from './resources/full.json';
import otBookList from './resources/ot.json';
import ntBookList from './resources/nt.json';
import translationsJSON from './resources/translations.json';

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

// Ensure the plan is valid, if not return full
const SanitizePlan = (plan: any): 'nt' | 'ot' | 'full' => {
  const validValues: Array<'nt' | 'ot' | 'full'> = ['nt', 'ot', 'full'];
  return validValues.includes(plan) ? plan : 'full';
};

// Ensure the date is valid, if not return today
const SanitizeDate = (dateString: string): Date => {
  if (dateString.length !== 8) {
    return new Date();
  }
  try {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1;
    const day = parseInt(dateString.substring(6, 8));

    // Validate ranges
    if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
      return new Date();
    }

    const date = new Date(year, month, day);
    // Check if date rolled over (e.g., Feb 30 became Mar 2)
    if (date.getMonth() !== month) {
      return new Date();
    }

    return date;
  } catch {
    return new Date();
  }
};

// Ensure the translation is valid, if not return ESV
const SanitizeTranslation = (translation: string): string => {
  const found = translationsJSON.find((item) => item.Code === translation.toUpperCase());
  return found ? found.Code : 'ESV';
};

// Ensure the Chapter is valid, if not return 1
const SanitizeChapters = (chapters: string): number => {
  if (chapters.length > 2) {
    return 1;
  }
  const result = parseInt(chapters, 10);
  if (isNaN(result) || result < 1 || result > 99) {
    return 1;
  }
  return result;
};

function formatDateToyyyyMMdd(date: Date): string {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
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
    date: new Date(
      new Date().setDate(
        new Date().getDate() - 1 - (daysBetween - Math.ceil((index + 1) / numberOfChapters))
      )
    ),
  });

  return bookList.slice(0, chaptersToGet).map(processChapter);
};

// Get the number of days between the start date and today
function getDaysBetween(date: Date): number {
  // Use UTC dates to ensure consistency between local dev and production
  const now = new Date();
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const compareUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

  const diffInMilliSeconds = Math.abs(nowUTC - compareUTC);
  return Math.floor(diffInMilliSeconds / (1000 * 60 * 60 * 24));
}

// Build the bible gateway url
const BuildBibleGatewayURL = (book: string, chapter: number, translation: string): string =>
  `${bibleGatewaySlug}${encodeURIComponent(book)}%20${chapter}&version=${translation}`;

// Environment interface for Workers Assets
interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

// Main Worker fetch handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle RSS feed endpoint
    const rssMatch = url.pathname.match(/^\/rssbible\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/feed\.rss$/);

    if (rssMatch) {
      const [, plan, translation, startDate, chapters] = rssMatch;

      const sanitizedPlan = SanitizePlan(plan);
      const sanitizedStartDate = SanitizeDate(startDate);
      const sanitizedChapters = SanitizeChapters(chapters);
      const sanitizedTranslation = SanitizeTranslation(translation);

      const feedMetadata = {
        title: 'Bible Plan Feed',
        description: 'Go to www.bibleplanfeed.com for more information.',
        feedUrl: `https://www.bibleplanfeed.com/rssbible/${sanitizedPlan}/${formatDateToyyyyMMdd(
          sanitizedStartDate
        )}/${sanitizedTranslation}/${sanitizedChapters}/feed.rss`,
        siteUrl: 'https://www.bibleplanfeed.com/',
        imageUrl: 'https://www.bibleplanfeed.com/icon.png',
        managingEditor: 'github.com/tryonlinux - Not affiliated with Bible Gateway',
        webMaster: 'github.com/tryonlinux',
        copyright: 'github.com/tryonlinux - Not affiliated with Bible Gateway',
        language: 'en',
        pubDate: new Date(),
        ttl: 60,
      };

      const items = BuildRSSFeedItems(
        sanitizedPlan,
        sanitizedTranslation,
        sanitizedStartDate,
        sanitizedChapters
      );
      const rssXML = generateRSSXML(feedMetadata, items);

      return new Response(rssXML, {
        headers: {
          'Content-Type': 'application/rss+xml',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      });
    }

    // Serve static assets (index.html, translations.json, icon.png)
    // Workers Assets automatically handles these from the public/ directory
    return env.ASSETS.fetch(request);
  },
};
