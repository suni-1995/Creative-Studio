/* Optional video library menu bridge. Remove this file and its loader to detach. */
(function () {
  'use strict';
  if (window.__creativeVideoMenuInstalled) return;
  window.__creativeVideoMenuInstalled = true;

  function textOnly(el) {
    return Array.from(el.childNodes).filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join(' ').trim();
  }
  function visible(el) {
    return !!(el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  }
  function install() {
    if (!window.Android || typeof window.Android.openVideoLibrary !== 'function') return;
    if (document.getElementById('creative-video-library-entry')) return;
    const elements = document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,p,strong,b');
    let heading = null;
    for (const el of elements) {
      if (textOnly(el) === '부가기능' && visible(el)) { heading = el; break; }
    }
    if (!heading) return;
    const row = document.createElement('button');
    row.id = 'creative-video-library-entry';
    row.type = 'button';
    row.textContent = '▶ 동영상 플레이어';
    row.setAttribute('aria-label', '동영상 플레이어 열기');
    row.style.cssText = 'display:block;box-sizing:border-box;width:100%;padding:14px 16px;margin:8px 0;border:1px solid rgba(120,120,120,.24);border-radius:12px;background:var(--card-bg,var(--surface,#fff));color:inherit;text-align:left;font:inherit;cursor:pointer;';
    row.addEventListener('click', function () { window.Android.openVideoLibrary(); });
    // Keep the entry in the same section as the supplementary-feature heading.
    heading.insertAdjacentElement('afterend', row);
  }
  let queued = false;
  const observer = new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; install(); });
  });
  function start() {
    install();
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
