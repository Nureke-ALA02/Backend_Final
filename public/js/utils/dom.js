(function () {
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v !== false && v != null) {
        el.setAttribute(k, v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  function confettiBurst(count = 80) {
    const layer = document.getElementById('celebrate-layer');
    if (!layer) return;
    const colors = ['#ff5a5f', '#2d9cdb', '#ffcc29', '#58c468', '#a06cd5'];
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      layer.appendChild(c);
      setTimeout(() => c.remove(), 3500);
    }
  }

  window.UI = { h, confettiBurst };
  window.Views = window.Views || {};
})();
