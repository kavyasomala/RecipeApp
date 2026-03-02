import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ─── Helpers ───────────────────────────────────────────────────────────────
const pct = (score) => Math.round(score * 100);

const Badge = ({ children, variant = 'default' }) => (
  <span className={`badge badge--${variant}`}>{children}</span>
);

// ─── Recipe Summary Card ───────────────────────────────────────────────────
const RecipeCard = ({ recipe, match, onClick }) => {
  const {
    name,
    coverImage,
    cuisine,
    calories,
    protein,
  } = recipe;

  const matchScore = match?.matchScore ?? null;
  const canMakeNow = Boolean(match?.canMake);

  return (
    <article className="recipe-card" onClick={() => onClick(recipe)}>
      <div className="recipe-card__image">
        {coverImage ? (
          <img src={coverImage} alt={name} loading="lazy" />
        ) : (
          <div className="recipe-card__image-placeholder">No photo</div>
        )}

        {matchScore !== null && (
          <div className={`recipe-card__score ${canMakeNow ? 'recipe-card__score--ready' : ''}`}>
            {pct(matchScore)}%
          </div>
        )}
      </div>

      <div className="recipe-card__body">
        <div className="recipe-card__title-row">
          <h3 className="recipe-card__title">{name}</h3>
          {canMakeNow && <span className="recipe-card__can-make">Can make</span>}
        </div>

        <div className="recipe-card__meta">
          {cuisine && <Badge>{cuisine}</Badge>}
        </div>

        <div className="recipe-card__nutrition">
          {typeof calories === 'number' && <span className="recipe-card__pill">{Math.round(calories)} kcal</span>}
          {typeof protein === 'number' && <span className="recipe-card__pill">{Math.round(protein)}g protein</span>}
        </div>
      </div>
    </article>
  );
};

// ─── Notion content renderer ───────────────────────────────────────────────
const NotionContent = ({ content }) => {
  if (!content || content.length === 0) return null;

  const out = [];
  for (let i = 0; i < content.length; i++) {
    const node = content[i];

    if (node.type === 'bulleted_list_item') {
      const items = [];
      while (i < content.length && content[i].type === 'bulleted_list_item') {
        items.push(content[i]);
        i++;
      }
      i--;
      out.push(
        <ul key={`ul-${i}`} className="notion-list">
          {items.map((it, idx) => <li key={idx}>{it.text}</li>)}
        </ul>
      );
      continue;
    }

    if (node.type === 'numbered_list_item') {
      const items = [];
      while (i < content.length && content[i].type === 'numbered_list_item') {
        items.push(content[i]);
        i++;
      }
      i--;
      out.push(
        <ol key={`ol-${i}`} className="notion-list">
          {items.map((it, idx) => <li key={idx}>{it.text}</li>)}
        </ol>
      );
      continue;
    }

    if (node.type === 'heading_1') out.push(<h1 key={i} className="notion-h1">{node.text}</h1>);
    else if (node.type === 'heading_2') out.push(<h2 key={i} className="notion-h2">{node.text}</h2>);
    else if (node.type === 'heading_3') out.push(<h3 key={i} className="notion-h3">{node.text}</h3>);
    else if (node.type === 'paragraph') out.push(<p key={i} className="notion-p">{node.text}</p>);
    else if (node.type === 'quote') out.push(<blockquote key={i} className="notion-quote">{node.text}</blockquote>);
    else if (node.type === 'divider') out.push(<hr key={i} className="notion-hr" />);
    else if (node.type === 'image') {
      if (node.url) {
        out.push(
          <figure key={i} className="notion-figure">
            <img src={node.url} alt={node.caption || 'Recipe image'} />
            {node.caption && <figcaption>{node.caption}</figcaption>}
          </figure>
        );
      }
    }
  }

  return <div className="notion-content">{out}</div>;
};

// ─── Ingredient Picker ──────────────────────────────────────────────────────
const IngredientPicker = ({ allIngredients, selected, onChange }) => {
  const [search, setSearch] = useState('');

  // Group ingredients alphabetically
  const grouped = useMemo(() => {
    const filtered = allIngredients.filter(i =>
      i.toLowerCase().includes(search.toLowerCase())
    );
    return filtered.reduce((acc, ing) => {
      const letter = ing[0]?.toUpperCase() || '#';
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(ing);
      return acc;
    }, {});
  }, [allIngredients, search]);

  const toggle = (ing) => {
    const lower = ing.toLowerCase();
    onChange(prev =>
      prev.includes(lower) ? prev.filter(i => i !== lower) : [...prev, lower]
    );
  };

  const clearAll = () => onChange([]);
  const selectAll = () => onChange(allIngredients.map(i => i.toLowerCase()));

  return (
    <div className="picker">
      <div className="picker__header">
        <h2>What's in your fridge?</h2>
        <p className="picker__subtitle">
          {selected.length} ingredient{selected.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      <div className="picker__search-row">
        <input
          className="picker__search"
          type="search"
          placeholder="Search ingredients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="picker__actions">
          <button className="btn btn--ghost" onClick={clearAll}>Clear</button>
          <button className="btn btn--ghost" onClick={selectAll}>All</button>
        </div>
      </div>

      <div className="picker__grid-wrapper">
        {Object.entries(grouped).sort().map(([letter, items]) => (
          <div key={letter} className="picker__group">
            <div className="picker__group-label">{letter}</div>
            <div className="picker__chips">
              {items.map(ing => {
                const isSelected = selected.includes(ing.toLowerCase());
                return (
                  <button
                    key={ing}
                    className={`chip ${isSelected ? 'chip--selected' : ''}`}
                    onClick={() => toggle(ing)}
                  >
                    {isSelected && <span className="chip__check">✓</span>}
                    {ing}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p className="picker__empty">No ingredients match "{search}"</p>
        )}
      </div>
    </div>
  );
};

// ─── Recipe Detail Page ────────────────────────────────────────────────────
const RecipePage = ({ recipe, content, onBack, loading }) => {
  if (loading) {
    return (
      <main className="view">
        <div className="placeholder">
          <h2>Loading recipe…</h2>
        </div>
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="view">
        <div className="placeholder">
          <h2>Recipe not found</h2>
          <button className="btn btn--ghost" onClick={onBack}>← Back</button>
        </div>
      </main>
    );
  }

  return (
    <main className="view recipe-page">
      <button className="btn btn--ghost back-btn" onClick={onBack}>← Back</button>

      <div className="recipe-page__header">
        <div className="recipe-page__image">
          {recipe.coverImage ? (
            <img src={recipe.coverImage} alt={recipe.name} />
          ) : (
            <div className="recipe-page__image-placeholder">No photo</div>
          )}
        </div>

        <div className="recipe-page__summary">
          <h2 className="recipe-page__title">{recipe.name}</h2>
          <div className="recipe-page__meta">
            {recipe.cuisine && <Badge>{recipe.cuisine}</Badge>}
            {typeof recipe.calories === 'number' && <Badge variant="info">{Math.round(recipe.calories)} kcal</Badge>}
            {typeof recipe.protein === 'number' && <Badge variant="info">{Math.round(recipe.protein)}g protein</Badge>}
            {recipe.time && <Badge variant="time">⏱ {recipe.time}</Badge>}
            {recipe.servings && <Badge variant="info">🍽 {recipe.servings}</Badge>}
          </div>

          <a className="recipe-page__notion-link" href={recipe.notionUrl} target="_blank" rel="noreferrer">
            Open in Notion →
          </a>
        </div>
      </div>

      <NotionContent content={content} />
    </main>
  );
};

// ─── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'recipes' | 'fridge' | 'grocery' | 'add' | 'recipe'
  const [lastView, setLastView] = useState('home');
  const [allIngredients, setAllIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [fridgeIngredients, setFridgeIngredients] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeContent, setRecipeContent] = useState([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [librarySearch, setLibrarySearch] = useState('');

  // Load ingredients + recipes on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [ingRes, recipeRes] = await Promise.all([
          fetch(`${API}/api/ingredients`),
          fetch(`${API}/api/recipes`),
        ]);

        if (!ingRes.ok || !recipeRes.ok) throw new Error('Failed to load from Notion');

        const { ingredients } = await ingRes.json();
        const { recipes: recipeData } = await recipeRes.json();

        setAllIngredients(ingredients.sort());
        setRecipes(recipeData);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const libraryRecipes = useMemo(() => {
    const q = librarySearch.toLowerCase().trim();
    if (!q) return recipes;
    return recipes.filter(r => {
      const nameMatch = r.name.toLowerCase().includes(q);
      const cuisineMatch = (r.cuisine || '').toLowerCase().includes(q);
      const tagMatch = (r.tags || []).some(t => t.toLowerCase().includes(q));
      return nameMatch || cuisineMatch || tagMatch;
    });
  }, [recipes, librarySearch]);

  const matches = useMemo(() => {
    const fridge = new Set(fridgeIngredients.map(i => i.toLowerCase().trim()));
    if (fridge.size === 0) return [];

    const m = recipes.map(recipe => {
      const recipeIngredients = recipe.ingredients || [];
      const have = recipeIngredients.filter(i => fridge.has(i));
      const missing = recipeIngredients.filter(i => !fridge.has(i));
      const matchScore = recipeIngredients.length === 0 ? 0 : have.length / recipeIngredients.length;

      return {
        id: recipe.id,
        have,
        missing,
        matchScore,
        canMake: missing.length === 0 && recipeIngredients.length > 0,
      };
    });

    m.sort((a, b) => {
      if (a.canMake && !b.canMake) return -1;
      if (!a.canMake && b.canMake) return 1;
      return b.matchScore - a.matchScore;
    });

    return m;
  }, [fridgeIngredients, recipes]);

  const matchById = useMemo(() => {
    const map = new Map();
    for (const m of matches) map.set(m.id, m);
    return map;
  }, [matches]);

  const openRecipe = async (recipe) => {
    setLastView(view);
    setView('recipe');
    setRecipeLoading(true);
    try {
      const res = await fetch(`${API}/api/recipes/${recipe.id}`);
      if (!res.ok) throw new Error('Failed to load recipe details');
      const data = await res.json();
      setSelectedRecipe(data.recipe);
      setRecipeContent(data.content || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setRecipeLoading(false);
    }
  };

  const backFromRecipe = () => {
    setView(lastView);
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Connecting to your Notion kitchen...</p>
    </div>
  );

  if (error) return (
    <div className="error-screen">
      <div className="error-icon">⚠️</div>
      <h2>Couldn't connect to Notion</h2>
      <p>{error}</p>
      <p className="error-hint">Make sure your backend is running and your .env is configured.</p>
      <button className="btn btn--primary" onClick={() => window.location.reload()}>Try Again</button>
    </div>
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__bar">
          <div className="app-header__brand">
            <span className="app-header__logo">🍳</span>
            <div className="app-header__title-group">
              <span className="app-header__title">Recipe Library</span>
              <span className="app-header__subtitle">Your personal cookbook, powered by Notion</span>
            </div>
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${view === 'home' ? 'nav-tab--active' : ''}`}
              onClick={() => setView('home')}
            >
              Home
            </button>
            <button
              className={`nav-tab ${view === 'recipes' ? 'nav-tab--active' : ''}`}
              onClick={() => setView('recipes')}
              disabled={recipes.length === 0}
            >
              All Recipes
            </button>
            <button
              className={`nav-tab ${view === 'fridge' ? 'nav-tab--active' : ''}`}
              onClick={() => setView('fridge')}
            >
              Fridge Matcher
            </button>
            <button
              className={`nav-tab ${view === 'grocery' ? 'nav-tab--active' : ''}`}
              onClick={() => setView('grocery')}
            >
              Grocery List
            </button>
            <button
              className={`nav-tab ${view === 'add' ? 'nav-tab--active' : ''}`}
              onClick={() => setView('add')}
            >
              Add Recipe
            </button>
          </nav>
        </div>
      </header>

      {/* Recipe Detail Page */}
      {view === 'recipe' && (
        <RecipePage
          recipe={selectedRecipe}
          content={recipeContent}
          loading={recipeLoading}
          onBack={backFromRecipe}
        />
      )}

      {/* Fridge Matcher – sidebar ingredients + live matches */}
      {view === 'fridge' && (
        <main className="view matcher-layout">
          <section className="matcher-sidebar panel">
            <IngredientPicker
              allIngredients={allIngredients}
              selected={fridgeIngredients}
              onChange={setFridgeIngredients}
            />
          </section>
          <section className="matcher-main">
            <div className="library-header">
              <h2>Matches</h2>
              <p className="library-subtitle">
                {fridgeIngredients.length === 0
                  ? 'Select ingredients to see matches'
                  : `${matches.filter(m => m.matchScore > 0 || m.canMake).length} recipes matched`}
              </p>
            </div>

            <div className="recipe-grid">
              {(fridgeIngredients.length === 0
                ? recipes
                : recipes.filter(r => {
                    const m = matchById.get(r.id);
                    return m && (m.matchScore > 0 || m.canMake);
                  })
              )
                .sort((a, b) => {
                  const ma = matchById.get(a.id);
                  const mb = matchById.get(b.id);
                  if (!ma && !mb) return a.name.localeCompare(b.name);
                  if (ma && !mb) return -1;
                  if (!ma && mb) return 1;
                  if (ma.canMake && !mb.canMake) return -1;
                  if (!ma.canMake && mb.canMake) return 1;
                  return (mb.matchScore ?? 0) - (ma.matchScore ?? 0);
                })
                .map(r => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    match={matchById.get(r.id)}
                    onClick={openRecipe}
                  />
                ))}
            </div>

            {fridgeIngredients.length > 0 &&
              matches.filter(m => m.matchScore > 0 || m.canMake).length === 0 && (
                <div className="results-empty">
                  <p>No matches yet. Try selecting more ingredients.</p>
                </div>
              )}
          </section>
        </main>
      )}

      {/* Home – placeholders + selected recipe cards */}
      {view === 'home' && (
        <main className="view">
          <div className="home-top">
            <div className="panel home-panel">
              <h2 className="home-panel__title">Suggested Recipes</h2>
              <p className="home-panel__hint">Placeholder (we’ll fill this in later)</p>
            </div>
            <div className="panel home-panel">
              <h2 className="home-panel__title">Recipe Stats</h2>
              <p className="home-panel__hint">Placeholder (we’ll fill this in later)</p>
            </div>
          </div>

          <div className="library-header">
            <h2>Selected Recipes</h2>
            <p className="library-subtitle">Click a card to open the full recipe.</p>
          </div>

          <div className="recipe-grid">
            {recipes.slice(0, 12).map(r => (
              <RecipeCard
                key={r.id}
                recipe={r}
                match={matchById.get(r.id)}
                onClick={openRecipe}
              />
            ))}
          </div>
        </main>
      )}

      {/* All Recipes – library list */}
      {view === 'recipes' && (
        <main className="view">
          <div className="library-header">
            <h2>All Recipes</h2>
            <p className="library-subtitle">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in Notion
            </p>
          </div>

          <div className="library-search-row">
            <input
              className="library-search"
              type="search"
              placeholder="Search by recipe or tag..."
              value={librarySearch}
              onChange={e => setLibrarySearch(e.target.value)}
            />
            {librarySearch && (
              <button
                className="btn btn--ghost library-search-clear"
                onClick={() => setLibrarySearch('')}
              >
                Clear
              </button>
            )}
          </div>

          <div className="recipe-grid">
            {libraryRecipes.map(r => (
              <RecipeCard
                key={r.id}
                recipe={r}
                match={matchById.get(r.id)}
                onClick={openRecipe}
              />
            ))}
            {libraryRecipes.length === 0 && (
              <div className="results-empty">
                <p>No recipes match “{librarySearch}”.</p>
                <button
                  className="btn btn--ghost"
                  onClick={() => setLibrarySearch('')}
                >
                  Show all
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Grocery List (placeholder for now) */}
      {view === 'grocery' && (
        <main className="view">
          <div className="placeholder">
            <h2>Grocery List</h2>
            <p>Coming soon – a place to send missing ingredients into a shopping list.</p>
          </div>
        </main>
      )}

      {/* Add Recipe (placeholder for now) */}
      {view === 'add' && (
        <main className="view">
          <div className="placeholder">
            <h2>Add Recipe</h2>
            <p>For now, add recipes in Notion. Later this will become a form that writes to your database.</p>
          </div>
        </main>
      )}
    </div>
  );
}
