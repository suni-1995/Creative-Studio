/* Removable video-library menu adapter for Creative Studio's renderMore(). */
(function () {
  'use strict';
  if (window.__creativeVideoMenuInstalled) return;
  window.__creativeVideoMenuInstalled = true;
  function install() {
    if (!window.Android || typeof window.Android.openVideoLibrary !== 'function') return;
    const more = document.getElementById('more') || document.querySelector('[data-page="more"]');
    if (!more || more.classList.contains('hidden') || more.querySelector('#creative-video-library-entry')) return;
    const groups = Array.from(more.querySelectorAll('.studioMoreGroup'));
    const existing = groups.find(group => { const h = group.querySelector('h3'); return h && h.textContent.replace(/\\s/g, '').includes('부가기능'); });
    const info = groups.find(group => {
      const h = group.querySelector('h3');
      return h && h.textContent.trim() === '안내';
    });
    if (!info && !existing) return;
    const group = existing || document.createElement('div');
    group.className = 'studioMoreGroup';
    group.setAttribute('data-video-library-group', 'true');
    const heading = document.createElement('h3');
    heading.textContent = '부가기능';
    const button = document.createElement('button');
    button.id = 'creative-video-library-entry';
    button.type = 'button';
    button.textContent = '▶　동영상 플레이어　›';
    button.addEventListener('click', () => window.Android.openVideoLibrary());
    if (!existing) group.appendChild(heading);
    group.appendChild(button);
    if (!existing) info.parentNode.insertBefore(group, info);
  }
  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; install(); });
  });
  function start() {
    install();
    observer.observe(document.body, {childList:true,subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
