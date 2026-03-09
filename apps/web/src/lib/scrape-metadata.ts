/** JS snippet to extract page metadata from the current tab.
 *  Returns { coverImage, title, episodes } with site-specific scrapers
 *  and a generic og:image fallback for unknown sites. */
export const SCRAPE_METADATA_SCRIPT = `
(function() {
  var result = { coverImage: null, title: null, episodes: null };
  var host = location.hostname.replace('www.', '');

  // ── Site-specific scrapers ──────────────────────────────────
  if (host === 'ogladajanime.pl') {
    var img = document.querySelector('img.img-fluid.lozad.rounded.float-right');
    if (img) result.coverImage = img.getAttribute('data-src') || img.src || null;
    var h4 = document.getElementById('anime_name_id');
    if (h4) result.title = h4.textContent.trim();
    // Fallback title from the cover alt attribute
    if (!result.title && img) result.title = img.alt ? img.alt.trim() : null;
    // Parse episode count from "Odcinki: X" text
    var allP = document.querySelectorAll('p');
    for (var i = 0; i < allP.length; i++) {
      var txt = allP[i].textContent || '';
      var m = txt.match(/Odcinki:\\s*(\\d+)/i);
      if (m) { result.episodes = parseInt(m[1], 10); break; }
    }

  } else if (host === 'anilist.co') {
    var cover = document.querySelector('.cover img, img.cover');
    if (cover) result.coverImage = cover.src || null;
    var titleEl = document.querySelector('.content h1, [data-v-5776f768] h1');
    if (titleEl) result.title = titleEl.textContent.trim();
    var epLabel = document.querySelector('[class*="data-set"] .value');
    if (epLabel) {
      var epNum = parseInt(epLabel.textContent, 10);
      if (!isNaN(epNum)) result.episodes = epNum;
    }

  } else if (host === 'myanimelist.net') {
    var malImg = document.querySelector('.leftside img[itemprop="image"], td.borderClass img');
    if (malImg) result.coverImage = malImg.getAttribute('data-src') || malImg.src || null;
    var malTitle = document.querySelector('h1.title-name strong, span[itemprop="name"]');
    if (malTitle) result.title = malTitle.textContent.trim();
    var infoSpans = document.querySelectorAll('.spaceit_pad');
    for (var j = 0; j < infoSpans.length; j++) {
      if (infoSpans[j].textContent.indexOf('Episodes') !== -1) {
        var epMatch = infoSpans[j].textContent.match(/(\\d+)/);
        if (epMatch) result.episodes = parseInt(epMatch[1], 10);
        break;
      }
    }

  } else if (host === 'shinden.pl') {
    var shinImg = document.querySelector('.info-aside-img img, .title-cover img');
    if (shinImg) result.coverImage = shinImg.src || null;
    var shinTitle = document.querySelector('h1.page-title, .title-small-h3');
    if (shinTitle) result.title = shinTitle.textContent.trim();
    var dtEls = document.querySelectorAll('dt');
    for (var k = 0; k < dtEls.length; k++) {
      if (dtEls[k].textContent.indexOf('Epizody') !== -1 || dtEls[k].textContent.indexOf('Episodes') !== -1) {
        var dd = dtEls[k].nextElementSibling;
        if (dd) {
          var ep = parseInt(dd.textContent, 10);
          if (!isNaN(ep)) result.episodes = ep;
        }
        break;
      }
    }
  }

  // ── Generic fallback: og:image / twitter:image ──────────────
  if (!result.coverImage) {
    var og = document.querySelector('meta[property="og:image"]');
    result.coverImage = og ? og.content : null;
  }
  if (!result.coverImage) {
    var tw = document.querySelector('meta[name="twitter:image"]');
    result.coverImage = tw ? tw.content : null;
  }
  if (!result.title) {
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) result.title = ogTitle.content || null;
  }

  return result;
})()
`;
