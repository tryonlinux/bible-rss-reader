# Bible Plan RSS Feed Generator

A custom RSS feed that enables users to read a set # of chapters per day on their RSS feed reader

## How to use

Build an RSS feed URL like the below examples. You specify the plan (ot, nt, full), the [translation code](./public/translations.json), start date, and the number of chapters you want to have added to your RSS Feed each day. For more information visit [https://www.bibleplanfeed.com/](https://www.bibleplanfeed.com/)

## Examples

**Notes: Dates are in yyyyMMdd format so June 5th, 2026 = 20260605**

- Old Testament Only with 1 chapter a day starting with 2026-01-01: [https://www.bibleplanfeed.com/rssbible/ot/esv/20260101/1/feed.rss](https://www.bibleplanfeed.com/rssbible/ot/esv/20260101/1/feed.rss)
- New Testament Only with 1 chapter a day starting with 2026-01-01: [https://www.bibleplanfeed.com/rssbible/nt/esv/20260101/1/feed.rss](https://www.bibleplanfeed.com/rssbible/nt/esv/20260101/1/feed.rss)
- Full bible with 1 chapter a day starting with 2026-01-01: [https://www.bibleplanfeed.com/rssbible/full/esv/20260101/1/feed.rss](https://www.bibleplanfeed.com/rssbible/full/esv/20260101/1/feed.rss)
- Full bible with 5 chapters a day starting with 2026-01-01: [https://www.bibleplanfeed.com/rssbible/full/esv/20260101/5/feed.rss](https://www.bibleplanfeed.com/rssbible/full/esv/20260101/5/feed.rss)

## Development & Deployment

This project supports two deployment options: traditional Node.js hosting and Cloudflare Workers.

### Prerequisites

**Option 1: Using mise (recommended)**
```bash
# Install mise if not already installed
# See https://mise.jdx.dev/getting-started.html

# mise will automatically install Node.js 24 and Wrangler when you enter the directory
mise install
```

**Option 2: Manual Node.js installation**
- Node.js 24 or higher
- npm 10 or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/tryonlinux/bible-rss-reader.git
cd bible-rss-reader

# Install dependencies
npm install
```

### Option A: Node.js/Express Server (Traditional Hosting)

Use this option for traditional hosting platforms (VPS, Render, Railway, Fly.io, etc.)

**Local Development:**
```bash
npm start
```
Server runs at `http://localhost:3000`

**Build for Production:**
```bash
npm run build
```

**Deploy to:**
- **Render/Railway/Fly.io**: Zero configuration needed - they auto-detect Node.js apps
- **VPS/Traditional Server**: Run the built files from `dist/` directory with Node.js

**Features:**
- Express.js server with Helmet security
- Rate limiting (100 requests per 15 minutes per IP)
- Compression enabled
- Static file serving for homepage (index.html, translations.json, icon.png)
- UTC-based date calculations for consistent behavior worldwide

### Option B: Cloudflare Workers (Serverless) - Recommended

Use this option for serverless deployment with zero server management and global edge delivery.

**Local Development:**
```bash
npm run dev
```
Server runs at `http://localhost:8787`

Test the endpoints:
- Homepage: `http://localhost:8787/`
- RSS Feed: `http://localhost:8787/rssbible/ot/esv/20240101/1/feed.rss`
- Translations: `http://localhost:8787/translations.json`

**Deploy to Cloudflare:**
```bash
npm run deploy
```

On first deploy, Wrangler will:
1. Prompt you to log in to Cloudflare (creates a free account if needed)
2. Ask you to choose/create a Workers subdomain (e.g., `your-worker.workers.dev`)
3. **Automatically deploy both the Worker and static assets**

The deployment includes:
- **RSS Feed API**: All RSS endpoints work at `/rssbible/...`
- **Static Files**: Automatically served from `public/` directory using Workers Assets
  - Homepage: `https://your-worker.workers.dev/`
  - Translations: `https://your-worker.workers.dev/translations.json`
  - Icon: `https://your-worker.workers.dev/icon.png`

**How Workers Assets Works:**
Workers Assets is Cloudflare's modern way to serve static files alongside dynamic Workers code:
- Files in `public/` directory are automatically uploaded and cached at the edge
- Static assets are served with optimal caching headers
- No additional configuration needed - it just works!
- Defined in `wrangler.toml`:
  ```toml
  [assets]
  directory = "./public"
  ```

**Features:**
- **Free Tier**: 100,000 requests/day (both API and static files)
- Global edge deployment (low latency worldwide)
- Built-in DDoS protection and CDN caching
- Zero server management
- Automatic scaling
- Static assets served from edge with optimal performance
- UTC-based date calculations for consistent behavior worldwide

**Custom Domain (Optional):**
To use a custom domain (e.g., `bibleplanfeed.com`):

1. Add your domain to Cloudflare DNS (free)
2. Update `wrangler.toml` and add:
   ```toml
   routes = [
     { pattern = "bibleplanfeed.com", custom_domain = true },
     { pattern = "www.bibleplanfeed.com", custom_domain = true }
   ]
   ```
3. Run `npm run deploy` again
4. Cloudflare automatically provisions SSL certificates

**Note:** Custom domain routes don't support wildcards or paths - use exact domain names only.

**Deployment URL:**
After deploying, your site will be available at:
- `https://your-worker.workers.dev` (or your custom domain)
- All static files and RSS feeds work automatically

## Testing

Comprehensive test suite for RSS feed generation:

```bash
npm test
```

**Test against specific server:**
```bash
# Test local Express server (port 3000)
TEST_URL=http://localhost:3000 npm test

# Test local Wrangler dev server (port 8787) - default
npm test

# Test production deployment
TEST_URL=https://www.bibleplanfeed.com npm test
```

**Tests cover:**
- Old Testament, New Testament, and Full Bible reading plans
- 1, 5, and 10 day reading schedules
- Multiple chapters per day (1-5 chapters)
- RSS feed XML validation
- Bible Gateway link generation
- Both Express and Cloudflare Workers implementations

All tests use the same test suite, ensuring consistent behavior across deployment options.

## Project Structure

```
├── src/
│   ├── index.ts          # Express.js server (Node.js hosting)
│   ├── worker.ts         # Cloudflare Workers entry point with Assets
│   ├── rss-feed.test.ts  # Comprehensive test suite
│   └── resources/        # Bible book/chapter data & translations
├── public/               # Static files (automatically deployed with Workers Assets)
│   ├── index.html        # Homepage
│   ├── translations.json # Available Bible translations
│   ├── icon.png          # Site icon
│   ├── robots.txt        # Search engine crawling rules
│   └── sitemap.xml       # Search engine sitemap
├── wrangler.toml        # Cloudflare Workers + Assets configuration
├── jest.config.js       # Jest test configuration
├── .mise.toml           # Node.js version management
└── package.json
```

## Available Scripts

- `npm start` - Build and start Express server (port 3000)
- `npm run dev` - Start Cloudflare Workers dev server (port 8787)
- `npm run build` - Compile TypeScript to dist/
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm test` - Run test suite (defaults to localhost:8787)
- `npm run lint` - Run ESLint on TypeScript files

## RSS Feed URL Format

```
/rssbible/{plan}/{translation}/{startDate}/{chapters}/feed.rss
```

- `{plan}`: `ot` (Old Testament), `nt` (New Testament), or `full` (Complete Bible)
- `{translation}`: Bible translation code (e.g., `esv`, `niv`, `kjv`) - see [translations.json](./public/translations.json)
- `{startDate}`: Start date in `yyyyMMdd` format (e.g., `20230101` for January 1, 2023)
- `{chapters}`: Number of chapters per day (1-99)

## Support

If you liked this and want to support it, feel free to [Buy Me A Coffee](https://buymeacoffee.com/tryomas). Thanks!

© 2026 Jordan Tryon [Source Code](https://github.com/tryonlinux/bible-rss-reader)
