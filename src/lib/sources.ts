import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { agent } from './openai';
import Logger from './logger';

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
  const agentResponse = await agent(query);

  Logger.log('agentResponse', agentResponse);

  if (agentResponse.text || !agentResponse.search) {
    return [];
  }

  const searchQuery = agentResponse.search;

  // GET LINKS
  const response = await fetch(
    `https://www.google.com/search?q=${searchQuery}`
  );
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
    try {
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
    } catch (e) {
      return false;
    }
  });

  const finalLinks = filteredLinks.slice(0, sourceCount);

  const scapePage = async (link: string) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1000);
    const sourceResponse = await fetch(link, { signal: controller.signal });
    clearTimeout(id);
    const sourceHtml = await sourceResponse.text();

    try {
      const dom = new JSDOM(sourceHtml);
      const doc = dom.window.document;
      const parsed = new Readability(doc).parse();

      if (parsed) {
        const sourceText = cleanSourceText(parsed.textContent);

        return { url: link, text: sourceText };
      }
    } catch (e) {
      Logger.log('Failed parsing:', link);
    }

    return undefined;
  };

  // SCRAPE TEXT FROM LINKS
  let failed = 0;
  const sourceFunc = async (
    link: string
  ): Promise<{ url: string; text: string } | undefined> => {
    Logger.log('Fetching link', link);
    try {
      return await scapePage(link);
    } catch (e) {
      Logger.log('Failed fetching:', link);
      if (failed > 2) return undefined;

      failed += 1;
      // Add the next link from the last index to the finalLinks array
      const nextLink = filteredLinks[finalLinks.length - 1 + failed];

      if (!nextLink) return undefined;
      Logger.log('Trying next link:', nextLink);
      return sourceFunc(nextLink);
    }
  };

  const sources = (await Promise.all(finalLinks.map(sourceFunc))) as Source[];

  const filteredSources = sources
    .filter((source) => source !== undefined)
    .map((source) => {
      return { ...source, text: source.text.slice(0, 1500) };
    });

  return filteredSources;
};

export default getSources;
