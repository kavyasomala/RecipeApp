# 🔥 Hearth — Recipe Manager

A personal recipe management web app. Store, browse, and cook from your recipe collection — with ingredient tracking, grocery lists, cook logging, cookbook references, and cooking notes.

**Live at:** https://hearth-z2lo.onrender.com

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 (Create React App) |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Hosting | Render |
| Drag & Drop | @dnd-kit |

---

## Project Structure

```
RecipeApp/
├── src/
│   ├── App.jsx        # Entire React frontend (all tabs, components, logic)
│   ├── App.css        # All styles
│   └── index.js       # React entry point
├── server.js          # Express API — all routes and DB logic
├── package.json       # Frontend dependencies
├── .gitignore
└── README.md
```

> Everything lives at root level. The backend (`server.js`) and frontend (`src/`) are deployed as separate services on Render.

---

## Development Workflow

This app runs fully on Render — there's no local dev server needed. The workflow for making changes is:

```
Edit files locally (App.jsx, App.css, server.js)
    ↓
Push to GitHub
    ↓
Render auto-deploys (~1–2 minutes)
    ↓
Check the live site
```

No `npm install` or `npm start` needed locally. `node_modules` is not committed and doesn't need to exist on your machine.

---

## Deployment (Render)

Both the backend and frontend are deployed on Render as separate services.

**Backend (Web Service):**
- Build command: `npm install`
- Start command: `node server.js`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`

**Frontend (Static Site):**
- Build command: `npm run build`
- Publish directory: `build`
- Environment variable: `REACT_APP_API_URL=https://<your-backend>.onrender.com`

The backend CORS origin is hardcoded in `server.js` — update it if your frontend URL changes:
```js
origin: 'https://hearth-z2lo.onrender.com'
```

---

## Environment Variables

**Backend `.env`:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_here
PORT=3001
```

**Frontend `.env`:**
```
REACT_APP_API_URL=https://<your-backend>.onrender.com
```

---

## Database Schema

Tables managed directly in Supabase:

| Table | Key Columns |
|---|---|
| `users` | id, username, password_hash, role, display_name |
| `user_settings` | user_id, favorites (jsonb), make_soon (jsonb) |
| `recipes` | name, cuisine, time, servings, calories, protein, fiber, cover_image_url, cookbook, status, recipe_incomplete, tags |
| `recipe_ingredients` | recipe_id, name, amount, unit, prep_note, optional, group_label, order_index |
| `recipe_instructions` | recipe_id, step_number, body_text, timer_seconds |
| `recipe_notes` | recipe_id, text, order_index |
| `cook_log` | user_id, recipe_id, recipe_name, cooked_at, rating, notes |
| `ingredients` | name, type, calories, protein, fiber, grams_per_unit |
| `cookbooks` | title, author, cover_image_url, spine_color, notes, recipes (jsonb) |
| `cooking_notes` | title, body, type, category, keywords, bullets, image_url |

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new user (role: `guest`) |
| `POST` | `/api/auth/login` | Public | Login, returns JWT token |
| `GET` | `/api/auth/me` | Bearer | Returns current user info |

### Recipes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/recipes` | Public | All recipes (summary fields) |
| `GET` | `/api/recipes/:id` | Public | Single recipe with ingredients, instructions, notes |
| `POST` | `/api/recipes` | Admin | Create a recipe |
| `PUT` | `/api/recipes/:id` | Admin | Update a recipe |
| `DELETE` | `/api/recipes/:id` | Admin | Delete a recipe |

### Ingredients

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ingredients` | Public | All known ingredients (with nutrition data) |
| `POST` | `/api/ingredients` | Admin | Add an ingredient |
| `PUT` | `/api/ingredients/:name` | Admin | Update an ingredient |
| `DELETE` | `/api/ingredients/:name` | Admin | Remove an ingredient |

### User Data

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/cook-log` | Bearer | Fetch user's cook history |
| `GET` | `/api/user/favorites` | Bearer | Fetch user's favorited recipe IDs |
| `PUT` | `/api/user/favorites` | Bearer | Update user's favorites |
| `GET` | `/api/user/make-soon` | Bearer | Fetch user's Make Soon list |
| `PUT` | `/api/user/make-soon` | Bearer | Update user's Make Soon list |
| `POST` | `/api/user/cook-log` | Bearer | Log a cook with rating + notes |

### Cookbooks

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cookbooks` | Public | All cookbooks |
| `POST` | `/api/cookbooks` | Admin | Create a cookbook |
| `PUT` | `/api/cookbooks/:id` | Admin | Update a cookbook |
| `DELETE` | `/api/cookbooks/:id` | Admin | Delete a cookbook |

### Other

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cooking-notes` | Public | All cooking notes |
| `POST` | `/api/cooking-notes` | Admin | Add a cooking note |
| `PUT` | `/api/cooking-notes/:id` | Admin | Update a cooking note |
| `DELETE` | `/api/cooking-notes/:id` | Admin | Delete a cooking note |
| `POST` | `/api/import/url` | Admin | Scrape a recipe from a URL |
| `GET` | `/api/admin/users` | Admin | List all users |
| `PUT` | `/api/admin/users/:id` | Admin | Update a user's role |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete a user |
| `POST` | `/api/admin/nutrition/recalculate` | Admin | Recalculate all recipe nutrition from ingredients |

---

## User Guide

### Getting Started

When you first open Hearth, you'll be prompted to log in. Enter your username and password. If you're brand new, use the Register option to create an account (new accounts start as `guest` role — an admin will need to grant you access if applicable).

Once logged in, you'll land on the **Home** view.

---

### Roles

| Role | Can Do |
|---|---|
| `guest` | Browse recipes, manage personal kitchen/favorites/make-soon, log cooks |
| `admin` | Everything above + add/edit/delete recipes, manage ingredients, manage users, manage cookbooks/notes |
| `suspended` | Cannot log in |

---

### Navigation

The app has the following main tabs, accessible from the top nav bar (or bottom nav on mobile):

- 🏠 **Home** — your personal dashboard
- 📖 **Recipes** — the full recipe library
- 🧊 **Kitchen** — fridge & pantry tracker
- 🛒 **Grocery** — auto-generated shopping list
- ➕ **Add** — add a new recipe (admin only)
- 💡 **Notes** — cooking techniques & tips
- 📚 **Cookbooks** — physical cookbook tracker
- 👤 **Profile** — your stats, settings, and cook history

---

### Home

The home screen is your personal dashboard. It shows:

**Make Soon** — a horizontal scroll row of recipes you've flagged with the ⏱ button. These are the recipes you're planning to cook. From here you can click a recipe to open it, or click the 🍳 button to mark it as cooked.

**What can I make?** — recipes automatically ranked by how many of their ingredients you already have in your kitchen. Each card shows a percentage match score. "✓ Ready" means you have everything. This section only appears once you've set up your kitchen ingredients.

**Recipe Insights sidebar** — four clickable stat tiles:
- ✅ Ready to cook — how many recipes you can make right now with your current kitchen
- 🔥 Almost ready — recipes where you have ≥70% of ingredients
- ⏱ Under 30 min — quick recipes in your library
- ♥ Favorites — how many recipes you've hearted

Clicking any tile takes you straight to the filtered recipe library.

---

### Recipes

The recipe library. All recipes are shown here with filtering, search, and two layout options.

**Layouts:**
- **Grid view** (default) — recipe cards with cover photos, stats, and quick-action buttons
- **List view** — a compact table with recipe name, cuisine, tags, time, calories, protein, and status

**Search:** Type in the search bar to filter by recipe name in real time.

**Filters** (click "Filters" to expand):
- **Tags** — filter by category chips: Meals, Desserts, Drinks, Pasta, Soup, Marinade, Party, Breakfast, Snack, Salad, Bread, Sauce, Sides
- **Cuisine** — filter by cuisine: Asian, Indian, Italian, Mediterranean, Mexican, Middle Eastern, Thai (or any custom cuisines you've added)
- **Progress/Status** — filter by: Ready to Cook, Almost Ready, Favorites, Incomplete, Needs Tweaking, Complete, To Try
- **Cookbooks** — filter by which physical cookbook a recipe is from, or "No cookbook"
- **Calories** — set a max/min calorie filter (under or over a number)
- **Time** — set a max cook time in minutes

Multiple filters can be active at once. The total matching count is shown at the bottom.

**Recipe cards show:**
- Cover photo (or placeholder)
- Recipe name + cuisine tag
- Cook time, calories, protein
- ✓ Ready badge if you have all the ingredients
- Match % score when filtering by Ready to Cook or Almost Ready
- 📖 corner badge for cookbook reference entries
- ♡/♥ heart button to favorite
- ⏱ button to add/remove from Make Soon
- 🍳 button (when in Make Soon) to mark as cooked

---

### Recipe Page

Click any recipe to open its full page.

**Hero section:** Large cover photo with the recipe name overlaid. Buttons in the top bar: ← Back, 🍳 Cooked (if it's in your Make Soon), ♡ Favorite, ⏱ Make Soon. Admins also get a ✎ pencil to change the cover image URL.

**Meta pills:** Cuisine, tags, time, servings — click any of these (admin only) to edit inline.

**Dietary warnings:** If you have dietary filters set in your profile (Vegetarian, Vegan, Dairy-Free, Nut-Free, Gluten-Free), a warning banner appears if any of the recipe's ingredients conflict.

**Nutrition bar:** Shows calculated calories, protein, and fiber. If the values are auto-estimated from ingredient data rather than manually set, they're shown with a `~` prefix. Admins can edit these manually.

**Ingredients:** Listed with amounts, units, and optional prep notes. Ingredients are grouped if the recipe uses group headers (e.g. "For the sauce"). Optional ingredients are marked. Admins can edit the entire ingredient list inline — drag to reorder, add/remove ingredients and groups.

**Instructions:** Numbered steps. As you cook, click each step to tick it off (greyed out = done). Progress is shown as a count. Some steps have inline timers — click the timer to start a countdown. Admins can edit steps inline, drag to reorder, and add timers to any step.

**Cooking Notes tooltips:** If a step contains words that match keywords in your Cooking Notes library, a 💡 tooltip appears. Click it to read the relevant technique or tip without leaving the recipe.

**Notes & modifications:** Freeform notes on the recipe (e.g. "great with oat milk", "add more garlic"). Admins can add, edit, and remove notes.

**Cook log:** At the bottom of the recipe, a history of every time it's been cooked — date, star rating (1–5), and any notes left at the time.

**Delete:** Admins only. A 🗑️ Delete button is shown; clicking it requires confirmation before permanently deleting the recipe and all its data.

**Cookbook reference recipes:** If a recipe is a cookbook reference (has a cookbook but no ingredients yet), a ✨ Convert to Full Recipe button appears. This opens a modal to fill in full ingredients and steps, converting it to a complete saved recipe.

---

### Marking a Recipe as Cooked

Click the 🍳 button on any recipe card (when it's in your Make Soon list) or the 🍳 Cooked button on the recipe page.

A two-step modal appears:

**Step 1 — Log the cook:**
- Optional 1–5 star rating with hover labels ("Didn't love it" → "Perfect! ⭐")
- Optional text notes (e.g. "Added more garlic, served with salad")
- Hit Save (or Next if the recipe has perishable ingredients)

**Step 2 — Update your kitchen** (only shown if the recipe has produce, meat & fish, or dairy ingredients):
- For each perishable ingredient used, choose ✓ Keep or ✕ Used up
- Ingredients marked "Used up" are automatically removed from your fridge
- Hit Update Kitchen, or Skip to skip this step

After saving, the recipe is removed from your Make Soon list and the cook is added to your log.

---

### Kitchen

The Kitchen tab is where you tell Hearth what you have at home. This powers the "What can I make?" matching.

**Fridge ingredients** — perishable items you currently have (produce, meat, dairy, etc.). Type to search and add from the global ingredient list. Remove items individually or clear all. After cooking a recipe, you'll be prompted to remove used-up perishables automatically.

**Pantry staples** — long-lasting ingredients you keep stocked (oils, spices, sauces, grains, etc.). Same add/remove interface. These persist and rarely need updating.

Both lists are saved to localStorage and synced to your account so they persist across devices.

Admins also see an **Ingredients Manager** section where they can add new ingredients to the global database, set nutrition data (calories/protein/fiber per 100g, and grams per unit for countable items like eggs), and delete ingredients.

---

### Grocery List

The Grocery tab auto-generates a shopping list from your **Make Soon** recipes.

All ingredients across your Make Soon recipes are combined, deduplicated, and grouped into categories:

🥦 Produce · 🥩 Meat & Fish · 🥛 Dairy · 🫙 Sauces · 🧂 Spices · 🍷 Alcohol · 🌾 Staples · 🛒 Other

Ingredients you already have in your kitchen (fridge + pantry) are shown as greyed-out "already have" items — they're excluded from what you need to buy.

You can tick off items as you shop, manually add extra items to the list, and clear checked items. The list updates live as your Make Soon list changes.

---

### Adding Recipes (Admin only)

The **Add** tab offers three ways to add a recipe:

**Manually** — fill in a form with name, cover image URL, time, servings, cuisine, tags, ingredients (with amounts, units, prep notes, and optional grouping), instructions (with optional inline timers per step), and notes. Calories/protein/fiber are auto-calculated from ingredients that have nutrition data in the database.

**From a URL** — paste any recipe page URL. Hearth will fetch and parse the page, extracting name, time, servings, cuisine, image, ingredients, steps, and calories from the page's structured data (JSON-LD). Works best with major food sites (NYT Cooking, Serious Eats, BBC Good Food, most food blogs). You can edit everything after import before saving.

**From text** — paste copied recipe text in any format. Hearth will attempt to parse the title, ingredients, and steps automatically. Review and edit before saving.

After saving, the new recipe is automatically added to your Make Soon list and opened immediately.

---

### Cookbooks

The **Cookbooks** tab is a digital tracker for your physical cookbook collection.

**Shelf view** — all your cookbooks displayed as a visual shelf with spine-styled tiles showing the title, author, and recipe count.

**Adding a cookbook** — click + Add Cookbook and fill in title, author, cover image URL (for a book cover photo), spine colour (choose from 8 colour swatches), and optional notes.

**Inside a cookbook** — click any book to open its detail view, which shows:
- Cover image, title, author, notes
- Recipe count + how many are saved in Hearth
- A progress bar showing how many recipes in the book you've cooked (tracked via your cook log)
- A searchable, sortable list of recipe entries

**Adding recipe entries:**
- **+ Add Reference** — add a single entry with name, page number, tags, cuisine, time, servings, optional nutrition, status, and image
- **⚡ Quick Add** — paste multiple recipe names (one per line) or a table (name + page number) for bulk import

**Sorting** — sort the list by Page #, A–Z, or Recently Added.

**Entry actions:**
- **🍳** — mark the recipe as cooked (logs it directly)
- **View →** — opens the full recipe in Hearth (if it's been saved/converted)
- **Actions ▾** menu (for unlinked entries):
  - **✨ Convert** — opens a modal to fill in full recipe details, converting the reference into a complete saved recipe in Hearth
  - **✎ Edit** — edit the name and page number inline
  - **✕ Remove** — remove the entry from this cookbook

Entries with a matching saved recipe in Hearth show a ✓ Saved badge and a View → link.

---

### Cooking Notes

The **Notes** tab is a searchable reference library of cooking techniques, rules, and tips.

Notes are categorised and typed:

| Type | Use for |
|---|---|
| 📏 Rule | Hard rules (e.g. "salt pasta water like the sea") |
| ⚖️ Ratio | Ratios and proportions (e.g. "1:2 rice to water") |
| 🔬 Science | The why behind techniques |
| 💡 Technique | How-to methods |
| 🌡️ Temperature | Temperature guidelines |
| ⏱ Timing | Timing rules |

Notes are grouped by category. Search filters across title, body, keywords, and bullet points in real time.

**Tooltips on recipe steps:** Each note has a set of keywords. If those keywords appear in a recipe's instruction steps, a 💡 tooltip appears inline on that step — hover or tap it to read the note without leaving the recipe.

Admins can add, edit, and delete notes. Each note can have a title, type, body text, bullet points, image URL, and keywords.

---

### Profile

The **Profile** tab has your personal settings and cooking history.

**Settings:**
- **Display name** — set a display name (shown in the UI; your username stays the same for login)
- **Units** — metric or imperial (affects how ingredient amounts are displayed)
- **Dietary restrictions** — toggle: Vegetarian, Vegan, Dairy-Free, Nut-Free, Gluten-Free. When set, recipe pages will warn you if ingredients conflict
- **Hide incompatible recipes** — toggle to filter out dietary-incompatible recipes from the library automatically

**Cook history** — a timeline of every recipe you've cooked, with date and rating. Switch between timeline view and calendar view (a heatmap showing how often you cook each day of the month).

**Most cooked** — a ranked list of recipes sorted by how many times you've cooked them, with the last cooked date.

**Sharing Options (admin only):**
- View all registered users
- Toggle admin access per user
- Suspend or restore users
- Remove users
- Reveal/hide each user's password (since passwords aren't hashed — see security note below)
- Add new friend accounts directly

**Admin Tools (admin only):**
- **Recalculate Nutrition** — clears manually-entered calorie/protein/fiber values and recalculates everything from scratch based on ingredient nutrition data. Run this if you've updated ingredient nutrition and want it to propagate to all recipes.

**Logout** — bottom of the profile page.

---

## Security Note

⚠️ Passwords are currently stored and compared in plain text. This is fine for a private personal app, but should be addressed (e.g. with bcrypt) before sharing more broadly.

---

## Footer

The site footer shows the last GitHub commit date (fetched live from the GitHub API) so you always know when the app was last updated.
