// Kleoma site: tabs, speed slider, menu. No dependencies; the page works without it (tabs show the first panel).
(() => {
  'use strict';

  // ---- Tabs (WAI-ARIA tabs pattern: arrows, Home, End; Enter/Space activate through the button)
  document.querySelectorAll('[data-tabs]').forEach((root) => {
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

    const select = (index, focus) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (panels[i]) panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i, false));
      tab.addEventListener('keydown', (e) => {
        const last = tabs.length - 1;
        const next = { ArrowDown: i === last ? 0 : i + 1, ArrowRight: i === last ? 0 : i + 1,
                       ArrowUp: i === 0 ? last : i - 1, ArrowLeft: i === 0 ? last : i - 1,
                       Home: 0, End: last }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        select(next, true);
      });
    });
    select(0, false);
  });

  // ---- Speed slider: the number and the waveform follow it
  const slider = document.getElementById('cadence');
  const display = document.getElementById('speed-display');
  const wave = document.getElementById('wave');
  if (slider && display) {
    const update = () => {
      const speed = Number(slider.value) / 100;
      display.textContent = `${speed.toFixed(2)}×`;
      // faster speech = faster breathing bars (bounded so it never flickers)
      if (wave) wave.style.setProperty('--wave-dur', `${Math.min(2.6, Math.max(0.35, 1.2 / speed)).toFixed(2)}s`);
    };
    slider.addEventListener('input', update);
    update();
  }

  // ---- Mobile menu: close on a link tap, on Escape, and on an outside tap
  const menu = document.querySelector('details.menu');
  if (menu) {
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.open = false; });
    document.addEventListener('pointerdown', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  }
})();
