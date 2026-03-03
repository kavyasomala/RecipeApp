/**
 * Import parsed CSV data into Supabase Postgres.
 *
 * Uses:
 *   - DATABASE_URL (Postgres connection string, e.g. Supabase)
 *
 * Expected CSV files in the current directory:
 *   - parsed-ingredients.csv
 *   - parsed-instructions.csv
 *   - parsed-notes.csv
 *
 * Install dependencies (from backend directory):
 *   npm install pg csv-parse
 *
 * Run:
 *   node importParsedCsvToSupabase.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function readCsv(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  const v = String(value).toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'yes' || v === 'y';
}

function toInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  // eslint-disable-next-line no-restricted-globals
  return isNaN(n) ? null : n;
}

async function buildIngredientMapFromCsv(client, ingredientsRows) {
  const nameSet = new Set();
  for (const row of ingredientsRows) {
    const rawName = row.name || row.ingredient || '';
    const clean = rawName.toLowerCase().trim();
    if (clean) nameSet.add(clean);
  }

  console.log(`Found ${nameSet.size} unique ingredient names in CSV.`);

  let insertedCount = 0;
  for (const name of nameSet) {
    try {
      const insertSql = `
        INSERT INTO ingredients (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `;
      const res = await client.query(insertSql, [name]);
      if (res.rows.length > 0) {
        insertedCount += 1;
      }
    } catch (err) {
      console.error(`Failed to upsert ingredient "${name}":`, err.message);
    }
  }

  console.log(`Ingredients upserted. New rows inserted: ${insertedCount}.`);

  const map = new Map();
  const { rows } = await client.query('SELECT id, name FROM ingredients');
  for (const r of rows) {
    map.set(r.name.toLowerCase().trim(), r.id);
  }

  console.log(`Loaded ${map.size} ingredients into name→id map.`);
  return { map, insertedCount };
}

async function main() {
  console.log('Reading CSV files…');
  const ingredientRows = readCsv('parsed-ingredients.csv');
  const instructionRows = readCsv('parsed-instructions.csv');
  const noteRows = readCsv('parsed-notes.csv');

  console.log(
    `parsed-ingredients.csv: ${ingredientRows.length} rows\n` +
      `parsed-instructions.csv: ${instructionRows.length} rows\n` +
      `parsed-notes.csv: ${noteRows.length} rows`,
  );

  const client = await pool.connect();

  const failedIngredientRows = [];
  const failedInstructionRows = [];
  const failedNoteRows = [];

  let insertedBodyIngredients = 0;
  let insertedInstructions = 0;
  let insertedNotes = 0;

  try {
    // 1. Upsert all unique ingredients and build name→id map
    const { map: ingredientNameToId } =
      await buildIngredientMapFromCsv(client, ingredientRows);

    // 2. Insert recipe_body_ingredients rows
    console.log('\nImporting parsed ingredients into recipe_body_ingredients…');
    const ingredientRecipeProgress = new Set();

    for (const row of ingredientRows) {
      const notionId = (row.notion_id || '').trim();
      if (!notionId) {
        failedIngredientRows.push({
          row,
          error: 'Missing notion_id',
        });
        continue;
      }

      try {
        const rRes = await client.query(
          'SELECT id FROM recipes WHERE notion_id = $1',
          [notionId],
        );
        if (rRes.rows.length === 0) {
          failedIngredientRows.push({
            row,
            error: `Recipe not found for notion_id=${notionId}`,
          });
          continue;
        }
        const recipeId = rRes.rows[0].id;

        const rawName = row.name || row.ingredient || '';
        const ingredientName = rawName.toLowerCase().trim();
        if (!ingredientName) {
          failedIngredientRows.push({
            row,
            error: 'Empty ingredient name',
          });
          continue;
        }

        const ingredientId = ingredientNameToId.get(ingredientName);
        if (!ingredientId) {
          failedIngredientRows.push({
            row,
            error: `Ingredient id not found for name="${ingredientName}"`,
          });
          continue;
        }

        const insertSql = `
          INSERT INTO recipe_body_ingredients (
            recipe_id,
            ingredient_id,
            raw_text,
            amount,
            unit,
            prep_note,
            optional,
            group_label,
            order_index
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `;

        await client.query(insertSql, [
          recipeId,
          ingredientId,
          row.raw_text || null,
          row.amount || null,
          row.unit || null,
          row.prep_note || null,
          toBool(row.optional),
          row.group_label || null,
          toInt(row.order_index),
        ]);

        insertedBodyIngredients += 1;
        ingredientRecipeProgress.add(notionId);
        if (ingredientRecipeProgress.size % 20 === 0) {
          console.log(
            `Ingredients imported for ${ingredientRecipeProgress.size} recipes…`,
          );
        }
      } catch (err) {
        failedIngredientRows.push({
          row,
          error: err.message,
        });
      }
    }

    // 3. Insert instructions rows
    console.log('\nImporting parsed instructions into instructions…');
    const instructionRecipeProgress = new Set();

    for (const row of instructionRows) {
      const notionId = (row.notion_id || '').trim();
      if (!notionId) {
        failedInstructionRows.push({
          row,
          error: 'Missing notion_id',
        });
        continue;
      }

      try {
        const rRes = await client.query(
          'SELECT id FROM recipes WHERE notion_id = $1',
          [notionId],
        );
        if (rRes.rows.length === 0) {
          failedInstructionRows.push({
            row,
            error: `Recipe not found for notion_id=${notionId}`,
          });
          continue;
        }
        const recipeId = rRes.rows[0].id;

        const insertSql = `
          INSERT INTO instructions (
            recipe_id,
            step_number,
            body_text
          )
          VALUES ($1,$2,$3)
        `;

        await client.query(insertSql, [
          recipeId,
          toInt(row.step_number),
          row.body_text || null,
        ]);

        insertedInstructions += 1;
        instructionRecipeProgress.add(notionId);
        if (instructionRecipeProgress.size % 20 === 0) {
          console.log(
            `Instructions imported for ${instructionRecipeProgress.size} recipes…`,
          );
        }
      } catch (err) {
        failedInstructionRows.push({
          row,
          error: err.message,
        });
      }
    }

    // 4. Insert notes rows
    console.log('\nImporting parsed notes into notes…');
    const noteRecipeProgress = new Set();

    for (const row of noteRows) {
      const notionId = (row.notion_id || '').trim();
      if (!notionId) {
        failedNoteRows.push({
          row,
          error: 'Missing notion_id',
        });
        continue;
      }

      try {
        const rRes = await client.query(
          'SELECT id FROM recipes WHERE notion_id = $1',
          [notionId],
        );
        if (rRes.rows.length === 0) {
          failedNoteRows.push({
            row,
            error: `Recipe not found for notion_id=${notionId}`,
          });
          continue;
        }
        const recipeId = rRes.rows[0].id;

        const insertSql = `
          INSERT INTO notes (
            recipe_id,
            order_index,
            body_text
          )
          VALUES ($1,$2,$3)
        `;

        await client.query(insertSql, [
          recipeId,
          toInt(row.order_index),
          row.body_text || null,
        ]);

        insertedNotes += 1;
        noteRecipeProgress.add(notionId);
        if (noteRecipeProgress.size % 20 === 0) {
          console.log(
            `Notes imported for ${noteRecipeProgress.size} recipes…`,
          );
        }
      } catch (err) {
        failedNoteRows.push({
          row,
          error: err.message,
        });
      }
    }
  } catch (err) {
    console.error('Unexpected import error:', err);
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n=== Import summary ===');
  console.log(`recipe_body_ingredients inserted: ${insertedBodyIngredients}`);
  console.log(`instructions inserted:          ${insertedInstructions}`);
  console.log(`notes inserted:                 ${insertedNotes}`);

  if (failedIngredientRows.length) {
    console.log(
      `\nFailed ingredient rows: ${failedIngredientRows.length} (showing first 10):`,
    );
    console.log(
      failedIngredientRows.slice(0, 10).map((f) => ({
        notion_id: f.row.notion_id,
        name: f.row.name,
        error: f.error,
      })),
    );
  }

  if (failedInstructionRows.length) {
    console.log(
      `\nFailed instruction rows: ${failedInstructionRows.length} (showing first 10):`,
    );
    console.log(
      failedInstructionRows.slice(0, 10).map((f) => ({
        notion_id: f.row.notion_id,
        step_number: f.row.step_number,
        error: f.error,
      })),
    );
  }

  if (failedNoteRows.length) {
    console.log(
      `\nFailed note rows: ${failedNoteRows.length} (showing first 10):`,
    );
    console.log(
      failedNoteRows.slice(0, 10).map((f) => ({
        notion_id: f.row.notion_id,
        order_index: f.row.order_index,
        error: f.error,
      })),
    );
  }
}

main().catch((err) => {
  console.error('Fatal import error:', err);
  process.exit(1);
});

