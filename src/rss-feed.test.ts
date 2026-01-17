import { describe, it, expect } from '@jest/globals';

/**
 * RSS Feed Tests
 *
 * These tests verify that the RSS feed generates the correct number of items
 * for different reading schedules (1, 5, and 10 days of reading).
 */

describe('RSS Feed Generation', () => {
  const baseUrl = process.env.TEST_URL || 'http://localhost:8787';

  /**
   * Helper function to parse RSS feed and count items
   */
  async function getRSSItemCount(url: string): Promise<number> {
    const response = await fetch(url);
    const text = await response.text();

    // Count <item> tags in the RSS feed
    const matches = text.match(/<item>/g);
    return matches ? matches.length : 0;
  }

  /**
   * Helper function to extract item titles from RSS feed
   */
  async function getRSSItems(url: string): Promise<string[]> {
    const response = await fetch(url);
    const text = await response.text();

    // Extract all titles from <title> tags within <item> blocks
    const titleRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<\/item>/g;
    const titles: string[] = [];
    let match;

    while ((match = titleRegex.exec(text)) !== null) {
      titles.push(match[1]);
    }

    return titles;
  }

  describe('Old Testament (OT) Plan', () => {
    it('should generate correct items for 1 day of reading (1 chapter/day)', async () => {
      // Start date: 1 day ago
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${baseUrl}/rssbible/ot/esv/${dateStr}/1/feed.rss`;
      const itemCount = await getRSSItemCount(url);
      const items = await getRSSItems(url);

      // Should have 1 day worth of chapters (1 chapter)
      expect(itemCount).toBe(1);
      expect(items[0]).toBe('Genesis 1');
    }, 10000);

    it('should generate correct items for 5 days of reading (1 chapter/day)', async () => {
      // Start date: 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const dateStr = fiveDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${baseUrl}/rssbible/ot/esv/${dateStr}/1/feed.rss`;
      const itemCount = await getRSSItemCount(url);
      const items = await getRSSItems(url);

      // Should have 5 days worth of chapters (5 chapters)
      expect(itemCount).toBe(5);
      expect(items[0]).toBe('Genesis 1');
      expect(items[4]).toBe('Genesis 5');
    }, 10000);

    it('should generate correct items for 10 days of reading (1 chapter/day)', async () => {
      // Start date: 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const dateStr = tenDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${baseUrl}/rssbible/ot/esv/${dateStr}/1/feed.rss`;
      const itemCount = await getRSSItemCount(url);
      const items = await getRSSItems(url);

      // Should have 10 days worth of chapters (10 chapters)
      expect(itemCount).toBe(10);
      expect(items[0]).toBe('Genesis 1');
      expect(items[9]).toBe('Genesis 10');
    }, 10000);
  });

  describe('Full Bible Plan', () => {
    it('should generate correct items for 5 days with 3 chapters/day', async () => {
      // Start date: 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const dateStr = fiveDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${baseUrl}/rssbible/full/niv/${dateStr}/3/feed.rss`;
      const itemCount = await getRSSItemCount(url);
      const items = await getRSSItems(url);

      // Should have 5 days * 3 chapters = 15 chapters
      expect(itemCount).toBe(15);
      expect(items[0]).toBe('Genesis 1');
      expect(items[14]).toBe('Genesis 15');
    }, 10000);

    it('should generate correct items for 10 days with 2 chapters/day', async () => {
      // Start date: 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const dateStr = tenDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${baseUrl}/rssbible/full/kjv/${dateStr}/2/feed.rss`;
      const itemCount = await getRSSItemCount(url);
      const items = await getRSSItems(url);

      // Should have 10 days * 2 chapters = 20 chapters
      expect(itemCount).toBe(20);
      expect(items[0]).toBe('Genesis 1');
      expect(items[19]).toBe('Genesis 20');
    }, 10000);
  });

  describe('New Testament (NT) Plan', () => {
    it('should generate correct items for 5 days of reading (1 chapter/day)', async () => {
      // Start date: 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const dateStr = fiveDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${baseUrl}/rssbible/nt/esv/${dateStr}/1/feed.rss`;
      const itemCount = await getRSSItemCount(url);
      const items = await getRSSItems(url);

      // Should have 5 days worth of chapters (5 chapters)
      expect(itemCount).toBe(5);
      expect(items[0]).toBe('Matthew 1');
      expect(items[4]).toBe('Matthew 5');
    }, 10000);
  });

  describe('RSS Feed Validation', () => {
    it('should return valid XML with required RSS elements', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${baseUrl}/rssbible/ot/esv/${dateStr}/1/feed.rss`;
      const response = await fetch(url);
      const text = await response.text();

      // Verify RSS structure
      expect(text).toContain('<?xml version="1.0"');
      expect(text).toContain('<rss version="2.0"');
      expect(text).toContain('<channel>');
      expect(text).toContain('<title>Bible Plan Feed</title>');
      expect(text).toContain('<description>');
      expect(text).toContain('<item>');
      expect(text).toContain('</rss>');

      // Verify content type (Express adds charset, Workers doesn't)
      const contentType = response.headers.get('content-type');
      expect(contentType).toMatch(/^application\/rss\+xml(; charset=utf-8)?$/);
    }, 10000);

    it('should include proper Bible Gateway links', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${baseUrl}/rssbible/ot/esv/${dateStr}/1/feed.rss`;
      const response = await fetch(url);
      const text = await response.text();

      // Verify Bible Gateway links are present (XML escaped)
      // Translation is normalized to uppercase canonical form
      expect(text).toContain('https://www.biblegateway.com/passage/?search=');
      expect(text).toContain('&amp;version=ESV');
    }, 10000);
  });
});
