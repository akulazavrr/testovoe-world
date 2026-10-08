// Раздел «Килька в томате» — шуточная презентация. Задание: docs/03-kilka.md,
// вёрстка автора: docs/references/ref-19-kilka-layout.pdf (решения автора 2026-10-08).
//
// Одна длинная страница на красном фоне. Демон наверху справа держит нитку йо-йо, она тянется
// через всю страницу к маленькой банке в конце — статично (решение автора: без анимации йо-йо).
// Движется только: большая банка (покачивается), гифка 666, рыба в космосе (едет при прокрутке).

import { el, prefersReducedMotion, sectionTitleId, setText } from './utils.js';

const NAME = 'kilka';

// Кончики пальцев на картинке демона (assets/kilka/demon.png), в долях её размеров.
// На десктопе демон отзеркален, поэтому x берётся от другого края.
const HAND = { x: 0.916, y: 0.343 };

// Изгиб нитки по макету: x (доля ширины страницы) в точках по высоте от руки (0) до банки (1).
// Крайние точки берутся из настоящих положений руки и банки.
const STRING_DESKTOP = [[0.25, 0.80], [0.5, 0.755], [0.75, 0.75]];
const STRING_MOBILE = [[0.33, 0.935], [0.66, 0.905]];

let root = null;
let page = null;
let demon = null;
let smallCan = null;
let stringSvg = null;
let stringPath = null;
let fish = null;
let slide2 = null;
let ticking = false;

function isMobile() {
  return window.matchMedia('(max-width: 767px)').matches;
}

// ---------- Слайды ----------

function renderContent(items, counter) {
  const out = [];
  for (const item of items) {
    if (item.p) out.push(setText(el('p', { className: 'kilka__p' }), item.p));
    if (item.calc) {
      for (const line of item.calc) {
        const node = el('p', { className: 'kilka__calc kilka__reveal', text: line });
        node.style.setProperty('--d', counter.n++);
        out.push(node);
      }
    }
    if (item.img) {
      const { kind, src, alt } = item.img;
      const img = el('img', { className: `kilka__img kilka__img--${kind}`, src, alt, loading: 'lazy', decoding: 'async' });
      if (kind === 'gif') {
        // Рамка показывает только цифры: белый фон и подпись генератора остаются за краем
        const frame = el('div', { className: 'kilka__gif kilka__reveal' }, [img]);
        frame.style.setProperty('--d', counter.n++);
        out.push(frame);
      } else if (kind === 'drift') {
        fish = img;
        out.push(el('div', { className: 'kilka__drift' }, [img]));
      } else {
        out.push(img);
      }
    }
    if (item.link) {
      out.push(el('a', {
        className: 'kilka__cta',
        href: item.link.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        text: item.link.text,
      }));
    }
  }
  return out;
}

// ---------- Нитка йо-йо ----------

// Плавная кривая через точки (сплайн Катмулла — Рома, переведённый в кривые Безье)
function smoothPath(points) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// Перерисовывает нитку от руки демона до маленькой банки по реальным положениям на странице
function drawString() {
  const base = page.getBoundingClientRect();
  const w = page.offsetWidth;
  const h = page.offsetHeight;
  const d = demon.getBoundingClientRect();
  const c = smallCan.getBoundingClientRect();
  if (!d.width || !c.width) return;

  const mirrored = !isMobile();
  const hand = [
    d.left - base.left + d.width * (mirrored ? 1 - HAND.x : HAND.x),
    d.top - base.top + d.height * HAND.y,
  ];
  const end = [c.left - base.left + c.width / 2, c.top - base.top + c.height * 0.12];
  const mids = (isMobile() ? STRING_MOBILE : STRING_DESKTOP)
    .map(([t, x]) => [x * w, hand[1] + (end[1] - hand[1]) * t]);

  stringSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  stringPath.setAttribute('d', smoothPath([hand, ...mids, end]));
}

// ---------- Рыба едет слева направо при прокрутке ----------

function moveFish() {
  ticking = false;
  if (!fish) return;
  if (prefersReducedMotion()) {
    fish.style.transform = '';
    return;
  }
  const r = fish.parentElement.getBoundingClientRect();
  const vh = root.clientHeight;
  // 0 — блок только показался снизу, 1 — уходит за верх экрана
  const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
  const max = Math.max(0, r.width - fish.offsetWidth);
  fish.style.transform = `translateX(${max * p}px)`;
}

function requestFish() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(moveFish);
}

// ---------- Раздел ----------

export function init(sectionRoot, content) {
  root = sectionRoot;
  const data = content.sections[NAME];
  const counter = { n: 0 };

  // Начало заголовка («Килька в томате:») не разрывается переносом
  const { title, titleKeep } = data.cover;
  const keep = titleKeep && title.startsWith(titleKeep) ? titleKeep : '';
  const cover = el('section', { className: 'kilka__cover' }, [
    el('p', { className: 'kilka__kicker', text: data.cover.subtitle }),
    el('h2', { className: 'kilka__title', id: sectionTitleId(NAME), tabIndex: -1 }, [
      el('span', { className: 'kilka__nowrap', text: keep }),
      title.slice(keep.length),
    ]),
  ]);

  const slides = data.slides.map((slide, i) => {
    if (i === 1) counter.n = 0;
    return el('section', { className: `kilka__slide kilka__slide--${i + 1}` }, [
      el('h3', { className: 'kilka__h3', text: slide.title }),
      ...renderContent(slide.content, counter),
    ]);
  });
  slide2 = slides[1];

  demon = el('img', { className: 'kilka__demon', src: 'assets/kilka/demon.png', alt: '', loading: 'lazy', decoding: 'async' });
  smallCan = el('img', { className: 'kilka__small-can', src: 'assets/kilka/can.png', alt: '', loading: 'lazy', decoding: 'async' });
  stringPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  stringSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  stringSvg.setAttribute('class', 'kilka__string');
  stringSvg.setAttribute('aria-hidden', 'true');
  stringSvg.setAttribute('preserveAspectRatio', 'none');
  stringSvg.append(stringPath);

  // Маленькая банка — в конце, рядом с последним слайдом
  slides[slides.length - 1].append(smallCan);

  page = el('div', { className: 'kilka' }, [stringSvg, demon, cover, ...slides]);
  root.replaceChildren(page);

  // Нитка пересчитывается при любом изменении размеров страницы и после загрузки картинок
  new ResizeObserver(drawString).observe(page);
  for (const img of page.querySelectorAll('img')) img.addEventListener('load', drawString);

  root.addEventListener('scroll', requestFish, { passive: true });
  window.addEventListener('resize', requestFish);

  // Строки вычислений и 666 на слайде 2 появляются по одной, когда слайд входит в экран
  new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) slide2.classList.add('is-revealed');
    },
    { root, threshold: 0.25 },
  ).observe(slide2);
}

export function onOpen() {
  slide2.classList.toggle('is-revealed', prefersReducedMotion());
  requestAnimationFrame(() => {
    drawString();
    moveFish();
  });
}

export function onClose() {}

export function onEscape() {
  return false;
}
