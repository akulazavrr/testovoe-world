// Раздел «Мемное облако». Задание: docs/04-memes.md (+ правки автора)
//
// Облако с карты улетает к краю экрана, а из него «выдуваются» ещё несколько целых облаков:
// вместе они становятся рамкой неба внизу и по бокам. Облака не режутся — только
// отзеркаливаются и масштабируются. Сверху светит солнце, три мема стоят дугой-улыбкой.
// Клик по мему — крупный просмотр. При выходе облака слетаются обратно на карту.

import { el, prefersReducedMotion, sectionTitleId, setText } from './utils.js';

const NAME = 'memes';
const FLY_MS = 650; // разлёт и сборка облаков

// Картинки облаков: путь и соотношение высоты к ширине
const CLOUD_1 = { src: 'assets/map/cloud.png', ratio: 424 / 920 };
const CLOUD_2 = { src: 'assets/memes/cloud-2.png', ratio: 561 / 920 };

// Облака рамки. to() — центр облака (в долях экрана) и его ширина.
// fromMap: true — это само облако с карты: стартует точно на его месте.
// Остальные появляются маленькими из той же точки и вырастают по пути.
const CLOUDS = [
  { ...CLOUD_1, flip: false, fromMap: true,                       // справа сверху
    to: (vw, vh) => ({ x: 1.0 * vw, y: 0.3 * vh, w: Math.min(0.62 * vw, 0.5 * vh) }) },
  { ...CLOUD_2, flip: true,                                        // слева
    to: (vw, vh) => ({ x: 0.0 * vw, y: 0.5 * vh, w: Math.min(0.62 * vw, 0.5 * vh) }) },
  { ...CLOUD_1, flip: true,                                        // внизу слева
    to: (vw, vh) => ({ x: 0.14 * vw, y: 0.97 * vh, w: Math.min(0.95 * vw, 0.85 * vh) }) },
  { ...CLOUD_2, flip: false,                                       // внизу справа
    to: (vw, vh) => ({ x: 0.88 * vw, y: 0.99 * vh, w: Math.min(0.95 * vw, 0.85 * vh) }) },
];

let wrapper = null;
let clouds = [];     // элементы облаков рамки
let cards = [];      // кнопки мемов
let lightbox = null;
let lightboxImg = null;
let openedCard = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Облако на карте: откуда облака разлетаются и куда возвращаются
function mapCloud() {
  return document.querySelector('.map-object--memes .map-object__art');
}

// Ставит облака на их места в рамке (итоговое положение, без анимации)
function placeAtEdges() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  clouds.forEach((node, i) => {
    const c = CLOUDS[i];
    const t = c.to(vw, vh);
    const h = t.w * c.ratio;
    Object.assign(node.style, {
      left: `${t.x - t.w / 2}px`, top: `${t.y - h / 2}px`, width: `${t.w}px`, height: `${h}px`,
    });
  });
}

// Где облако i должно быть в начале разлёта (или в конце сборки): на облаке с карты
function mapFrame(i) {
  const c = CLOUDS[i];
  const r = mapCloud().getBoundingClientRect();
  const node = clouds[i];
  const box = { x: parseFloat(node.style.left), y: parseFloat(node.style.top), w: parseFloat(node.style.width), h: parseFloat(node.style.height) };
  const dx = r.left + r.width / 2 - (box.x + box.w / 2);
  const dy = r.top + r.height / 2 - (box.y + box.h / 2);
  const scale = c.fromMap ? r.width / box.w : (r.width / box.w) * 0.3;
  return {
    transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
    opacity: c.fromMap ? 1 : 0,
  };
}

function edgeFrame(i) {
  return { transform: CLOUDS[i].flip ? 'scaleX(-1)' : 'none', opacity: 1 };
}

function fly(toEdges) {
  placeAtEdges();
  const reduced = prefersReducedMotion();
  const animations = clouds.map((node, i) => {
    node.getAnimations().forEach((a) => a.cancel());
    const frames = toEdges ? [mapFrame(i), edgeFrame(i)] : [edgeFrame(i), mapFrame(i)];
    return node.animate(frames, {
      duration: reduced ? 0 : FLY_MS,
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
      fill: 'forwards',
    });
  });
  return Promise.all(animations.map((a) => a.finished));
}

// При изменении размера окна облака держатся у краёв
function onResize() {
  if (!wrapper.classList.contains('is-open') || wrapper.classList.contains('is-leaving')) return;
  placeAtEdges();
  clouds.forEach((node, i) => {
    node.getAnimations().forEach((a) => a.cancel());
    Object.assign(node.style, edgeFrame(i));
  });
}
// ---------- Крупный просмотр ----------

function openLightbox(card, item) {
  openedCard = card;
  lightboxImg.src = item.src;
  lightboxImg.alt = item.alt;
  lightbox.hidden = false;
  requestAnimationFrame(() => lightbox.classList.add('is-visible'));
  lightbox.focus({ preventScroll: true });
}

function closeLightbox() {
  lightbox.classList.remove('is-visible');
  lightbox.hidden = true;
  openedCard?.focus({ preventScroll: true });
  openedCard = null;
}

// ---------- Раздел ----------

export function init(sectionRoot, content) {
  const data = content.sections[NAME];

  clouds = CLOUDS.map((c) =>
    el('img', { className: 'memes__cloud', src: c.src, alt: '', loading: 'lazy', decoding: 'async' }),
  );

  cards = data.items.map((item, i) => {
    const card = el('button', {
      className: `memes__card memes__card--${i + 1}`,
      type: 'button',
      attrs: { 'aria-label': `${data.ui.open}: ${item.alt}` },
    }, [
      el('img', { src: item.src, alt: '', loading: 'lazy', decoding: 'async' }),
    ]);
    card.style.setProperty('--i', i);
    card.addEventListener('click', () => openLightbox(card, item));
    return card;
  });

  lightboxImg = el('img', { className: 'memes__lightbox-img', alt: '' });
  lightbox = el('button', {
    className: 'memes__lightbox',
    type: 'button',
    hidden: true,
    attrs: { 'aria-label': data.ui.close },
  }, [lightboxImg]);
  lightbox.addEventListener('click', closeLightbox);

  wrapper = el('div', { className: 'memes' }, [
    el('div', { className: 'memes__sky', attrs: { 'aria-hidden': 'true' } }, [
      el('div', { className: 'memes__rays' }),
      el('div', { className: 'memes__sun' }),
    ]),
    ...clouds,
    el('header', { className: 'memes__header' }, [
      el('h2', { className: 'memes__title', id: sectionTitleId(NAME), tabIndex: -1, text: data.title }),
      setText(el('p', { className: 'memes__subtitle' }), data.subtitle),
    ]),
    el('div', { className: 'memes__row' }, cards),
    lightbox,
  ]);

  sectionRoot.replaceChildren(wrapper);
  window.addEventListener('resize', onResize);
}

export function onOpen() {
  closeLightbox();
  wrapper.classList.remove('is-leaving');
  wrapper.classList.add('is-open');
  mapCloud().style.visibility = 'hidden'; // облако с карты теперь летает в разделе
  fly(true);

  // Мемы появляются по очереди, когда облака уже разлетелись
  wrapper.classList.remove('is-entering');
  void wrapper.offsetWidth;
  wrapper.classList.add('is-entering');
}

// Перед выходом: мемы и небо исчезают, облака слетаются обратно в облако на карте
export async function beforeClose() {
  if (!lightbox.hidden) closeLightbox();
  wrapper.classList.add('is-leaving');
  if (!prefersReducedMotion()) await wait(150);
  await fly(false);
  wrapper.classList.remove('is-open');
  mapCloud().style.visibility = '';
}

export function onClose() {
  mapCloud().style.visibility = '';
}

// Первый Esc закрывает крупный мем, второй — возвращает на карту
export function onEscape() {
  if (!lightbox.hidden) {
    closeLightbox();
    return true;
  }
  return false;
}
