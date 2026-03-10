# 🔥 Hearth — Recipe Manager

A personal recipe management web app. Store, browse, and cook from your recipe collection — with ingredient tracking, grocery lists, cook logging, and cookbook references.

**Live at:** https://hearth-z2lo.onrender.com

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React (Create React App) |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Hosting | Render |

---

## Project Structure

```
RecipeApp/
├── backend/
│   ├── server.js          # Express API — all routes and DB logic
│   ├── package.json
│   ├── .env               # DATABASE_URL, PORT (not committed)
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Entire React app
│   │   └── App.css        # All styles
│   ├── public/
│   │   ├── index.html
│   │   └── hearth-logo.png
│   ├── package.json
│   ├── .env               # REACT_APP_API_URL (not committed)
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## Development Workflow

This app runs fully on Render — there's no local dev server. The workflow for making changes is:

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

## API Reference

### Recipes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/recipes` | All recipes (summary fields) |
| `GET` | `/api/recipes/:id` | Single recipe with ingredients, instructions, notes |
| `POST` | `/api/recipes` | Create a recipe |
| `PUT` | `/api/recipes/:id` | Update a recipe |
| `DELETE` | `/api/recipes/:id` | Delete a recipe |

### Ingredients (kitchen inventory)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ingredients` | All known ingredients |
| `POST` | `/api/ingredients` | Add an ingredient |
| `PUT` | `/api/ingredients/:name` | Update an ingredient |
| `DELETE` | `/api/ingredients/:name` | Remove an ingredient |

### Other

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/match` | Match fridge contents to recipes |
| `POST` | `/api/grocery-list` | Build a grocery list from recipe IDs |
| `GET` | `/api/cook-log` | Fetch cook history |
| `POST` | `/api/cook-log` | Log a cook with rating + notes |

---

## Features

- **Recipe library** — browse, filter by tag/cuisine/calories/time/progress
- **Recipe pages** — inline editing of all fields, section by section
- **Cookbook references** — track physical cookbook recipes with page numbers, convert to full recipes later
- **Kitchen tracker** — fridge + pantry inventory; see what you can cook right now
- **Grocery list** — auto-built from Make Soon recipes, consolidated by category
- **Cook log** — log every cook with a star rating and notes
- **Profile** — cooking history (timeline + calendar view), recipe attempt counts, dietary restriction settings
- **Dietary warnings** — flags conflicting ingredients on recipe pages for Vegetarian, Vegan, Dairy-Free, Nut-Free, Gluten-Free

---

## Deployment (Render)

Both the backend and frontend are deployed on Render.

**Backend (Web Service):**
- Build command: `npm install`
- Start command: `node server.js`
- Environment variable: `DATABASE_URL`

**Frontend (Static Site):**
- Build command: `npm run build`
- Publish directory: `build`
- Environment variable: `REACT_APP_API_URL=https://<your-backend>.onrender.com`

The backend CORS origin is hardcoded in `server.js` — update it if your frontend URL changes:
```js
origin: 'https://hearth-z2lo.onrender.com'
```

---

## Database

Tables managed directly in Supabase. Core schema:

- `recipes` — name, cuisine, time, servings, calories, protein, fiber, cover_image_url, cookbook, page_number, status, recipe_incomplete, tags
- `ingredients` — name, type (produce / meat & fish / dairy / sauces / spices / alcohol / staples / other)
- `recipe_ingredients` — recipe_id, name, amount, unit, prep_note, optional, group_label, order_index
- `recipe_instructions` — recipe_id, step_number, body_text
- `recipe_notes` — recipe_id, text, order_index
- `cook_log` — recipe_id, recipe_name, cooked_at, rating, notes
