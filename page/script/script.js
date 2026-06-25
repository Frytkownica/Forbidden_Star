/* Forbidden Stars — Card Codex
 * Vanilla port of the "Forbidden Stars Codex" Claude Design component.
 * No framework / no build step. Renders into #app and drives a tiny state store.
 *
 * Image assets live at:  factions/<expansion>/<faction>/<folder>/<file>
 * Only the `base` expansion ships artwork; other expansions render an empty state.
 */
(function () {
  'use strict';

  /* ---------------- data ---------------- */

  var ACCENT = 'amber'; // amber | steel | crimson  (drives --fs-accent CSS vars)
  var DENSITY = 4;      // grid columns for standard card categories (desktop)

  // Standard-card grid columns adapt to viewport width so cards stay legible on
  // phones/tablets. Map (2) and Faction Card (1) layouts are unaffected.
  function density() {
    var w = window.innerWidth || 1200;
    if (w <= 480) return 2;
    if (w <= 720) return 3;
    if (w <= 1024) return DENSITY - 1;
    return DENSITY;
  }

  var EXPANSIONS = [
    { key: 'base',    name: 'Base Game',          available: true },
    { key: 'gif',     name: 'Galaxy in Flames',   available: false },
    { key: 'sow',     name: 'Symphony of War',    available: false },
    { key: 'emperor', name: 'The Dying Light',    available: false },
    { key: 'dd',      name: 'Darkest Dawn',       available: false },
  ];

  var FACTIONS = [
    { key: 'spacemarines', name: 'Space Marines', dot: 'oklch(0.64 0.12 245)' },
    { key: 'chaos',        name: 'Chaos',         dot: 'oklch(0.57 0.19 25)'  },
    { key: 'ork',          name: 'Ork',           dot: 'oklch(0.66 0.15 142)' },
    { key: 'eldar',        name: 'Eldar',         dot: 'oklch(0.80 0.13 90)'  },
  ];

  var CATEGORIES = [
    { key: 'combat',       name: 'Combat'       },
    { key: 'orders',       name: 'Orders'       },
    { key: 'events',       name: 'Events'       },
    { key: 'backs',        name: 'Card Backs'   },
    { key: 'faction_card', name: 'Faction Card' },
    { key: 'map',          name: 'Maps'         },
  ];

  var FOLDER = {
    combat: 'combat', orders: 'orders', events: 'events',
    backs: 'backs', faction_card: 'faction_card', map: 'maps',
  };

  var COMBAT = [
    { label: 'Standard', files: ['s1.jpg', 's2.jpg', 's3.jpg', 's4.jpg', 's5.jpg'] },
    { label: 'Tier I',   files: ['t0_1.jpg', 't0_2.jpg', 't0_3.jpg', 't0_4.jpg'] },
    { label: 'Tier II',  files: ['t2_1.jpg', 't2_2.jpg', 't2_3.jpg'] },
    { label: 'Tier III', files: ['t3_1.jpg', 't3_2.jpg'] },
  ];

  var SIMPLE = {
    orders:       ['o_1.jpg', 'o_2.jpg', 'o_3.jpg', 'o_4.jpg', 'o_5.jpg'],
    events:       ['e_1.jpg', 'e_2.jpg', 'e_3.jpg', 'e_4.jpg', 'e_5.jpg', 'e_6.jpg', 'e_7.jpg', 'e_8.jpg'],
    backs:        ['combat.jpg', 'order.jpg', 'event.jpg'],
    faction_card: ['card.jpg'],
    map:          ['map_A.jpg', 'map_B.jpg'],
  };

  var ACC = {
    amber:   { a: 'oklch(0.80 0.12 80)',  fg: '#1c1810' },
    steel:   { a: 'oklch(0.72 0.10 232)', fg: '#0b1019' },
    crimson: { a: 'oklch(0.62 0.185 25)', fg: '#1c0d0c' },
  };

  /* ---------------- state ---------------- */

  var state = { expansion: 'base', faction: 'spacemarines', category: 'combat', lb: null };
  var flat = []; // flat list of currently-visible cards, for the lightbox

  function setState(patch) {
    for (var k in patch) { if (patch.hasOwnProperty(k)) state[k] = patch[k]; }
    render();
  }

  /* ---------------- helpers ---------------- */

  function facName(k) { var f = find(FACTIONS, k); return f ? f.name : ''; }
  function catName(k) { var c = find(CATEGORIES, k); return c ? c.name : ''; }
  function find(list, key) {
    for (var i = 0; i < list.length; i++) { if (list[i].key === key) return list[i]; }
    return null;
  }

  // tiny element builder: el('div', {class:'x', onclick:fn, html:'...'}, [children])
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

  /* ---------------- card model ---------------- */

  function build() {
    var fac = state.faction, cat = state.category;
    var base = 'factions/' + state.expansion + '/' + fac + '/' + FOLDER[cat] + '/';
    var groups = [];
    flat = [];

    function push(file, label) {
      var idx = flat.length;
      var c = { src: base + file, label: label, index: idx };
      flat.push(c);
      return c;
    }

    if (cat === 'combat') {
      COMBAT.forEach(function (sec) {
        var cards = sec.files.map(function (f, i) {
          return push(f, facName(fac) + ' · ' + sec.label + ' ' + (i + 1));
        });
        groups.push({ label: sec.label, sub: cards.length + ' cards', cards: cards });
      });
    } else {
      var labels;
      if (cat === 'backs') labels = ['Combat Deck Back', 'Order Deck Back', 'Event Deck Back'];
      else if (cat === 'faction_card') labels = [facName(fac) + ' Reference'];
      else if (cat === 'map') labels = ['Map A', 'Map B'];
      else {
        var pre = cat === 'orders' ? 'Order Upgrade' : 'Event';
        labels = SIMPLE[cat].map(function (_, i) { return pre + ' ' + (i + 1); });
      }
      var cards = SIMPLE[cat].map(function (f, i) { return push(f, labels[i]); });
      groups.push({ label: null, sub: '', cards: cards });
    }
    return groups;
  }

  /* ---------------- lightbox ---------------- */

  function openLb(idx) { setState({ lb: idx }); }
  function closeLb() { setState({ lb: null }); }
  function step(d) {
    if (!flat.length || state.lb === null) return;
    setState({ lb: (state.lb + d + flat.length) % flat.length });
  }

  document.addEventListener('keydown', function (e) {
    if (state.lb === null) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  /* ---------------- render ---------------- */

  function render() {
    var acc = ACC[ACCENT] || ACC.amber;
    var cols = Math.max(2, Math.min(6, density()));
    var cat = state.category;

    var expObj = find(EXPANSIONS, state.expansion) || {};
    var available = !!expObj.available;

    var groups = build();

    // grid geometry per category
    var gridCols, gridJustify, cardAspect;
    if (cat === 'faction_card') {
      gridCols = 'repeat(1, minmax(0, 540px))'; gridJustify = 'center'; cardAspect = '1688 / 2000';
    } else if (cat === 'map') {
      gridCols = 'repeat(2, minmax(0, 1fr))'; gridJustify = 'start'; cardAspect = '1 / 1';
    } else {
      gridCols = 'repeat(' + cols + ', minmax(0, 1fr))'; gridJustify = 'start'; cardAspect = '434 / 615';
    }

    var app = el('div', { class: 'fs-app', 'data-accent': ACCENT });

    /* ---- header ---- */
    var exptabs = el('div', { class: 'fs-exptabs fs-scroll' },
      EXPANSIONS.map(function (e) {
        return el('button', {
          class: 'fs-tab' + (state.expansion === e.key ? ' is-active' : ''),
          onclick: function () { setState({ expansion: e.key, lb: null }); },
        }, [
          el('span', { text: e.name }),
          !e.available ? el('span', { class: 'fs-tab-soon', text: 'SOON' }) : null,
        ]);
      })
    );
    var header = el('header', { class: 'fs-header' }, [
      el('div', { class: 'fs-brand' }, [
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
      FACTIONS.map(function (f) {
        return el('button', {
          class: 'fs-fac' + (state.faction === f.key ? ' is-active' : ''),
          onclick: function () { setState({ faction: f.key, lb: null }); },
        }, [
          el('span', { class: 'fs-fac-dot', style: 'background:' + f.dot + ';' }),
          el('span', { class: 'fs-fac-name', text: f.name }),
          el('span', { class: 'fs-fac-count', text: '33' }),
        ]);
      })
    );
    var sidebar = el('aside', { class: 'fs-sidebar' }, [
      el('div', { class: 'fs-sidebar-label', text: 'Factions' }),
      nav,
      el('div', { class: 'fs-sidebar-foot' }, [
        el('a', { class: 'fs-faq-link', href: 'faq_manuscript_page.html', text: 'FAQ & Rules' }),
        el('p', {
          html: 'FAN PROJECT &middot; NON&#8209;COMMERCIAL<br>Artwork &copy; Games Workshop',
        }),
      ]),
    ]);

    /* ---- main ---- */
    var main = el('main', { class: 'fs-main' });

    if (available) {
      var cattabs = el('div', { class: 'fs-cattabs fs-scroll' },
        CATEGORIES.map(function (c) {
          return el('button', {
            class: 'fs-cat' + (cat === c.key ? ' is-active' : ''),
            onclick: function () { setState({ category: c.key, lb: null }); },
            text: c.name,
          });
        })
      );
      main.appendChild(el('div', { class: 'fs-cattabs-wrap' }, [cattabs]));

      main.appendChild(el('div', { class: 'fs-breadcrumb' }, [
        el('div', { class: 'fs-bc-left' }, [
          el('span', { class: 'fs-bc-exp', text: expObj.name || '' }),
          el('span', { class: 'fs-bc-sep', text: '/' }),
          el('h1', { class: 'fs-bc-title', text: facName(state.faction) + ' — ' + catName(cat) }),
        ]),
        el('span', {
          class: 'fs-bc-total',
          text: flat.length + ' ' + (flat.length === 1 ? 'card' : 'cards'),
        }),
      ]));

      var scrollarea = el('div', { class: 'fs-scrollarea fs-scroll' });
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
          return el('button', {
            class: 'fs-card',
            title: card.label,
            style: 'aspect-ratio:' + cardAspect + ';',
            onclick: (function (idx) { return function () { openLb(idx); }; })(card.index),
          }, [
            el('img', { src: card.src, alt: card.label, loading: 'lazy' }),
          ]);
        }));
        scrollarea.appendChild(grid);
      });
      main.appendChild(scrollarea);
    } else {
      main.appendChild(el('div', { class: 'fs-empty' }, [
        el('div', { class: 'fs-empty-glyph' }, [
          el('div', { class: 'ring' }),
          el('div', { class: 'core' }),
        ]),
        el('div', { class: 'fs-empty-stack' }, [
          el('h2', { text: expObj.name || '' }),
          el('p', {
            html: 'Artwork for this expansion isn&rsquo;t bundled in this build. ' +
              'The full Base Game codex &mdash; four factions, every card &mdash; is ready to browse.',
          }),
        ]),
        el('button', {
          class: 'fs-empty-btn',
          text: 'View Base Game',
          onclick: function () { setState({ expansion: 'base' }); },
        }),
      ]));
    }

    app.appendChild(header);
    app.appendChild(el('div', { class: 'fs-body' }, [sidebar, main]));

    /* ---- lightbox ---- */
    var lbOpen = state.lb !== null && available;
    if (lbOpen) {
      var c = flat[state.lb];
      if (c) {
        var overlay = el('div', { class: 'fs-lb', onclick: closeLb }, [
          el('button', {
            class: 'fs-lb-nav', 'aria-label': 'Previous card', html: '&lsaquo;',
            onclick: function (e) { e.stopPropagation(); step(-1); },
          }),
          el('figure', { class: 'fs-lb-fig', onclick: function (e) { e.stopPropagation(); } }, [
            el('img', { src: c.src, alt: c.label }),
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
          el('button', {
            class: 'fs-lb-close', 'aria-label': 'Close', html: '&#10005;',
            onclick: function (e) { e.stopPropagation(); closeLb(); },
          }),
        ]);
        app.appendChild(overlay);
      }
    }

    var root = document.getElementById('app');
    root.innerHTML = '';
    root.appendChild(app);
  }

  // Re-render on resize (debounced) so the column count tracks the viewport.
  var _rt;
  window.addEventListener('resize', function () {
    clearTimeout(_rt);
    _rt = setTimeout(render, 120);
  });

  /* ---------------- boot ---------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
