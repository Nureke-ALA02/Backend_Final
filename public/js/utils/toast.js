(function () {
  function container() {
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message, type = 'info', duration = 3500) {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message"></span>
      <button class="toast-close" aria-label="Close">×</button>
    `;
    toast.querySelector('.toast-message').textContent = message;
    toast.querySelector('.toast-close').addEventListener('click', () => remove(toast));

    container().appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    if (duration > 0) {
      setTimeout(() => remove(toast), duration);
    }
    return toast;
  }

  function remove(toast) {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }
  window.Toast = {
    success: (msg, duration) => show(msg, 'success', duration),
    error:   (msg, duration) => show(msg, 'error', duration),
    warning: (msg, duration) => show(msg, 'warning', duration),
    info:    (msg, duration) => show(msg, 'info', duration),
  };
})();