import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Inspired by https://github.com/mckaywrigley/clarity-ai/blob/5a33db140d253f47da3f07ad1475938c14dfda45/pages/api/sources.ts

type Source = {
  url: string;
  text: string;
};

const cleanSourceText = (text: string) => {
  return text
    .trim()
    .replace(/(\n){4,}/g, '\n\n\n')
    .replace(/\n\n/g, ' ')
    .replace(/ {3,}/g, '  ')
    .replace(/\t/g, '')
    .replace(/\n+(\s*\n)*/g, '\n');
};

const getSources = async (query: string, sourceCount = 4) => {
  if (query.split(' ').length < 2) {
    return [];
  }
  // GET LINKS
  const response = await fetch(`https://www.google.com/search?q=${query}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const linkTags = $('a');

  const links: string[] = [];

  linkTags.each((i, link) => {
    const href = $(link).attr('href');

    if (href && href.startsWith('/url?q=')) {
      const cleanedHref = href.replace('/url?q=', '').split('&')[0];

      if (!links.includes(cleanedHref)) {
        links.push(cleanedHref);
      }
    }
  });

  const filteredLinks = links.filter((link, idx) => {
    const domain = new URL(link).hostname;

    if (link.includes('.pdf')) return false;

    const excludeList = [
      'google',
      'facebook',
      'twitter',
      'instagram',
      'youtube',
      'tiktok',
    ];
    if (excludeList.some((site) => domain.includes(site))) return false;

    return links.findIndex((l) => new URL(l).hostname === domain) === idx;
  });

  const finalLinks = filteredLinks.slice(0, sourceCount);

  // SCRAPE TEXT FROM LINKS
  const sources = (await Promise.all(
    finalLinks.map(async (link) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);

      try {
        const sourceResponse = await fetch(link, { signal: controller.signal });
        clearTimeout(id);
        const sourceHtml = await sourceResponse.text();
        const dom = new JSDOM(sourceHtml);
        const doc = dom.window.document;
        const parsed = new Readability(doc).parse();

        if (parsed) {
          const sourceText = cleanSourceText(parsed.textContent);

          return { url: link, text: sourceText };
        }

        return undefined;
      } catch (e) {
        return undefined;
      }
    })
  )) as Source[];

  const filteredSources = sources
    .filter((source) => source !== undefined)
    .map((source) => {
      return { ...source, text: source.text.slice(0, 1500) };
    });

  return filteredSources;
};

export default getSources;
