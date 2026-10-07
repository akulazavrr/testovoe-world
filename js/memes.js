// Раздел «Мемное облако». Задание: docs/04-memes.md (+ правки автора)
//
// Облако с карты распадается на части, они разлетаются к краям экрана и становятся
// рамкой неба: внизу и по бокам. Сверху светит солнце, три мема стоят дугой-улыбкой.
// Клик по мему — крупный просмотр. При выходе части облака слетаются обратно на карту.

import { el, prefersReducedMotion, sectionTitleId, setText } from './utils.js';

const NAME = 'memes';
const FLY_MS = 650;      // разлёт и сборка облака

// Части облака — круглые «пухлые» куски по его выпуклостям (эллипсы в долях картинки),
// поэтому каждая часть сама похожа на облачко. cx, cy — центр куска, frac — его ширина.
// to() — куда кусок улетает (в долях экрана) и какой ширины он там.
const PIECES = [
  { clip: 'ellipse(17% 40% at 17% 60%)', cx: 0.17, cy: 0.60, frac: 0.34,    // внизу слева
    to: (vw, vh) => ({ x: 0.12 * vw, y: 0.94 * vh, w: Math.min(0.62 * vw, 0.55 * vh) }) },
  { clip: 'ellipse(20% 44% at 37% 46%)', cx: 0.37, cy: 0.46, frac: 0.40,    // слева
    to: (vw, vh) => ({ x: 0.03 * vw, y: 0.48 * vh, w: Math.min(0.44 * vw, 0.42 * vh) }) },
  { clip: 'ellipse(19% 42% at 62% 40%)', cx: 0.62, cy: 0.40, frac: 0.38,    // справа
    to: (vw, vh) => ({ x: 0.97 * vw, y: 0.32 * vh, w: Math.min(0.42 * vw, 0.4 * vh) }) },
  { clip: 'ellipse(17% 44% at 84% 54%)', cx: 0.84, cy: 0.54, frac: 0.34,    // внизу справа
    to: (vw, vh) => ({ x: 0.9 * vw, y: 0.95 * vh, w: Math.min(0.62 * vw, 0.55 * vh) }) },
];

let wrapper = null;
let pieces = [];     // элементы частей облака
let cards = [];      // кнопки мемов
let lightbox = null;
let lightboxImg = null;
let openedCard = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Картинка облака на карте: откуда части разлетаются и куда возвращаются
function mapCloud() {
  return document.querySelector('.map-object--memes .map-object__art');
}

// Ставит все части туда, где сейчас облако на карте (как одно целое облако)
function placeOnCloud() {
  const r = mapCloud().getBoundingClientRect();
  for (const p of pieces) {
    Object.assign(p.style, {
      left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
    });
  }
  return r;
}

// Преобразование, которое уносит ломоть i к краю экрана
function edgeTransform(i, r) {
  const piece = PIECES[i];
  const t = piece.to(window.innerWidth, window.innerHeight);
  const scale = t.w / (piece.frac * r.width);
  const fromX = r.left + piece.cx * r.width;
  const fromY = r.top + piece.cy * r.height;
  return `translate(${t.x - fromX}px, ${t.y - fromY}px) scale(${scale})`;
}

function fly(toEdges) {
  const r = placeOnCloud();
  const reduced = prefersReducedMotion();
  const animations = pieces.map((p, i) => {
    p.getAnimations().forEach((a) => a.cancel());
    const edge = edgeTransform(i, r);
    const frames = toEdges
      ? [{ transform: 'none' }, { transform: edge }]
      : [{ transform: edge }, { transform: 'none' }];
    p.style.transformOrigin = `${PIECES[i].cx * 100}% ${PIECES[i].cy * 100}%`;
    return p.animate(frames, {
      duration: reduced ? 0 : FLY_MS,
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
      fill: 'forwards',
    });
  });
  return Promise.all(animations.map((a) => a.finished));
}

// При изменении размера окна части держатся у краёв
function onResize() {
  if (!wrapper.classList.contains('is-open')) return;
  const r = placeOnCloud();
  pieces.forEach((p, i) => {
    p.getAnimations().forEach((a) => a.cancel());
    p.style.transform = edgeTransform(i, r);
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

  pieces = PIECES.map((piece) =>
    el('div', { className: 'memes__piece', attrs: { 'aria-hidden': 'true' } }),
  );
  pieces.forEach((p, i) => { p.style.clipPath = PIECES[i].clip; });

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
    ...pieces,
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
  mapCloud().style.visibility = 'hidden'; // вместо облака на карте — его части в разделе
  fly(true);

  // Мемы появляются по очереди, когда облако уже разлетелось
  wrapper.classList.remove('is-entering');
  void wrapper.offsetWidth;
  wrapper.classList.add('is-entering');
}

// Перед выходом: мемы и небо исчезают, части облака слетаются обратно на карту
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
