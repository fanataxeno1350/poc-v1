import config from '../../scripts/config.js';

const PAGE_SIZE = 500;
let indexPromise;

/**
 * Loads every page of the query index once (the index is paginated).
 * @returns {Promise<object[]>}
 */
function loadIndex() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const rows = [];
      let total = Infinity;
      try {
        while (rows.length < total) {
          // eslint-disable-next-line no-await-in-loop
          const resp = await fetch(`${config.search.indexUrl}?limit=${PAGE_SIZE}&offset=${rows.length}`);
          if (!resp.ok) throw new Error(`index ${resp.status}`);
          // eslint-disable-next-line no-await-in-loop
          const json = await resp.json();
          rows.push(...json.data);
          total = json.total ?? rows.length;
          if (!json.data.length) break;
        }
      } catch (e) {
        indexPromise = undefined;
        throw e;
      }
      return rows.filter((row) => !/noindex/i.test(row.robots || ''));
    })();
  }
  return indexPromise;
}

/**
 * Scores a page against the search terms; 0 means no match (every term must match).
 */
function score(page, terms) {
  const title = (page.title || '').toLowerCase();
  const description = (page.description || '').toLowerCase();
  const path = (page.path || '').toLowerCase();
  let total = 0;
  for (let i = 0; i < terms.length; i += 1) {
    const term = terms[i];
    let points = 0;
    if (title.includes(term)) points += title.startsWith(term) ? 6 : 4;
    if (description.includes(term)) points += 2;
    if (path.includes(term)) points += 1;
    if (!points) return 0;
    total += points;
  }
  return total;
}

function search(pages, query, maxResults) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return pages
    .map((page) => ({ page, points: score(page, terms) }))
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, maxResults)
    .map(({ page }) => page);
}

function titleFor(page) {
  if (page.title) return page.title;
  const last = page.path.split('/').filter(Boolean).pop() || 'Home';
  return last.replace(/[-_]/g, ' ');
}

function renderResults(list, pages) {
  list.replaceChildren(...pages.map((page) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = page.path;
    const title = document.createElement('span');
    title.className = 'search-result-title';
    title.textContent = titleFor(page);
    a.append(title);
    if (page.description) {
      const desc = document.createElement('span');
      desc.className = 'search-result-description';
      desc.textContent = page.description;
      a.append(desc);
    }
    li.append(a);
    return li;
  }));
}

export default function decorate(block) {
  // authored rows: placeholder, minimum characters, maximum results
  const [placeholderRow, minRow, maxRow] = [...block.children]
    .map((row) => row.textContent.trim());
  const placeholder = placeholderRow || 'Search pages';
  const minLength = Math.max(1, parseInt(minRow, 10) || 2);
  const maxResults = Math.max(1, parseInt(maxRow, 10) || 10);

  const form = document.createElement('form');
  form.setAttribute('role', 'search');
  form.noValidate = true;

  const label = document.createElement('label');
  label.htmlFor = 'search-input';
  label.className = 'search-label';
  label.textContent = 'Search pages';

  const input = document.createElement('input');
  Object.assign(input, {
    id: 'search-input', name: 'q', type: 'search', placeholder,
  });
  input.autocomplete = 'off';

  const status = document.createElement('p');
  status.className = 'search-status';
  status.setAttribute('role', 'status');

  const results = document.createElement('ul');
  results.className = 'search-results';
  results.setAttribute('aria-label', 'Search results');

  form.append(label, input);
  block.replaceChildren(form, status, results);

  let timer;
  const run = async () => {
    const query = input.value.trim();
    const url = new URL(window.location);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);

    if (query.length < minLength) {
      results.replaceChildren();
      status.textContent = '';
      return;
    }
    try {
      const matches = search(await loadIndex(), query, maxResults);
      // ignore stale responses if the user kept typing
      if (query !== input.value.trim()) return;
      renderResults(results, matches);
      status.textContent = matches.length
        ? `${matches.length} result${matches.length === 1 ? '' : 's'} found`
        : `No pages found for "${query}"`;
    } catch (e) {
      results.replaceChildren();
      status.textContent = 'Search is unavailable right now. Please try again later.';
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(timer);
    run();
  });

  const initial = new URLSearchParams(window.location.search).get('q');
  if (initial) {
    input.value = initial;
    run();
  }
}
