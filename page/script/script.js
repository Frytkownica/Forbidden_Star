/* Forbidden Stars — Card Codex
 * Vanilla, data-driven card browser. No framework / no build step.
 *
 * Data model (all under page/factions/):
 *   general.json                       — expansions, categories, default filenames
 *   <expansion>/faction.json           — factions in that expansion
 *   <expansion>/<faction>/text.json    — optional per-faction `filenames` override
 *   <expansion>/<faction>/<folder>/<file>  — the card artwork
 *
 * Missing artwork (e.g. an expansion without maps) is handled gracefully: a card
 * whose image 404s removes itself from the grid.
 */
(function () {
  'use strict';

  var ACCENT = 'amber'; // amber | steel | crimson  (drives --fs-accent CSS vars)
  var DENSITY = 5;      // grid columns for standard card categories (desktop)

  // Standard-card grid columns adapt to viewport width so cards stay readable
  // (the lightbox handles zoom). Map (1) and Faction Card (1) layouts unaffected.
  function density() {
    var w = window.innerWidth || 1200;
    if (w <= 480) return 2;
    if (w <= 720) return 3;
    if (w <= 1024) return 4;
    if (w <= 1440) return DENSITY;
    return DENSITY + 1;
  }

  // category ref -> on-disk folder (only `map` differs)
  var FOLDER = {
    combat: 'combat', orders: 'orders', events: 'events',
    backs: 'backs', faction_card: 'faction_card', map: 'maps',
  };
  // nicer category labels than the raw general.json names, by ref
  var CAT_LABEL = {
    combat: 'Combat', orders: 'Orders', events: 'Events',
    backs: 'Card Backs', faction_card: 'Faction Card', map: 'Maps', material: 'Unit Count',
  };
  var TIER_LABELS = ['Standard', 'Tier I', 'Tier II', 'Tier III', 'Tier IV', 'Tier V'];
  var BACK_LABELS = { combat: 'Combat Deck Back', order: 'Order Deck Back', event: 'Event Deck Back' };
  // a palette so every faction (across all expansions) gets a distinct dot
  var DOTS = [
    'oklch(0.64 0.12 245)', 'oklch(0.57 0.19 25)', 'oklch(0.66 0.15 142)', 'oklch(0.80 0.13 90)',
    'oklch(0.62 0.16 300)', 'oklch(0.70 0.13 195)', 'oklch(0.60 0.17 350)', 'oklch(0.72 0.14 60)',
  ];

  var ACC = {
    amber:   { a: 'oklch(0.80 0.12 80)',  fg: '#1c1810' },
    steel:   { a: 'oklch(0.72 0.10 232)', fg: '#0b1019' },
    crimson: { a: 'oklch(0.62 0.185 25)', fg: '#1c0d0c' },
  };

  /* ---------------- data store ---------------- */

  var DATA = {
    general: null,          // raw general.json
    expansions: [],         // [{key, name}]
    categories: [],         // [{key, name}]
    defaults: null,         // general.filenames
    factions: {},           // exp -> [{key, name, dot}]
    manifest: {},           // "exp/fac" -> {combat:[[..]], orders:[..], ...}  (filenames)
    text: {},               // "exp/fac" -> {combat:[[{title,general,unit,icons}]], orders:[..], events:[..]} or null
    faq: null,              // { topics:[{key,name,dot}], qa:[{t,q,a,tag}] } from data/FAQ.json
    loading: {},            // in-flight guards
  };

  function ensureFaq() {
    if (DATA.faq || DATA.loading.faq || !window.FS_FAQ) return;
    DATA.loading.faq = true;
    fetchJSON(window.FS_FAQ.src).then(function (raw) {
      DATA.faq = window.FS_FAQ.flatten(raw);
      render();
    }).catch(function (e) {
      console.error('FAQ load failed', e);
      DATA.faq = { topics: [{ key: 'all', name: 'All Questions', dot: 'oklch(0.80 0.12 80)' }], qa: [] };
      render();
    });
  }

  var state = {
    expansion: null, faction: null, category: 'combat', lb: null, lbFull: false, lbMag: false, lbZoom: 2, lbLensSize: 204,
    view: 'codex',            // 'codex' | 'faq'
    faqTopic: 'all', faqQuery: '', faqOpen: {},
  };
  var flat = []; // flat list of currently-visible cards, for the lightbox

  function setState(patch) {
    for (var k in patch) { if (patch.hasOwnProperty(k)) state[k] = patch[k]; }
    render();
  }

  function fetchJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
      return r.json();
    });
  }

  // load factions for an expansion (once)
  function ensureFactions(exp) {
    if (DATA.factions[exp] || DATA.loading['fac:' + exp]) return;
    DATA.loading['fac:' + exp] = true;
    fetchJSON('factions/' + exp + '/faction.json').then(function (fj) {
      var list = (fj.folder || []).map(function (key, i) {
        return { key: key, name: (fj.name && fj.name[i]) || key, dot: DOTS[i % DOTS.length] };
      });
      DATA.factions[exp] = list;
      // prefetch manifests so sidebar counts populate
      list.forEach(function (f) { ensureManifest(exp, f.key); });
      // if no faction selected for the now-active expansion, pick the first
      if (state.expansion === exp && !state.faction && list[0]) state.faction = list[0].key;
      render();
    }).catch(function (e) {
      DATA.factions[exp] = [];
      console.error(e);
      render();
    });
  }

  // load a faction's filename manifest (text.json override, else defaults)
  function ensureManifest(exp, fac) {
    var id = exp + '/' + fac;
    if (DATA.manifest[id] || DATA.loading['man:' + id]) return;
    DATA.loading['man:' + id] = true;
    fetchJSON('factions/' + exp + '/' + fac + '/text.json').then(function (t) {
      DATA.manifest[id] = mergeFilenames(t && t.filenames);
      DATA.text[id] = {
        combat: (t && t.combatText) || null,
        orders: (t && t.ordersText) || null,
        events: (t && t.eventsText) || null,
        materials: (t && t.materialsText) || null,
      };
      render();
    }).catch(function () {
      // no text.json -> use the global defaults, no overlay text
      DATA.manifest[id] = mergeFilenames(null);
      DATA.text[id] = { combat: null, orders: null, events: null, materials: null };
      render();
    });
  }

  function mergeFilenames(over) {
    var d = DATA.defaults || {};
    over = over || {};
    return {
      combat: over.combat || d.combat || [],
      orders: over.orders || d.orders || [],
      events: over.events || d.events || [],
      backs: over.backs || d.backs || [],
      faction_card: over.faction_card || d.faction_card || [],
      map: over.map || d.map || [],
    };
  }

  function manifestCount(man) {
    if (!man) return null;
    var n = 0;
    (man.combat || []).forEach(function (tier) { n += tier.length; });
    ['orders', 'events', 'backs', 'faction_card', 'map'].forEach(function (k) { n += (man[k] || []).length; });
    return n;
  }

  /* ---------------- lookups ---------------- */

  function facList() { return DATA.factions[state.expansion] || []; }
  function facName(k) { var f = findKey(facList(), k); return f ? f.name : ''; }
  function catName(k) { return CAT_LABEL[k] || (function () { var c = findKey(DATA.categories, k); return c ? c.name : ''; })(); }
  function expName(k) { var e = findKey(DATA.expansions, k); return e ? e.name : ''; }
  function findKey(list, key) {
    for (var i = 0; i < list.length; i++) { if (list[i].key === key) return list[i]; }
    return null;
  }

  /* ---------------- element builder ---------------- */

  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    for (var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      var val = props[key];
      if (val == null) continue;
      if (key === 'class') node.className = val;
      else if (key === 'html') node.innerHTML = val;
      else if (key === 'text') node.textContent = val;
      else if (key.indexOf('on') === 0 && typeof val === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else {
        node.setAttribute(key, val);
      }
    }
    if (children) {
      if (!Array.isArray(children)) children = [children];
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c == null || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  // For template cards (e.g. Symphony of War) draw the card text onto the art
  // and swap in the composited image once ready. Bare-art cards are left as-is.
  function applyComposite(imgEl, card) {
    if (!card.text || !card.kind || !window.FSCardRender) return;
    window.FSCardRender.compose(card).then(function (url) {
      if (url && url !== card.src) imgEl.src = url;
    });
  }

  function lbImg(card) {
    var img = el('img', { src: card.src, alt: card.label });
    applyComposite(img, card);
    return img;
  }

  // Magnifier lens: a circular loupe that follows the cursor over the lightbox
  // image, sampling the full-resolution source for close inspection.
  // Always wired; the lens only shows while state.lbMag is on. Toggling the
  // magnifier flips classes in place (see the toolbar button) — no re-render,
  // so the modal never flashes/reloads.
  function attachMagnifier(wrap, img) {
    var lens = el('div', { class: 'fs-lb-lens' });
    wrap.appendChild(lens);
    var ex = null, ey = null;
    function draw() {
      var L = state.lbLensSize;
      lens.style.width = L + 'px'; lens.style.height = L + 'px';
      if (!state.lbMag || ex == null) { lens.style.display = 'none'; return; }
      var r = img.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var x = ex - r.left, y = ey - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.style.display = 'none'; return; }
      var z = state.lbZoom;
      lens.style.display = 'block';
      lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
      lens.style.backgroundSize = (r.width * z) + 'px ' + (r.height * z) + 'px';
      lens.style.backgroundPosition = (-(x * z - L / 2)) + 'px ' + (-(y * z - L / 2)) + 'px';
      lens.style.left = (ex - wr.left - L / 2) + 'px';
      lens.style.top = (ey - wr.top - L / 2) + 'px';
    }
    img.addEventListener('mousemove', function (ev) { ex = ev.clientX; ey = ev.clientY; draw(); });
    img.addEventListener('mouseleave', function () { lens.style.display = 'none'; });
    // scroll = change magnification; Shift+scroll = resize the loupe circle
    img.addEventListener('wheel', function (ev) {
      if (!state.lbMag) return;
      ev.preventDefault();
      var delta = ev.deltaY !== 0 ? ev.deltaY : ev.deltaX; // shift may map wheel to X
      var up = delta < 0;
      if (ev.shiftKey) {
        state.lbLensSize = Math.max(120, Math.min(520, state.lbLensSize + (up ? 20 : -20)));
      } else {
        state.lbZoom = Math.max(1.4, Math.min(6, state.lbZoom + (up ? 0.3 : -0.3)));
      }
      draw();
    }, { passive: false });
  }

  // "Unit Count" — a faction's component tally, rendered as a table card.
  function renderMaterial(materials) {
    var body;
    if (materials && materials.length) {
      body = el('div', { class: 'fs-material-body' }, materials.map(function (item) {
        if (typeof item === 'string') return el('div', { class: 'fs-material-line', text: item });
        return el('div', { class: 'fs-material-line' }, [
          el('span', { class: 'fs-material-label', text: (item && item.label) || '' }),
          el('span', { class: 'fs-material-value', text: (item && item.value != null) ? String(item.value) : '' }),
        ]);
      }));
    } else {
      body = el('div', { class: 'fs-material-body' }, [
        el('p', { class: 'fs-note', text: 'Unit counts not available for this faction.' }),
      ]);
    }
    return el('div', { class: 'fs-material-card' }, [
      el('div', { class: 'fs-material-heading', text: 'Material' }),
      body,
    ]);
  }

  function maybeEmptyNote(scrollarea) {
    if (!scrollarea || scrollarea.querySelector('.fs-note')) return;
    var cards = scrollarea.querySelectorAll('.fs-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].style.display !== 'none') return; // still something visible
    }
    if (cards.length) scrollarea.appendChild(el('div', { class: 'fs-note', text: 'No artwork available for this set.' }));
  }

  /* ---------------- card model ---------------- */

  function build() {
    var fac = state.faction, cat = state.category;
    var id = state.expansion + '/' + fac;
    var man = DATA.manifest[id];
    var txt = DATA.text[id];
    var groups = [];
    flat = [];
    if (!man || !fac) return { groups: groups, ready: false };

    // "Unit Count" is a data table, not an image grid
    if (cat === 'material') {
      return { groups: groups, ready: true, material: (txt && txt.materials) || null };
    }

    var base = 'factions/' + state.expansion + '/' + fac + '/' + FOLDER[cat] + '/';
    function push(file, label, kind, text) {
      var idx = flat.length;
      var c = { src: base + file, label: label, index: idx, kind: kind || null, text: text || null };
      flat.push(c);
      return c;
    }

    if (cat === 'combat') {
      (man.combat || []).forEach(function (files, ti) {
        var label = TIER_LABELS[ti] || ('Set ' + (ti + 1));
        var tierTxt = txt && txt.combat ? txt.combat[ti] : null;
        var cards = files.map(function (f, i) {
          var t = tierTxt && tierTxt[i]
            ? { title: tierTxt[i].title, background: tierTxt[i].general, foreground: tierTxt[i].unit, icons: tierTxt[i].icons }
            : null;
          return push(f, facName(fac) + ' · ' + label + ' ' + (i + 1), 'combat', t);
        });
        if (cards.length) groups.push({ label: label, sub: cards.length + ' cards', cards: cards });
      });
    } else {
      var files = man[cat] || [];
      var labels, kind = null, textList = null;
      if (cat === 'backs') {
        labels = files.map(function (f) { return BACK_LABELS[f.replace(/\.[a-z]+$/i, '')] || 'Card Back'; });
      } else if (cat === 'faction_card') {
        labels = files.map(function (_, i) { return facName(fac) + ' Reference' + (files.length > 1 ? ' ' + (i + 1) : ''); });
      } else if (cat === 'map') {
        labels = files.map(function (_, i) { return 'Map ' + String.fromCharCode(65 + i); });
      } else if (cat === 'orders') {
        labels = files.map(function (_, i) { return 'Order Upgrade ' + (i + 1); });
        kind = 'orders'; textList = txt ? txt.orders : null;
      } else { // events
        labels = files.map(function (_, i) { return 'Event ' + (i + 1); });
        kind = 'events'; textList = txt ? txt.events : null;
      }
      var cards = files.map(function (f, i) {
        var t = (kind && textList && textList[i]) ? textList[i] : null;
        return push(f, labels[i], kind, t);
      });
      if (cards.length) groups.push({ label: null, sub: '', cards: cards });
    }
    return { groups: groups, ready: true };
  }

  /* ---------------- lightbox ---------------- */

  function openLb(idx) { setState({ lb: idx, lbFull: true }); } // open zoomed by default
  function closeLb() { setState({ lb: null }); }
  function step(d) {
    if (!flat.length || state.lb === null) return;
    setState({ lb: (state.lb + d + flat.length) % flat.length }); // preserve zoom state
  }

  document.addEventListener('keydown', function (e) {
    if (state.lb === null) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  /* ---------------- FAQ (Field Manual) view ---------------- */

  function faqTopicName(k) {
    var ts = (DATA.faq && DATA.faq.navTopics) || [];
    var t = findKey(ts, k);
    return t ? t.name : 'All Questions';
  }

  // one accordion row — the answer is always in the DOM and shown/hidden by CSS,
  // so toggling is a local class flip (no re-render, no scroll jump).
  function faqItemNode(it) {
    var open = !!state.faqOpen[it.id];
    var icon = el('span', { class: 'fs-faq-icon' + (open ? ' is-open' : '') });
    var head = el('button', { class: 'fs-faq-qbtn', onclick: function (e) {
      var o = !state.faqOpen[it.id];
      state.faqOpen[it.id] = o;
      e.currentTarget.parentNode.classList.toggle('is-open', o);
      icon.classList.toggle('is-open', o);
    } }, [
      el('span', { class: 'fs-faq-q', text: it.q }),
      icon,
    ]);
    var answer = el('div', { class: 'fs-faq-answer' }, [el('p', { class: 'fs-faq-atext', text: it.a })]);
    return el('div', { class: 'fs-faq-item' + (open ? ' is-open' : '') }, [head, answer]);
  }

  function renderFaqView() {
    ensureFaq();
    var hero = (window.FS_FAQ && window.FS_FAQ.hero) || {};
    var FAQ = DATA.faq || { navTopics: [], cats: [], count: {} };
    var ready = !!DATA.faq;
    var topic = state.faqTopic;
    var q = (state.faqQuery || '').trim().toLowerCase();
    var matches = function (it) { return !q || (it.q + ' ' + it.a).toLowerCase().indexOf(q) >= 0; };

    var app = el('div', { class: 'fs-app', 'data-accent': ACCENT });

    // header with centered search
    var search = el('input', {
      class: 'fs-faq-search', type: 'text', value: state.faqQuery,
      placeholder: 'Search questions…', spellcheck: 'false',
      oninput: function (e) { setState({ faqQuery: e.target.value }); },
    });
    var header = el('header', { class: 'fs-header fs-faq-header' }, [
      el('div', { class: 'fs-brand fs-brand-link', title: 'Home', onclick: goHome }, [
        el('div', { class: 'fs-logo' }, [el('div', { class: 'fs-logo-ring' }), el('div', { class: 'fs-logo-core' })]),
        el('div', { class: 'fs-brand-text' }, [
          el('span', { class: 'fs-brand-title', text: 'FORBIDDEN STARS' }),
          el('span', { class: 'fs-brand-sub', text: 'Field Manual · FAQ' }),
        ]),
      ]),
      el('div', { class: 'fs-header-spacer' }),
      el('div', { class: 'fs-faq-searchwrap' }, [
        el('span', { class: 'fs-faq-searchicon', html: '&#9906;' }),
        search,
      ]),
      el('div', { class: 'fs-header-spacer' }),
    ]);

    // sidebar: categories with their sub-categories nested
    var topicsNav = el('nav', { class: 'fs-nav' },
      FAQ.navTopics.map(function (t) {
        var active = topic === t.key;
        var cls = (t.kind === 'sub') ? ('fs-faq-subnav' + (active ? ' is-active' : ''))
          : ('fs-fac' + (t.kind === 'cat' ? ' fs-faq-catnav' : '') + (active ? ' is-active' : ''));
        var kids = [];
        if (t.kind !== 'sub') kids.push(el('span', { class: 'fs-fac-dot fs-faq-dot', style: 'background:' + (t.dot || 'var(--fs-accent)') + ';' }));
        kids.push(el('span', { class: 'fs-fac-name', text: t.name }));
        kids.push(el('span', { class: 'fs-fac-count', text: String(FAQ.count[t.key] || 0) }));
        return el('button', { class: cls, onclick: (function (key) { return function () { setState({ faqTopic: key }); }; })(t.key) }, kids);
      })
    );
    var sidebar = el('aside', { class: 'fs-sidebar fs-scroll' }, [
      el('div', { class: 'fs-sidebar-label', text: 'Topics' }),
      topicsNav,
      el('div', { class: 'fs-sidebar-foot' }, [
        el('button', { class: 'fs-faq-link fs-faq-back', html: '&larr; Back to Card Codex',
          onclick: function () { setState({ view: 'codex' }); } }),
        el('p', { html: 'FAN PROJECT &middot; NON&#8209;COMMERCIAL<br>Artwork &copy; Games Workshop' }),
      ]),
    ]);

    // main: hero + grouped content (Category › SubCategory › Faction › questions)
    var showAll = topic === 'all';
    var sections = [];
    var shown = 0;
    FAQ.cats.forEach(function (cat) {
      var catSelected = showAll || topic === cat.key || topic.indexOf(cat.key + '_') === 0;
      if (!catSelected) return;
      var subNodes = [];
      cat.subs.forEach(function (sub) {
        if (!showAll && topic !== cat.key && topic !== sub.key) return;
        var facNodes = [];
        sub.factions.forEach(function (fac) {
          var its = fac.items.filter(matches);
          if (!its.length) return;
          shown += its.length;
          facNodes.push(el('div', { class: 'fs-faq-facgroup' }, [
            el('div', { class: 'fs-faq-fachead' }, [
              el('span', { class: 'fs-faq-facname', text: fac.faction || sub.name }),
              el('span', { class: 'fs-faq-faccount', text: String(its.length) }),
              fac.picture ? el('img', { class: 'fs-faq-facicon', src: fac.picture, alt: '', loading: 'lazy' }) : null,
            ]),
            el('div', { class: 'fs-faq-list' }, its.map(faqItemNode)),
          ]));
        });
        if (facNodes.length) {
          // skip the sub-heading when this exact sub is the selected topic — the
          // section row already names it (avoids a duplicate label)
          var subKids = (topic === sub.key) ? [] : [el('div', { class: 'fs-faq-sublabel', text: sub.name })];
          subNodes.push(el('div', { class: 'fs-faq-subsection' }, subKids.concat(facNodes)));
        }
      });
      if (subNodes.length) {
        var catChildren = [];
        if (showAll) catChildren.push(el('h2', { class: 'fs-faq-cathead' }, [
          el('span', { class: 'fs-faq-catdot', style: 'background:' + cat.dot + ';' }),
          cat.name,
        ]));
        sections.push(el('div', { class: 'fs-faq-catblock' }, catChildren.concat(subNodes)));
      }
    });

    var contentInner;
    if (!ready) {
      contentInner = el('div', { class: 'fs-note', text: 'Loading…' });
    } else if (shown) {
      contentInner = el('div', { class: 'fs-faq-sections' }, sections);
    } else {
      contentInner = el('div', { class: 'fs-faq-empty' }, [
        el('div', { class: 'fs-faq-empty-glyph' }, [el('div', { class: 'ring' })]),
        el('p', { class: 'fs-note', text: q ? ('No questions match “' + state.faqQuery + '”. Try another term or clear the search.') : 'No questions in this section.' }),
      ]);
    }

    var body = [
      el('div', { class: 'fs-faq-hero' }, [
        el('span', { class: 'fs-faq-kicker', text: hero.kicker || '' }),
        el('h1', { class: 'fs-faq-title', text: hero.title || '' }),
        el('p', { class: 'fs-faq-blurb', text: hero.blurb || '' }),
      ]),
      el('div', { class: 'fs-faq-content' }, [
        el('div', { class: 'fs-faq-sectionrow' }, [
          el('span', { class: 'fs-faq-sectionlabel', text: faqTopicName(topic) }),
          el('span', { class: 'fs-faq-countlabel', text: shown + ' ' + (shown === 1 ? 'question' : 'questions') }),
        ]),
        contentInner,
      ]),
    ];
    var main = el('main', { class: 'fs-main fs-scroll fs-faq-main' }, body);

    app.appendChild(header);
    app.appendChild(el('div', { class: 'fs-body' }, [sidebar, main]));

    var root = document.getElementById('app');
    root.innerHTML = '';
    root.appendChild(app);
  }

  /* ---------------- render ---------------- */

  function render() {
    if (state.view === 'faq') { renderFaqView(); return; }
    var acc = ACC[ACCENT] || ACC.amber;
    var cols = Math.max(2, Math.min(8, density()));
    var cat = state.category;

    var built = build();
    var groups = built.groups;

    // grid geometry per category. Faction Card + Maps render at the image's
    // NATURAL aspect (no forced ratio / no crop) since their dimensions vary by
    // expansion (e.g. The Dying Light reference sheets are landscape, not portrait).
    var naturalCard = (cat === 'faction_card' || cat === 'map');
    var gridCols, gridJustify, cardAspect;
    if (cat === 'faction_card') {
      gridCols = 'repeat(1, minmax(0, 920px))'; gridJustify = 'center'; cardAspect = '';
    } else if (cat === 'map') {
      gridCols = 'repeat(1, minmax(0, 920px))'; gridJustify = 'center'; cardAspect = '';
    } else {
      gridCols = 'repeat(' + cols + ', minmax(0, 1fr))'; gridJustify = 'start'; cardAspect = '434 / 615';
    }

    var app = el('div', { class: 'fs-app', 'data-accent': ACCENT });

    /* ---- header ---- */
    var exptabs = el('div', { class: 'fs-exptabs fs-scroll' },
      DATA.expansions.map(function (e) {
        return el('button', {
          class: 'fs-tab' + (state.expansion === e.key ? ' is-active' : ''),
          onclick: (function (key) { return function () { selectExpansion(key); }; })(e.key),
        }, [el('span', { text: e.name })]);
      })
    );
    var header = el('header', { class: 'fs-header' }, [
      el('div', { class: 'fs-brand fs-brand-link', title: 'Home', onclick: goHome }, [
        el('div', { class: 'fs-logo' }, [
          el('div', { class: 'fs-logo-ring' }),
          el('div', { class: 'fs-logo-core' }),
        ]),
        el('div', { class: 'fs-brand-text' }, [
          el('span', { class: 'fs-brand-title', text: 'FORBIDDEN STARS' }),
          el('span', { class: 'fs-brand-sub', text: 'Card Codex' }),
        ]),
      ]),
      exptabs,
    ]);

    /* ---- sidebar ---- */
    var nav = el('nav', { class: 'fs-nav' },
      facList().map(function (f) {
        var cnt = manifestCount(DATA.manifest[state.expansion + '/' + f.key]);
        return el('button', {
          class: 'fs-fac' + (state.faction === f.key ? ' is-active' : ''),
          onclick: (function (key) { return function () { setState({ faction: key, lb: null }); }; })(f.key),
        }, [
          el('span', { class: 'fs-fac-dot', style: 'background:' + f.dot + ';' }),
          el('span', { class: 'fs-fac-name', text: f.name }),
          el('span', { class: 'fs-fac-count', text: cnt == null ? '' : String(cnt) }),
        ]);
      })
    );
    var sidebar = el('aside', { class: 'fs-sidebar' }, [
      el('div', { class: 'fs-sidebar-label', text: 'Factions' }),
      nav,
      el('div', { class: 'fs-sidebar-section' }, [
        el('div', { class: 'fs-sidebar-label', text: 'Reference' }),
        el('button', { class: 'fs-fac fs-faq-entry', onclick: function () { setState({ view: 'faq' }); } }, [
          el('span', { class: 'fs-fac-dot fs-faq-dot', style: 'background:var(--fs-accent);' }),
          el('span', { class: 'fs-fac-name', text: 'Field Manual / FAQ' }),
          el('span', { class: 'fs-fac-count', html: '&rsaquo;' }),
        ]),
      ]),
      el('div', { class: 'fs-sidebar-foot' }, [
        el('p', { html: 'FAN PROJECT &middot; NON&#8209;COMMERCIAL<br>Artwork &copy; Games Workshop' }),
      ]),
    ]);

    /* ---- main ---- */
    var main = el('main', { class: 'fs-main' });

    var cattabs = el('div', { class: 'fs-cattabs fs-scroll' },
      DATA.categories.map(function (c) {
        return el('button', {
          class: 'fs-cat' + (cat === c.key ? ' is-active' : ''),
          onclick: (function (key) { return function () { setState({ category: key, lb: null }); }; })(c.key),
          text: catName(c.key),
        });
      })
    );
    main.appendChild(el('div', { class: 'fs-cattabs-wrap' }, [cattabs]));

    main.appendChild(el('div', { class: 'fs-breadcrumb' }, [
      el('div', { class: 'fs-bc-left' }, [
        el('span', { class: 'fs-bc-exp', text: expName(state.expansion) }),
        el('span', { class: 'fs-bc-sep', text: '/' }),
        el('h1', { class: 'fs-bc-title', text: (facName(state.faction) || '…') + ' — ' + catName(cat) }),
      ]),
      el('span', {
        class: 'fs-bc-total',
        text: cat === 'material'
          ? ((built.material && built.material.length ? built.material.length + ' units' : ''))
          : (flat.length + ' ' + (flat.length === 1 ? 'card' : 'cards')),
      }),
    ]));

    var scrollarea = el('div', { class: 'fs-scrollarea fs-scroll' });
    if (!built.ready) {
      scrollarea.appendChild(el('div', { class: 'fs-note', text: 'Loading…' }));
    } else if (cat === 'material') {
      scrollarea.appendChild(renderMaterial(built.material));
    } else if (!groups.length) {
      scrollarea.appendChild(el('div', { class: 'fs-note', text: 'No cards of this type in this set.' }));
    } else {
      groups.forEach(function (group) {
        if (group.label) {
          scrollarea.appendChild(el('div', { class: 'fs-group-head' }, [
            el('span', { class: 'fs-group-label', text: group.label }),
            el('span', { class: 'fs-group-rule' }),
            el('span', { class: 'fs-group-sub', text: group.sub }),
          ]));
        }
        var grid = el('div', {
          class: 'fs-grid',
          style: 'grid-template-columns:' + gridCols + ';justify-content:' + gridJustify + ';',
        }, group.cards.map(function (card) {
          var btn = el('button', {
            class: 'fs-card' + (naturalCard ? ' fs-card--natural' : ''),
            title: card.label,
            style: cardAspect ? ('aspect-ratio:' + cardAspect + ';') : '',
            onclick: (function (idx) { return function () { openLb(idx); }; })(card.index),
          }, [
            el('img', { src: card.src, alt: card.label, loading: 'lazy' }),
          ]);
          var imgEl = btn.querySelector('img');
          // hide the whole card if its artwork fails to load (e.g. a set without maps);
          // if that empties the whole view, surface a note instead of a blank panel
          imgEl.addEventListener('error', function () {
            btn.style.display = 'none';
            maybeEmptyNote(scrollarea);
          });
          applyComposite(imgEl, card);
          return btn;
        }));
        scrollarea.appendChild(grid);
      });
    }
    main.appendChild(scrollarea);

    app.appendChild(header);
    app.appendChild(el('div', { class: 'fs-body' }, [sidebar, main]));

    /* ---- lightbox ---- */
    if (state.lb !== null) {
      var c = flat[state.lb];
      if (c) {
        var full = state.lbFull;
        var mag = state.lbMag;

        var imgEl = lbImg(c);
        var imgWrap = el('div', { class: 'fs-lb-imgwrap' + (mag ? ' mag-on' : '') }, [imgEl]);
        attachMagnifier(imgWrap, imgEl); // always wired; gated by state.lbMag

        var children = [
          el('button', {
            class: 'fs-lb-nav', 'aria-label': 'Previous card', html: '&lsaquo;',
            onclick: function (e) { e.stopPropagation(); step(-1); },
          }),
          el('figure', { class: 'fs-lb-fig' + (full ? ' is-full' : ''), onclick: function (e) { e.stopPropagation(); } }, [
            imgWrap,
            el('figcaption', { class: 'fs-lb-cap' }, [
              el('span', { class: 'fs-lb-label', text: c.label }),
              el('span', {
                class: 'fs-lb-meta',
                text: catName(cat) + ' · ' + facName(state.faction) + ' · ' + (state.lb + 1) + ' / ' + flat.length,
              }),
            ]),
          ]),
          el('button', {
            class: 'fs-lb-nav', 'aria-label': 'Next card', html: '&rsaquo;',
            onclick: function (e) { e.stopPropagation(); step(1); },
          }),
          el('div', { class: 'fs-lb-maghint' + (mag ? '' : ' hidden') }, [
            'Scroll to zoom · Shift-scroll to resize loupe',
          ]),
          el('button', {
            class: 'fs-lb-tool fs-lb-mag' + (mag ? ' is-active' : ''),
            'aria-label': 'Toggle magnifier',
            'data-tip': 'Magnifier · scroll: zoom · Shift-scroll: resize',
            html: '&#9906;',
            onclick: function (e) {
              e.stopPropagation();
              state.lbMag = !state.lbMag; // toggle in place — no re-render, no flash
              var ov = e.currentTarget.closest('.fs-lb');
              var wrap = ov.querySelector('.fs-lb-imgwrap');
              wrap.classList.toggle('mag-on', state.lbMag);
              e.currentTarget.classList.toggle('is-active', state.lbMag);
              var hint = ov.querySelector('.fs-lb-maghint');
              if (hint) hint.classList.toggle('hidden', !state.lbMag);
              if (!state.lbMag) { var l = wrap.querySelector('.fs-lb-lens'); if (l) l.style.display = 'none'; }
            },
          }),
          el('button', {
            class: 'fs-lb-tool fs-lb-full', 'aria-label': 'Toggle full screen',
            'data-tip': full ? 'Fit to window' : 'Fill screen',
            html: full ? '&#10532;' : '&#10530;',
            onclick: function (e) {
              e.stopPropagation();
              state.lbFull = !state.lbFull; // toggle in place — no re-render, no flash
              var ov = e.currentTarget.closest('.fs-lb');
              ov.querySelector('.fs-lb-fig').classList.toggle('is-full', state.lbFull);
              e.currentTarget.innerHTML = state.lbFull ? '&#10532;' : '&#10530;';
              e.currentTarget.setAttribute('data-tip', state.lbFull ? 'Fit to window' : 'Fill screen');
            },
          }),
          el('button', {
            class: 'fs-lb-tool fs-lb-close', 'aria-label': 'Close', 'data-tip': 'Close (Esc)', html: '&#10005;',
            onclick: function (e) { e.stopPropagation(); closeLb(); },
          }),
        ];
        app.appendChild(el('div', { class: 'fs-lb', onclick: closeLb }, children));
      }
    }

    var root = document.getElementById('app');
    root.innerHTML = '';
    root.appendChild(app);
  }

  // brand/logo click → back to the default codex view (first expansion/faction, Combat)
  function goHome() {
    var first = DATA.expansions[0] ? DATA.expansions[0].key : state.expansion;
    ensureFactions(first);
    var list = DATA.factions[first];
    var fac = list && list[0] ? list[0].key : null;
    setState({ view: 'codex', expansion: first, faction: fac, category: 'combat', lb: null });
  }

  function selectExpansion(key) {
    ensureFactions(key);
    var list = DATA.factions[key];
    // keep current faction if it exists in the target expansion, else first/null
    var keep = list && findKey(list, state.faction) ? state.faction : (list && list[0] ? list[0].key : null);
    setState({ expansion: key, faction: keep, lb: null });
  }

  // Re-render on resize (debounced) so the column count tracks the viewport.
  var _rt;
  window.addEventListener('resize', function () {
    clearTimeout(_rt);
    _rt = setTimeout(render, 120);
  });

  /* ---------------- boot ---------------- */

  function boot() {
    fetchJSON('factions/general.json').then(function (g) {
      DATA.general = g;
      DATA.defaults = g.filenames;
      DATA.expansions = (g.expansion.folder || []).map(function (key, i) {
        return { key: key, name: (g.expansion.name && g.expansion.name[i]) || key };
      });
      DATA.categories = (g.cardsDefault.reference || []).map(function (key, i) {
        return { key: key, name: (g.cardsDefault.name && g.cardsDefault.name[i]) || key };
      });
      state.expansion = DATA.expansions[0] ? DATA.expansions[0].key : null;
      render();
      if (state.expansion) ensureFactions(state.expansion);
    }).catch(function (e) {
      console.error(e);
      var root = document.getElementById('app');
      if (root) root.textContent = 'Failed to load card data.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
