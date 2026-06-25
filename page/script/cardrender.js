/* Forbidden Stars — card text compositor.
 *
 * Some expansions (e.g. Symphony of War) ship card art as TEMPLATES with blank
 * title/text areas; the card wording lives in the faction's text.json. This
 * module draws that text onto the template via canvas — using the game's custom
 * fonts and icon glyphs — and returns a composited image as a data URL.
 *
 * The drawing routines are ported verbatim from the original site renderer so
 * the output matches the long-standing layout pixel-for-pixel.
 *
 * Public API:  window.FSCardRender.compose({ picture, kind, text }) -> Promise<string dataURL>
 *   kind: 'combat' | 'orders' | 'events'
 *   text (combat):  { title, background, foreground, icons }
 *   text (orders):  { title, general }
 *   text (events):  { title, general, type }
 */
(function () {
  'use strict';

  // Size of cards — everything else is derived from this.
  var maxWidth = 450;
  var maxHeight = 650;

  // Size of boxes for combat cards.
  var textBackgroundSize = 759;
  var textBottomBarHeight = 18;
  var textBottomBarWidth = 454;

  var titleFontSize = maxHeight * 0.05;
  var marginWidth = maxWidth * 0.0578;
  var maxTextWidth = maxWidth - 2 * marginWidth;

  // Icon positioning (combat unit icons).
  var iconSize = maxWidth * 0.097;
  var iconSpacing = maxWidth * 0.011;
  var iconX = maxWidth * 0.0632;
  var startY = maxHeight * 0.242;

  var iconMap = {
    'B': 'pictures/bolter.png',
    'S': 'pictures/shield.png',
    'M': 'pictures/moral.png',
  };

  function replaceForbiddenStarsElements(str) {
    str = str.replace(/\[B\]/g, '}');
    str = str.replace(/\[S\]/g, '{');
    str = str.replace(/\[M\]/g, '<');
    str = str.replace(/\[D\]/g, '|');
    str = str.replace(/\(B\)/g, '#');
    str = str.replace(/\(S\)/g, '@');
    return str;
  }

  function calculateTextHeight(context, text, extraHeight, marginHeight, interline, fontSize) {
    context.font = fontSize + 'px ForbiddenStars';
    var words = text.split(' ');
    var line = '';
    var lineHeight = parseInt(context.font.match(/\d+/), 10);
    var returnHeight = 0;
    for (var n = 0; n < words.length; n++) {
      if (words[n] === '*newline*') {
        returnHeight += lineHeight + interline;
        line = '';
      } else if (words[n] === '*newpara*') {
        returnHeight += 2 * lineHeight;
        line = '';
      } else {
        var testLine = line + words[n] + ' ';
        var metrics = context.measureText(testLine);
        if (metrics.width > maxTextWidth && n > 0) {
          returnHeight += lineHeight + interline;
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
    }
    returnHeight += lineHeight * 2 + extraHeight + marginHeight * 2;
    return returnHeight;
  }

  // image cache so shared chrome (background/foreground/bottom/icons) loads once
  var _imgCache = {};
  function loadImage(url) {
    if (_imgCache[url]) return _imgCache[url];
    _imgCache[url] = new Promise(function (resolve, reject) {
      var img = new Image();
      img.src = url;
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Failed to load image ' + url)); };
    });
    return _imgCache[url];
  }

  async function drawCombatCard(data, ctx) {
    var bottomImageheight = maxHeight * 0.025;
    var maxFieldsHeight = maxHeight * 0.4;
    var extraForegroundTriangle = maxHeight * 0.0455;
    var extraBackgroundborder = maxHeight * 0.0385;

    var interline = maxHeight * 0.0077;
    var marginHeight = maxWidth * 0.05;
    var fontSize = maxHeight * 0.03;

    var picture = await loadImage(data.picture);
    var background = await loadImage('pictures/background.png');
    var foreground = await loadImage('pictures/foreground.png');
    var bottomImage = await loadImage('pictures/bottom.png');

    var backgroundTextHeight = 0;
    var foregroundTextHeight = 0;

    var backgroundWithFbElements = replaceForbiddenStarsElements(data.background);
    var foregroundWithFbElements = replaceForbiddenStarsElements(data.foreground);

    var recalculateTextHeight = function () {
      if (data.background.length > 0) {
        backgroundTextHeight = calculateTextHeight(ctx, backgroundWithFbElements, extraBackgroundborder, marginHeight, interline, fontSize);
      }
      if (data.foreground.length > 0) {
        foregroundTextHeight = calculateTextHeight(ctx, foregroundWithFbElements, extraForegroundTriangle, marginHeight, interline, fontSize);
      }
    };
    recalculateTextHeight();

    var resizeCardText = function () {
      marginHeight *= 0.8;
      fontSize *= 0.99;
      interline *= 0.95;
      recalculateTextHeight();
    };

    if (data.background.length > 0 && data.foreground.length > 0) {
      while ((backgroundTextHeight + foregroundTextHeight) > maxFieldsHeight) { resizeCardText(); }
    } else {
      while (Math.max(backgroundTextHeight, foregroundTextHeight) > maxFieldsHeight) { resizeCardText(); }
    }

    var drawText = function (text, yPosition, extra) {
      ctx.font = fontSize + 'px ForbiddenStars';
      var words = text.split(' ');
      var line = '';
      var lineHeight = parseInt(ctx.font.match(/\d+/), 10);
      yPosition += marginHeight + extra + lineHeight;
      for (var n = 0; n < words.length; n++) {
        if (words[n] === '*newline*') {
          ctx.fillText(line, marginWidth, yPosition);
          yPosition += lineHeight + interline;
          line = '';
        } else if (words[n] === '*newpara*') {
          ctx.fillText(line, marginWidth, yPosition);
          yPosition += 2 * lineHeight;
          line = '';
        } else {
          var testLine = line + words[n] + ' ';
          var metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth - 2 * marginWidth && n > 0) {
            ctx.fillText(line, marginWidth, yPosition);
            yPosition += lineHeight + interline;
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
      }
      ctx.fillText(line, marginWidth, yPosition);
    };

    var drawImageCropped = function (img, height) {
      ctx.drawImage(img, 0, 0, textBackgroundSize, maxHeight - height, 0, height, maxWidth, maxHeight - height);
    };

    ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);
    ctx.font = titleFontSize + 'px Headline';
    ctx.fillText(data.title, maxWidth * 0.27, maxHeight * 0.077);

    if (data.background.length > 0) {
      var backgroundY = maxHeight - (backgroundTextHeight + foregroundTextHeight);
      drawImageCropped(background, backgroundY);
      drawText(backgroundWithFbElements, backgroundY, extraBackgroundborder);
    }
    if (data.foreground.length > 0) {
      var foregroundY = maxHeight - (foregroundTextHeight + extraForegroundTriangle * 0.35);
      drawImageCropped(foreground, foregroundY);
      drawText(foregroundWithFbElements, foregroundY, extraForegroundTriangle);
    }
    if (data.icons && data.icons.length > 0) {
      var currentY = startY;
      for (var letterPosition = 0; letterPosition < data.icons.length; letterPosition++) {
        var iconChar = data.icons[letterPosition].toUpperCase();
        if (iconMap[iconChar]) {
          var iconImg = await loadImage(iconMap[iconChar]);
          ctx.drawImage(iconImg, iconX, currentY, iconSize, iconSize);
          currentY += iconSize + iconSpacing;
        }
      }
    }
    ctx.drawImage(bottomImage, 0, 0, textBottomBarWidth, textBottomBarHeight, 0, maxHeight - bottomImageheight, maxWidth, bottomImageheight);
  }

  async function drawOrderCard(data, ctx) {
    var maxFieldsHeight = maxHeight * 0.455;
    var textPosition = maxHeight * 0.54;
    var marginOrderWidth = maxHeight * 0.1;

    var interline = maxHeight * 0.0077;
    var fontSize = maxHeight * 0.03;

    var picture = await loadImage(data.picture);

    var generalTextHeight = 0;
    var generalTextWithFbElements = replaceForbiddenStarsElements(data.general);
    var recalculateTextHeight = function () {
      generalTextHeight = calculateTextHeight(ctx, generalTextWithFbElements, 0, marginOrderWidth, interline, fontSize);
    };
    var resizeAll = function () {
      fontSize *= 0.95;
      interline *= 0.97;
      recalculateTextHeight();
    };
    recalculateTextHeight();
    while (generalTextHeight > maxFieldsHeight) { resizeAll(); }

    var drawText = function (text, yPosition) {
      ctx.font = fontSize + 'px ForbiddenStars';
      var words = text.split(' ');
      var line = '';
      var lineHeight = parseInt(ctx.font.match(/\d+/), 10);
      yPosition += lineHeight;
      for (var n = 0; n < words.length; n++) {
        if (words[n] === '*newline*') {
          ctx.fillText(line, maxWidth * 0.5, yPosition);
          yPosition += lineHeight + interline;
          line = '';
        } else if (words[n] === '*newpara*') {
          yPosition += 2 * lineHeight;
          line = '';
        } else {
          var testLine = line + words[n] + ' ';
          var metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth - 2 * marginOrderWidth && n > 0) {
            ctx.fillText(line, maxWidth * 0.5, yPosition);
            yPosition += lineHeight + interline;
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
      }
      ctx.fillText(line, maxWidth * 0.5, yPosition);
    };

    ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);
    ctx.font = titleFontSize + 'px Headline';
    ctx.textAlign = 'center';
    ctx.fillText(data.title, maxWidth * 0.5, maxHeight * 0.2325);

    drawText(generalTextWithFbElements, textPosition);
  }

  async function drawEventCard(data, ctx) {
    var maxFieldsHeight = maxHeight * 0.278;
    var textPosition = maxHeight * 0.685;

    var interline = maxHeight * 0.0077;
    var fontSize = maxHeight * 0.03;

    var picture = await loadImage(data.picture);

    var generalTextHeight = 0;
    var generalTextWithFbElements = replaceForbiddenStarsElements(data.general);
    var recalculateTextHeight = function () {
      generalTextHeight = calculateTextHeight(ctx, generalTextWithFbElements, 20, 0, interline, fontSize);
    };
    var resizeAll = function () {
      fontSize *= 0.95;
      interline *= 0.97;
      recalculateTextHeight();
    };
    recalculateTextHeight();
    while (generalTextHeight > maxFieldsHeight) { resizeAll(); }

    var drawText = function (ctx_, text, yPosition) {
      ctx_.font = fontSize + 'px ForbiddenStars';
      var words = text.split(' ');
      var line = '';
      var lineHeight = parseInt(ctx_.font.match(/\d+/), 10);
      yPosition += lineHeight;
      for (var n = 0; n < words.length; n++) {
        if (words[n] === '*newline*') {
          ctx_.fillText(line, marginWidth, yPosition);
          yPosition += lineHeight + interline;
          line = '';
        } else if (words[n] === '*newpara*') {
          ctx_.fillText(line, marginWidth, yPosition);
          yPosition += 2 * lineHeight;
          line = '';
        } else {
          var testLine = line + words[n] + ' ';
          var metrics = ctx_.measureText(testLine);
          if (metrics.width > maxWidth - 2 * marginWidth && n > 0) {
            ctx_.fillText(line, marginWidth, yPosition);
            yPosition += lineHeight + interline;
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
      }
      ctx_.fillText(line, marginWidth, yPosition);
    };

    ctx.drawImage(picture, 0, 0, maxWidth, maxHeight);
    ctx.font = (titleFontSize * 0.8) + 'px EventFont';
    ctx.textAlign = 'center';
    ctx.fillText(data.type, maxWidth * 0.5, maxHeight * 0.573);
    ctx.font = titleFontSize + 'px Headline';
    ctx.textAlign = 'left';
    ctx.fillText(data.title, maxWidth * 0.05, maxHeight * 0.0735);
    drawText(ctx, generalTextWithFbElements, textPosition);
  }

  var DRAW = { combat: drawCombatCard, orders: drawOrderCard, events: drawEventCard };

  // Ensure the custom fonts are loaded before we measure/draw text.
  var _fontsReady;
  function fontsReady() {
    if (_fontsReady) return _fontsReady;
    if (!document.fonts) { _fontsReady = Promise.resolve(); return _fontsReady; }
    _fontsReady = Promise.all([
      document.fonts.load('1em ForbiddenStars'),
      document.fonts.load('1em Headline'),
      document.fonts.load('1em EventFont'),
    ]).catch(function () {});
    return _fontsReady;
  }

  var _composed = {}; // src -> Promise<dataURL>

  function compose(card) {
    if (_composed[card.src]) return _composed[card.src];
    var fn = DRAW[card.kind];
    if (!fn || !card.text) { _composed[card.src] = Promise.resolve(card.src); return _composed[card.src]; }

    _composed[card.src] = fontsReady().then(function () {
      var canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      var ctx = canvas.getContext('2d');
      var data = {
        picture: card.src, hasText: true,
        title: card.text.title || '',
        general: card.text.general || '',
        background: card.text.background || '',
        foreground: card.text.foreground || '',
        icons: card.text.icons || '',
        type: card.text.type || '',
      };
      return fn(data, ctx).then(function () { return canvas.toDataURL('image/jpeg', 0.92); });
    }).catch(function (e) {
      console.error('compose failed for ' + card.src, e);
      return card.src; // fall back to the bare template
    });
    return _composed[card.src];
  }

  window.FSCardRender = { compose: compose, fontsReady: fontsReady };
})();
