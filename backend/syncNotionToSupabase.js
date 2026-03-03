/* Sync recipes from Notion into Supabase Postgres.
 *
 * Uses:
 * - NOTION_TOKEN
 * - NOTION_DATABASE_ID
 * - DATABASE_URL  (Supabase Postgres connection string)
 *
 * Run from the backend directory:
 *   node syncNotionToSupabase.js
 */

const { Client } = require('@notionhq/client');
const { Pool } = require('pg');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ─── Notion parsing helpers (mirrors backend/server.js) ─────────────────────
const plainText = (richText = []) =>
  richText.map(t => t.plain_text).join('').trim();

const firstFileUrl = (files = []) => {
  const f = files?.[0];
  if (!f) return null;
  if (f.type === 'external') return f.external?.url || null;
  if (f.type === 'file') return f.file?.url || null;
  return null;
};

const getTitle = (props) => {
  const titleProp = Object.values(props).find(p => p.type === 'title');
  return plainText(titleProp?.title) || 'Untitled';
};

const getMultiSelect = (prop) => (prop?.multi_select || []).map(v => v.name);

const getSelectName = (prop) => prop?.select?.name || null;

const getNumber = (prop) => {
  if (!prop) return null;
  if (typeof prop.number === 'number') return prop.number;
  const rt = plainText(prop.rich_text);
  const n = Number(rt);
  return Number.isFinite(n) ? n : null;
};

const getPhotoUrl = (props, page) => {
  const photoProp = props['Photo?'] || props['Photo'] || props['Image'] || props['Photo'];
  if (photoProp?.type === 'files') {
    const url = firstFileUrl(photoProp.files);
    if (url) return url;
  }
  if (photoProp?.type === 'url' && photoProp.url) return photoProp.url;
  return page.cover?.external?.url || page.cover?.file?.url || null;
};

const normalizeRecipeSummary = (page) => {
  const props = page.properties || {};

  const ingredientsPropName = process.env.INGREDIENTS_PROPERTY || 'Ingredients';
  const ingredientsProp = props[ingredientsPropName];
  const ingredients = (ingredientsProp?.multi_select || [])
    .map(i => i.name.toLowerCase().trim())
    .filter(Boolean);

  const cuisine = getSelectName(props['Cuisine']) || (getMultiSelect(props['Cuisine'])?.[0] || null);
  const tagsProp = props['Tags'] || props['Category'];
  const tags = getMultiSelect(tagsProp).map(t => t.trim()).filter(Boolean);

  const calories = getNumber(props['Calories'] || props['Calorie'] || props['kcal']);
  const protein = getNumber(props['Protein'] || props['Protein (g)']);

  const timeProp = props['Time'] || props['Cook Time'] || props['Prep Time'];
  const time = getSelectName(timeProp) || plainText(timeProp?.rich_text) || null;

  const servingsProp = props['Servings'] || props['Serves'];
  const servings =
    (servingsProp?.number !== undefined && servingsProp?.number !== null)
      ? servingsProp.number
      : (plainText(servingsProp?.rich_text) || null);

  return {
    notionId: page.id,
    name: getTitle(props),
    ingredients,
    tags,
    cuisine,
    calories,
    protein,
    time,
    servings,
    coverImageUrl: getPhotoUrl(props, page),
    notionUrl: page.url,
  };
};

// ─── Fetch all recipes from Notion ──────────────────────────────────────────
async function fetchAllNotionRecipes() {
  console.log('Fetching recipes from Notion…');
  const recipes = [];
  let cursor = undefined;

  while (true) {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      recipes.push(normalizeRecipeSummary(page));
    }

    if (!response.has_more) break;
    cursor = response.next_cursor;
  }

  console.log(`Fetched ${recipes.length} recipes from Notion.`);
  return recipes;
}

// ─── DB helpers ─────────────────────────────────────────────────────────────
async function upsertRecipe(client, recipe) {
  const {
    notionId,
    name,
    cuisine,
    calories,
    protein,
    time,
    servings,
    coverImageUrl,
    notionUrl,
  } = recipe;

  const insertSql = `
    INSERT INTO recipes (
      notion_id, name, cuisine, calories, protein, time, servings,
      cover_image_url, notion_url
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (notion_id) DO NOTHING
    RETURNING id
  `;

  const values = [
    notionId,
    name,
    cuisine,
    calories,
    protein,
    time,
    servings,
    coverImageUrl,
    notionUrl,
  ];

  const res = await client.query(insertSql, values);
  if (res.rows.length > 0) {
    return res.rows[0].id;
  }

  const existing = await client.query(
    'SELECT id FROM recipes WHERE notion_id = $1',
    [notionId],
  );
  if (!existing.rows[0]) {
    throw new Error(`Recipe row not found after conflict for Notion id ${notionId}`);
  }
  return existing.rows[0].id;
}

async function getOrCreateIngredient(client, name) {
  const insertSql = `
    INSERT INTO ingredients (name)
    VALUES ($1)
    ON CONFLICT (name) DO NOTHING
    RETURNING id
  `;
  const res = await client.query(insertSql, [name]);
  if (res.rows.length > 0) return res.rows[0].id;

  const existing = await client.query(
    'SELECT id FROM ingredients WHERE name = $1',
    [name],
  );
  return existing.rows[0]?.id;
}

async function getOrCreateTag(client, name) {
  const insertSql = `
    INSERT INTO tags (name)
    VALUES ($1)
    ON CONFLICT (name) DO NOTHING
    RETURNING id
  `;
  const res = await client.query(insertSql, [name]);
  if (res.rows.length > 0) return res.rows[0].id;

  const existing = await client.query(
    'SELECT id FROM tags WHERE name = $1',
    [name],
  );
  return existing.rows[0]?.id;
}

// ─── Main sync routine ──────────────────────────────────────────────────────
async function sync() {
  const recipes = await fetchAllNotionRecipes();
  const client = await pool.connect();

  try {
    let count = 0;

    for (const recipe of recipes) {
      count += 1;
      console.log(`\n[${count}/${recipes.length}] Syncing "${recipe.name}" (${recipe.notionId})`);

      await client.query('BEGIN');

      const recipeId = await upsertRecipe(client, recipe);

      // Ingredients
      const uniqueIngredients = Array.from(new Set(recipe.ingredients));
      for (const ing of uniqueIngredients) {
        const ingId = await getOrCreateIngredient(client, ing);
        if (!ingId) continue;
        await client.query(
          `
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id)
          VALUES ($1,$2)
          ON CONFLICT DO NOTHING
        `,
          [recipeId, ingId],
        );
      }

      // Tags
      const uniqueTags = Array.from(new Set(recipe.tags));
      for (const tag of uniqueTags) {
        const tagId = await getOrCreateTag(client, tag);
        if (!tagId) continue;
        await client.query(
          `
          INSERT INTO recipe_tags (recipe_id, tag_id)
          VALUES ($1,$2)
          ON CONFLICT DO NOTHING
        `,
          [recipeId, tagId],
        );
      }

      await client.query('COMMIT');
      console.log(
        `→ Saved recipe, ${uniqueIngredients.length} ingredients, ${uniqueTags.length} tags.`,
      );
    }

    console.log('\n✅ Sync complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sync failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

sync().catch((err) => {
  console.error('Unhandled error in sync:', err);
  process.exitCode = 1;
});

