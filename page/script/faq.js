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

    // raw FAQ.json -> hierarchical model:
    //   navTopics: [{key,name,kind:'all'|'cat'|'sub',parent?,dot?}]   (sidebar)
    //   cats:      [{key,name,dot, subs:[{key,name, factions:[{faction,picture,items:[{id,q,a}]}]}]}]
    //   count:     { <topicKey>: n, all: n }
    flatten: function (raw) {
      var navTopics = [{ key: 'all', name: 'All Questions', kind: 'all', dot: DOTS[0] }];
      var cats = [];
      var count = { all: 0 };
      var uid = 0;
      (raw || []).forEach(function (cat, ci) {
        var ckey = 'c' + ci;
        var catObj = { key: ckey, name: cat.Category || ('Section ' + (ci + 1)), dot: DOTS[(ci + 1) % DOTS.length], subs: [] };
        navTopics.push({ key: ckey, name: catObj.name, kind: 'cat', dot: catObj.dot });
        count[ckey] = 0;
        (cat.items || []).forEach(function (sub, si) {
          var skey = ckey + '_s' + si;
          var subObj = { key: skey, name: sub.SubCategory || ('Group ' + (si + 1)), factions: [] };
          var subCount = 0;
          (sub.items || []).forEach(function (fac) {
            var facObj = { faction: fac.Faction || '', picture: fac.picture || '', items: [] };
            (fac.items || []).forEach(function (it) {
              if (!it || !it.Phrase) return;
              facObj.items.push({ id: uid++, q: it.Phrase, a: it.Main || '' });
              subCount++; count[ckey]++; count.all++;
            });
            if (facObj.items.length) subObj.factions.push(facObj);
          });
          if (subObj.factions.length) {
            count[skey] = subCount;
            navTopics.push({ key: skey, name: subObj.name, kind: 'sub', parent: ckey });
            catObj.subs.push(subObj);
          }
        });
        cats.push(catObj);
      });
      return { navTopics: navTopics, cats: cats, count: count };
    },
  };
})();
