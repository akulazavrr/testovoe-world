// Раздел «Качок Кабачок» (домик). Задание: docs/02-house.md
//
// Клик по домику на карте → дверь открывается → экран заполняет интерьер дома →
// поверх появляется поп-ап из двух страниц. Крестик закрывает поп-ап и оставляет
// интерьер (решение автора); на карту ведёт общая кнопка «На карту», дверь закрывается.

import { el, prefersReducedMotion, sectionTitleId } from './utils.js';

const NAME = 'house';
const DOOR_MS = 500;  // должно совпадать с transition двери в css/map.css
const FADE_MS = 300;  // должно совпадать с --popup-fade в css/house.css
const SWIPE_PX = 50;  // минимальная длина свайпа
// Сколько показывать чёткую комнату с Кабачком до появления поп-апа
// (из них ~0,7 с — анимация входа в дом)
const POPUP_DELAY_MS = 3000;

let root = null;
let wrapper = null;
let popup = null;
let reopenButton = null;
let pages = [];
let nextButtons = [];  // «Далее» и стрелка вправо
let prevButtons = [];  // «Назад» и стрелка влево
let indicator = null;
let ui = null;
let current = 0;
let popupOpen = false;
let active = false;    // раздел сейчас открыт
let hideTimer = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapHouse() {
  return document.querySelector('.map-object--house');
}

// ---------- Тексты страниц ----------

// «Начало пункта до первой точки выделить жирным» (ТЗ). Если первая точка — конец пункта,
// выделять весь пункт было бы странно, поэтому тогда выделяется начало до двоеточия,
// а если двоеточия нет — ничего.
function splitLead(text) {
  const byDot = text.match(/^(.+?\.)(\s+\S[\s\S]*)$/);
  if (byDot) return [byDot[1], byDot[2]];
  const colon = text.indexOf(':');
  if (colon > 0 && colon < text.length - 1) return [text.slice(0, colon + 1), text.slice(colon + 1)];
  return [null, text];
}

function listItem(text, boldLead) {
  if (!boldLead) return el('li', { text });
  const [lead, rest] = splitLead(text);
  return el('li', {}, lead ? [el('strong', { text: lead }), rest] : [rest]);
}

function renderContent(items, boldLead) {
  return items.map((item) => {
    if (item.p) return el('p', { className: 'house__p', text: item.p });
    if (item.h) return el('h4', { className: 'house__h4', text: item.h });
    if (item.ul) return el('ul', { className: 'house__list' }, item.ul.map((t) => listItem(t, boldLead)));
    if (item.ol) return el('ol', { className: 'house__list house__list--ordered' }, item.ol.map((t) => listItem(t, boldLead)));
    return '';
  });
}

function renderBlocks(blocks, boldLead) {
  return blocks.map((block) =>
    el('section', { className: 'house__block' }, [
      el('h3', { className: 'house__h3', text: block.title }),
      ...renderContent(block.content, boldLead),
    ]),
  );
}

// ---------- Страницы ----------

function updateNav() {
  const last = pages.length - 1;
  for (const b of nextButtons) b.hidden = current >= last;
  for (const b of prevButtons) b.hidden = current <= 0;
  indicator.textContent = `${current + 1} / ${pages.length}`;
  indicator.setAttribute('aria-label', `${ui.page} ${current + 1} ${ui.pageOf} ${pages.length}`);
}

function showPage(index, { focus = false } = {}) {
  if (index < 0 || index >= pages.length || index === current) return;
  const direction = index > current ? 'next' : 'prev';
  pages[current].hidden = true;
  current = index;
  const page = pages[current];
  page.hidden = false;
  page.scrollTop = 0;
  page.classList.remove('is-entering-next', 'is-entering-prev');
  if (!prefersReducedMotion()) {
    void page.offsetWidth;
    page.classList.add(`is-entering-${direction}`);
  }
  updateNav();
  if (focus) page.focus({ preventScroll: true });
}

// ---------- Поп-ап ----------

// delay — пауза перед появлением (при входе в раздел поп-ап ждёт, пока «войдём» в дом)
function openPopup({ delay = 0 } = {}) {
  clearTimeout(hideTimer);
  popupOpen = true;
  popup.hidden = false;
  reopenButton.hidden = true;
  popup.classList.remove('is-visible');
  // Размытие комнаты и поп-ап появляются одновременно. Пауза перед ними — не движение,
  // поэтому сохраняется и при «уменьшить движение» (там просто нет плавных переходов)
  const show = () => {
    wrapper.classList.add('is-popup-open');
    popup.classList.add('is-visible');
  };
  void popup.offsetWidth;
  if (delay > 0) hideTimer = setTimeout(show, delay);
  else requestAnimationFrame(show);
}

function closePopup() {
  popupOpen = false;
  wrapper.classList.remove('is-popup-open');
  popup.classList.remove('is-visible');
  const finish = () => {
    popup.hidden = true;
    reopenButton.hidden = false;
    reopenButton.focus({ preventScroll: true });
  };
  if (prefersReducedMotion()) finish();
  else hideTimer = setTimeout(finish, FADE_MS);
}

// Фокус не выходит за пределы поп-апа
function trapFocus(event) {
  if (event.key !== 'Tab' || !popupOpen) return;
  const focusables = [...popup.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
    .filter((node) => !node.hidden && node.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && (document.activeElement === first || !popup.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function onKeydown(event) {
  if (!active || !popupOpen) return;
  if (event.key === 'ArrowRight') showPage(current + 1, { focus: true });
  else if (event.key === 'ArrowLeft') showPage(current - 1, { focus: true });
  else trapFocus(event);
}

// Свайп влево — следующая страница, вправо — предыдущая
function bindSwipe(area) {
  let startX = 0;
  let startY = 0;
  area.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  area.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    showPage(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

// ---------- Раздел ----------

export function init(sectionRoot, content) {
  root = sectionRoot;
  const data = content.sections[NAME];
  ui = data.ui;

  const page1 = el('div', { className: 'house__page house__page--1', tabIndex: -1 }, [
    el('div', { className: 'house__column' }, [
      el('h2', { className: 'house__name', id: sectionTitleId(NAME), tabIndex: -1, text: data.page1.name }),
      ...renderBlocks(data.page1.blocks, false),
    ]),
  ]);

  const page2 = el('div', {
    className: 'house__page house__page--2',
    tabIndex: -1,
    hidden: true,
    attrs: { 'aria-label': data.page2.title },
  }, [
    el('div', { className: 'house__grid' }, renderBlocks(data.page2.blocks, data.page2.boldLead)),
  ]);

  pages = [page1, page2];

  const next = el('button', { className: 'house__btn house__btn--next', type: 'button', text: `${ui.next} →` });
  const prev = el('button', { className: 'house__btn house__btn--prev', type: 'button', text: `← ${ui.prev}` });
  const arrowNext = el('button', {
    className: 'house__arrow house__arrow--next', type: 'button', text: '→', attrs: { 'aria-label': ui.nextAria },
  });
  const arrowPrev = el('button', {
    className: 'house__arrow house__arrow--prev', type: 'button', text: '←', attrs: { 'aria-label': ui.prevAria },
  });
  nextButtons = [next, arrowNext];
  prevButtons = [prev, arrowPrev];
  for (const b of nextButtons) b.addEventListener('click', () => showPage(current + 1, { focus: true }));
  for (const b of prevButtons) b.addEventListener('click', () => showPage(current - 1, { focus: true }));

  indicator = el('span', { className: 'house__indicator' });

  const closeButton = el('button', {
    className: 'house__close', type: 'button', text: '×', attrs: { 'aria-label': ui.close },
  });
  closeButton.addEventListener('click', closePopup);

  const pagesArea = el('div', { className: 'house__pages' }, pages);
  bindSwipe(pagesArea);

  popup = el('div', {
    className: 'house__popup',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': sectionTitleId(NAME) },
  }, [
    closeButton,
    arrowPrev,
    pagesArea,
    arrowNext,
    el('div', { className: 'house__nav' }, [
      el('div', { className: 'house__nav-side' }, [prev]),
      indicator,
      el('div', { className: 'house__nav-side house__nav-side--end' }, [next]),
    ]),
  ]);

  reopenButton = el('button', { className: 'house__reopen', type: 'button', text: ui.reopen, hidden: true });
  reopenButton.addEventListener('click', () => {
    openPopup();
    pages[current].focus({ preventScroll: true });
  });

  // Комната: интерьер и персонаж в одной системе координат, чтобы Кабачок
  // всегда стоял на ковре, как бы ни обрезался фон на разных экранах
  const room = el('div', { className: 'house__room', attrs: { 'aria-hidden': 'true' } }, [
    el('img', { className: 'house__interior', src: 'assets/house/interior.svg', alt: '', loading: 'lazy' }),
    el('img', { className: 'house__hero', src: 'assets/house/kabachok.png', alt: '', loading: 'lazy' }),
  ]);

  wrapper = el('div', { className: 'house' }, [
    room,
    el('div', { className: 'house__dim', attrs: { 'aria-hidden': 'true' } }),
    reopenButton,
    popup,
  ]);

  root.replaceChildren(wrapper);
  updateNav();
  document.addEventListener('keydown', onKeydown);
}

// Клик по домику на карте: сначала открывается дверь
export async function beforeOpen(button) {
  button.classList.add('is-door-open');
  if (!prefersReducedMotion()) await wait(DOOR_MS);
}

export function onOpen() {
  active = true;
  mapHouse()?.classList.add('is-door-open'); // при входе по прямой ссылке дверь тоже «открыта»

  // Каждый вход — с первой страницы и открытым поп-апом
  pages[current].hidden = true;
  current = 0;
  pages[0].hidden = false;
  pages[0].classList.remove('is-entering-next', 'is-entering-prev');
  updateNav();
  // Сначала видна комната с Кабачком, поп-ап появляется после паузы
  openPopup({ delay: POPUP_DELAY_MS });

  wrapper.classList.remove('is-entering');
  void wrapper.offsetWidth;
  wrapper.classList.add('is-entering');
}

export function onClose() {
  active = false;
  // Дверь закрывается, когда раздел уже исчез и карта снова видна
  const door = mapHouse();
  if (prefersReducedMotion()) door?.classList.remove('is-door-open');
  else setTimeout(() => door?.classList.remove('is-door-open'), 260);
}

// Первый Esc закрывает поп-ап (остаётся интерьер), второй — возвращает на карту
export function onEscape() {
  if (popupOpen) {
    closePopup();
    return true;
  }
  return false;
}
