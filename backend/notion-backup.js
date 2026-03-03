/**
 * Backup all recipes from a Notion database to notion-backup.json.
 *
 * Uses:
 *   - NOTION_TOKEN
 *   - NOTION_DATABASE_ID
 *
 * Run from the backend directory:
 *   node notion-backup.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_TOKEN || !DATABASE_ID) {
  console.error('NOTION_TOKEN and NOTION_DATABASE_ID must be set in .env');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

async function listAllPages(databaseId) {
  const pages = [];
  let cursor = undefined;

  while (true) {
    const resp = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    pages.push(...resp.results);

    if (!resp.has_more) break;
    cursor = resp.next_cursor;
  }

  return pages;
}

async function listAllBlocks(blockId) {
  const blocks = [];
  let cursor = undefined;

  while (true) {
    const resp = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    blocks.push(...resp.results);

    if (!resp.has_more) break;
    cursor = resp.next_cursor;
  }

  return blocks;
}

async function main() {
  console.log('Fetching pages from Notion database…');
  const pages = await listAllPages(DATABASE_ID);
  console.log(`Found ${pages.length} pages. Fetching blocks for each…`);

  const records = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageId = page.id;

    const blocks = await listAllBlocks(pageId);

    records.push({
      page,
      properties: page.properties,
      blocks,
    });

    if ((i + 1) % 10 === 0) {
      console.log(`Processed ${i + 1} / ${pages.length} pages…`);
    }
  }

  const output = {
    savedAt: new Date().toISOString(),
    databaseId: DATABASE_ID,
    recipeCount: records.length,
    recipes: records,
  };

  const outPath = path.join(process.cwd(), 'notion-backup.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Saved ${records.length} recipes to ${outPath}`);
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});

