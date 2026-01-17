# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Bible RSS Feed Generator - A service that creates custom RSS feeds for Bible reading plans. Users can configure Old Testament (ot), New Testament (nt), or full Bible (full) reading plans with customizable start dates, translations, and daily chapter counts. Generates RSS feeds compatible with any RSS reader.

**Live Site:** https://www.bibleplanfeed.com

## Architecture

### Dual Deployment Model

The project supports **two deployment options** with identical functionality:

1. **Cloudflare Workers** (Recommended - Production)
   - Entry point: `src/worker.ts`
   - Serverless edge deployment with global CDN
   - Static assets served via Workers Assets
   - Free tier: 100,000 requests/day
   - Built-in DDoS protection

2. **Express.js Server** (Traditional Hosting)
   - Entry point: `src/index.ts`
   - Node.js/Express with security middleware
   - Rate limiting: 100 requests per 15 minutes per IP
   - Helmet security headers, compression

### Core Components

**RSS Feed Generation:**
- Manual XML generation (no external RSS library)
- Whitelist input validation for all parameters
- XML injection protection via `escapeXML()`
- Resource exhaustion protection (max 1189 chapters)
- UTC-based date calculations for global consistency

**Security Features:**
- Input sanitization: plan, translation, date, chapters
- Translation normalization to canonical uppercase
- Date validation with rollover detection
- URL encoding with `encodeURIComponent()`
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options

**Data Files:**
- `src/resources/full.json` - Complete Bible (1189 chapters)
- `src/resources/ot.json` - Old Testament only
- `src/resources/nt.json` - New Testament only
- `src/resources/translations.json` - Supported Bible translations

## Development Environment

### Tools Setup

```bash
# Install mise (version manager)
mise install

# This automatically installs:
# - Node.js 24 (latest LTS)
# - Wrangler (latest)
```

### Available Commands

```bash
# Development
npm start          # Build & run Express server (localhost:3000)
npm run dev        # Run Cloudflare Workers dev server (localhost:8787)
npm run build      # Compile TypeScript to dist/

# Testing
npm test           # Run Jest tests (defaults to localhost:8787)
TEST_URL=http://localhost:3000 npm test  # Test Express
TEST_URL=https://www.bibleplanfeed.com npm test  # Test production

# Deployment
npm run deploy     # Deploy to Cloudflare Workers

# Code Quality
npm run lint       # Run ESLint
```

## URL Pattern & Parameters

```
/rssbible/{plan}/{translation}/{startDate}/{chapters}/feed.rss
```

**Parameters:**
- `plan`: `ot` | `nt` | `full` (defaults to `full`)
- `translation`: Bible translation code (e.g., `esv`, `niv`, `kjv`) - normalized to uppercase
- `startDate`: Date in `yyyyMMdd` format (e.g., `20260117`)
- `chapters`: Number of chapters per day, 1-99 (defaults to 1)

**Validation:**
- Date range: 1900-2100 with rollover detection
- Chapter count: 1-99, rejects zero/negative
- Translation: Validated against translations.json whitelist
- Maximum chapters: Capped at 1189 (full Bible length)

## Code Patterns & Conventions

### Input Sanitization

All user inputs MUST be sanitized before use:

```typescript
// CORRECT
const plan = SanitizePlan(req.params.plan);
const translation = SanitizeTranslation(req.params.translation);
const startDate = SanitizeDate(req.params.startDate);
const chapters = SanitizeChapters(req.params.chapters);

// INCORRECT - Never use raw user input
const plan = req.params.plan; // ❌ Dangerous
```

### XML Generation

Always escape user data in XML:

```typescript
// CORRECT
<title>${escapeXML(item.title)}</title>

// INCORRECT
<title>${item.title}</title> // ❌ XML injection vulnerability
```

### Date Calculations

Use UTC dates for consistency:

```typescript
// CORRECT - UTC for global consistency
const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

// INCORRECT - Local timezone causes inconsistencies
const now = new Date();
now.setHours(0, 0, 0, 0); // ❌ Timezone-dependent
```

## Security Considerations

**Critical Rules:**
1. ALWAYS sanitize user inputs before processing
2. ALWAYS escape XML output via `escapeXML()`
3. ALWAYS use `encodeURIComponent()` for URL generation
4. NEVER allow unbounded resource allocation
5. NEVER trust user input directly

**Resource Protection:**
- Maximum chapters capped at 1189
- Rate limiting on Express (100 req/15min per IP)
- Cloudflare DDoS protection on Workers

**Headers:**
- Express: Helmet (CSP, HSTS, X-Powered-By removed)
- Workers: X-Content-Type-Options, X-Frame-Options
- Both: Cache-Control for optimal caching

## Testing

### Test Suite Coverage

- Old Testament, New Testament, Full Bible plans
- 1, 5, 10 day reading schedules
- Multiple chapters per day (1-5)
- RSS XML validation
- Bible Gateway link generation
- Security: Invalid inputs, resource exhaustion

### Test Philosophy

- One test file (`rss-feed.test.ts`) works for all deployments
- Tests default to `localhost:8787` (Wrangler)
- Override with `TEST_URL` environment variable
- All tests must pass before deployment

## Deployment

### Cloudflare Workers (Production)

```bash
npm run deploy
```

**Configuration:** `wrangler.toml`
- Custom domains: bibleplanfeed.com, www.bibleplanfeed.com
- Assets directory: `./public`
- Automatic SSL provisioning

### Static Assets

Files in `public/` are automatically deployed:
- `index.html` - Homepage with SEO meta tags
- `translations.json` - Available translations
- `icon.png` - Site icon
- `robots.txt` - SEO configuration
- `sitemap.xml` - Search engine sitemap

## Common Tasks

### Adding a New Bible Translation

1. Add to `src/resources/translations.json`:
   ```json
   { "Code": "NET", "Description": "New English Translation" }
   ```
2. Translation validation happens automatically
3. Deploy changes

### Modifying Security Settings

**Express Rate Limit:**
```typescript
// src/index.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Window
  max: 100,                   // Max requests
});
```

**Worker Headers:**
```typescript
// src/worker.ts
headers: {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // Add more headers here
}
```

### Adding New RSS Feed Fields

Update both `src/index.ts` and `src/worker.ts`:
1. Modify `RSSItem` interface
2. Update `generateRSSXML()` to include new field
3. Ensure proper XML escaping
4. Update tests

## Troubleshooting

**Tests failing with date issues:**
- Ensure using UTC dates in both implementations
- Check timezone normalization in `getDaysBetween()`

**RSS feed shows wrong number of items:**
- Verify start date is in correct format (yyyyMMdd)
- Check if date is too far in past (capped at 1189 chapters)

**Translation not working:**
- Verify translation exists in `translations.json`
- Translation codes are case-insensitive but normalized to uppercase
- Invalid translations default to ESV

**Security headers missing:**
- Express: Check Helmet configuration in `src/index.ts`
- Workers: Check headers in Response object in `src/worker.ts`

## Performance

**Caching:**
- RSS feeds: 1 hour cache (`max-age=3600`)
- Static assets: Automatic edge caching via Workers Assets

**Optimization:**
- No database queries (static JSON data)
- Minimal computation (array slicing + mapping)
- TypeScript strict mode for type safety
- Single-responsibility functions

## SEO Configuration

**Meta Tags:** Configured in `public/index.html`
- Viewport, description, keywords
- Open Graph for social sharing
- Canonical URL

**Indexing:**
- `robots.txt` allows all crawlers
- `sitemap.xml` lists homepage only
- RSS feeds not indexed (user-specific)

## Notes for AI/Claude

- Both implementations (`index.ts` and `worker.ts`) MUST stay in sync
- Security fixes MUST be applied to both files
- Always run tests after making changes
- Preserve existing security validations when refactoring
- UTC dates are critical for global consistency
- Resource exhaustion cap (1189) is a security requirement
- Translation normalization ensures consistency across the system
