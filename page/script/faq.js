/* Forbidden Stars — Field Manual / FAQ.
 * Look ported from the "Forbidden Stars FAQ" Claude Design; CONTENT comes from
 * the real data/FAQ.json (same source as the legacy faq_manuscript_page).
 *
 * FAQ.json shape:  [ {Category, items:[ {SubCategory, items:[ {Faction, picture,
 *   items:[ {Phrase, Main} ] } ] } ] } ]
 * We surface each Category as a sidebar topic and flatten the {Phrase, Main}
 * pairs into accordion questions (SubCategory used as the tag). */
(function () {
  'use strict';

  var DOTS = [
    'oklch(0.80 0.12 80)', 'oklch(0.64 0.12 245)', 'oklch(0.66 0.15 142)',
    'oklch(0.57 0.19 25)', 'oklch(0.80 0.13 90)', 'oklch(0.70 0.04 60)',
  ];

  window.FS_FAQ = {
    src: 'data/FAQ.json',
    hero: {
      kicker: 'Rules Reference & Clarifications',
      title: 'Frequently Asked Questions',
      blurb: 'Official rules clarifications and answers to the questions that come up most at the table, across the base game and its expansions. Filter by section on the left or search above.',
    },
    dots: DOTS,

    // raw FAQ.json -> { topics:[{key,name,dot}], qa:[{t,q,a,tag}] }
    flatten: function (raw) {
      var topics = [{ key: 'all', name: 'All Questions', dot: DOTS[0] }];
      var qa = [];
      (raw || []).forEach(function (cat, ci) {
        var key = 'c' + ci;
        topics.push({ key: key, name: cat.Category || ('Section ' + (ci + 1)), dot: DOTS[(ci + 1) % DOTS.length] });
        (cat.items || []).forEach(function (sub) {
          (sub.items || []).forEach(function (fac) {
            (fac.items || []).forEach(function (it) {
              if (!it || !it.Phrase) return;
              qa.push({
                t: key,
                q: it.Phrase,
                a: it.Main || '',
                tag: sub.SubCategory || fac.Faction || null,
              });
            });
          });
        });
      });
      return { topics: topics, qa: qa };
    },
  };
})();
