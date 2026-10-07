// Главная карта: подстановка текстов, открытие и закрытие разделов.
//
// Каждый раздел живёт по своему адресу-якорю (#memes, #house, #iceberg, #kilka).
// Поэтому работает кнопка «Назад» в браузере и прямые ссылки на раздел.

import { content } from './content.js';
import { prefersReducedMotion, sectionTitleId, setText } from './utils.js';
import * as memes from './memes.js';
import * as house from './house.js';
import * as iceberg from './iceberg.js';
import * as kilka from './kilka.js';

const modules = { memes, house, iceberg, kilka };

// Должно совпадать с --overlay-duration в css/base.css
const OVERLAY_DURATION_MS = 250;

const map = document.getElementById('map');
const overlay = document.getElementById('overlay');
const backButton = document.getElementById('back-button');

let current = null; // имя открытого раздела или null
let hideTimer = null;

// ---------- Тексты ----------

function getText(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], content) ?? '';
}

function fillTexts() {
  for (const node of document.querySelectorAll('[data-text]')) {
    setText(node, getText(node.dataset.text));
  }

  backButton.setAttribute('aria-label', content.ui.backToMapAria);

  // Название кнопки для скринридера: видимая подпись + название раздела
  for (const button of document.querySelectorAll('.map-object')) {
    const section = content.sections[button.dataset.section];
    const label = section.mapLabel === section.title
      ? section.mapLabel
      : `${section.mapLabel}. ${content.ui.sectionPrefix}: ${section.title}`;
    button.setAttribute('aria-label', label);
  }
}

// ---------- Разделы ----------

function sectionRoot(name) {
  return overlay.querySelector(`[data-section-root="${name}"]`);
}

function mapButton(name) {
  return map.querySelector(`.map-object[data-section="${name}"]`);
}

function openSection(name) {
  if (current === name) return;
  if (current) hideSectionNow(current);

  clearTimeout(hideTimer);
  current = name;

  const root = sectionRoot(name);
  for (const other of overlay.querySelectorAll('[data-section-root]')) {
    other.hidden = other !== root;
  }
  overlay.hidden = false;
  root.scrollTop = 0;
  overlay.setAttribute('aria-labelledby', sectionTitleId(name));

  map.inert = true; // карта недоступна, пока открыт раздел
  document.body.classList.add('is-locked');

  // Кадр ожидания, чтобы сработал плавный переход появления
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  modules[name].onOpen?.();
  document.getElementById(sectionTitleId(name))?.focus({ preventScroll: true });
}

function hideSectionNow(name) {
  modules[name].onClose?.();
  sectionRoot(name).hidden = true;
}

function closeSection() {
  if (!current) return;
  const name = current;
  current = null;

  modules[name].onClose?.();
  overlay.classList.remove('is-open');
  map.inert = false;
  document.body.classList.remove('is-locked');

  const finish = () => {
    sectionRoot(name).hidden = true;
    overlay.hidden = true;
    overlay.removeAttribute('aria-labelledby');
  };
  if (prefersReducedMotion()) finish();
  else hideTimer = setTimeout(finish, OVERLAY_DURATION_MS);

  // Фокус возвращается на объект карты, с которого открыли раздел
  mapButton(name).focus({ preventScroll: true });
}

// Закрыть раздел кнопкой «На карту» или клавишей Esc
function requestClose() {
  if (history.state?.fromMap) {
    // Раздел открыли кликом по карте: просто шаг назад по истории
    history.back();
  } else {
    // Раздел открыли по прямой ссылке: убираем якорь из адреса
    history.replaceState(null, '', location.pathname + location.search);
    closeSection();
  }
}

// Синхронизация с адресом: открыть раздел из якоря или вернуться на карту
function route() {
  const name = location.hash.slice(1);
  if (modules[name]) openSection(name);
  else closeSection();
}

// ---------- Запуск ----------

fillTexts();

for (const [name, module] of Object.entries(modules)) {
  module.init(sectionRoot(name), content);
}

// Раздел может сыграть свою анимацию на карте до открытия (beforeOpen),
// например, домик открывает дверь
let opening = false;

map.addEventListener('click', async (event) => {
  const button = event.target.closest('.map-object');
  if (!button || opening) return;
  const name = button.dataset.section;
  opening = true;
  try {
    await modules[name].beforeOpen?.(button);
  } finally {
    opening = false;
  }
  history.pushState({ fromMap: true }, '', `#${name}`);
  openSection(name);
});

backButton.addEventListener('click', requestClose);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !current) return;
  if (modules[current].onEscape?.()) return;
  requestClose();
});

window.addEventListener('popstate', route);
window.addEventListener('hashchange', route);

route();
