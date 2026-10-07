// Раздел «Килька в томате» — шуточная презентация. Задание: docs/03-kilka.md
//
// Слева слайды (обложка + 7), справа закреплённая колонка с демоном и йо-йо из банки кильки.
// Анимация привязана к прокрутке раздела, а не ко времени: в начале банка внизу на всю длину
// нитки, к последнему слайду она поднимается, вращаясь, и возвращается в руку демона.
// На телефоне демон маленький у правого края, нитка с банкой идут вдоль края — как индикатор прогресса.

import { el, prefersReducedMotion, sectionTitleId } from './utils.js';

const NAME = 'kilka';

// Точки на картинке демона (assets/kilka/demon.png, 640×1160), в долях её размеров.
// Посчитаны по исходнику автора: docs/references/ref-14-demon-source.webp
const DEMON_RATIO = 1160 / 640;   // высота / ширина
const HAND = { x: 0.916, y: 0.343 }; // кончики пальцев, откуда идёт нитка
const STRING_LEN = 0.396;         // исходная длина нитки до банки — доля высоты демона
const CAN_W = 0.24;               // ширина банки — доля ширины демона
const CAN_RATIO = 229 / 220;      // высота / ширина банки
const SPIN_TURNS = 2;             // сколько оборотов делает банка за весь раздел

let root = null;
let stage = null;
let rig = null;
let stringEl = null;
let can = null;
let slide2 = null;
let ticking = false;

// ---------- Слайды ----------

function renderContent(items) {
  const out = [];
  let reveal = 0; // порядковый номер строки, которая появляется по очереди на слайде 2
  for (const item of items) {
    if (item.p) out.push(el('p', { className: 'kilka__p', text: item.p }));
    if (item.calc) {
      for (const line of item.calc) {
        const node = el('p', { className: 'kilka__calc kilka__reveal', text: line });
        node.style.setProperty('--d', reveal++);
        out.push(node);
      }
    }
    if (item.big) {
      const node = el('p', { className: 'kilka__big kilka__reveal', text: item.big });
      node.style.setProperty('--d', reveal++);
      out.push(node);
    }
    if (item.dialog) {
      out.push(el('div', { className: 'kilka__dialog' }, item.dialog.map((line) => el('p', { text: line }))));
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

// ---------- Демон и йо-йо ----------

function isMobile() {
  return window.matchMedia('(max-width: 767px)').matches;
}

// Прогресс прокрутки раздела: 0 — начало, 1 — последний слайд
function progress() {
  const max = root.scrollHeight - root.clientHeight;
  return max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0;
}

function update() {
  ticking = false;
  const p = prefersReducedMotion() ? 1 : progress();
  const rigH = rig.offsetHeight;
  const rigW = rig.offsetWidth;
  const stageH = stage.clientHeight;
  const canW = rigW * CAN_W;
  const canH = canW * CAN_RATIO;
  const handX = rigW * HAND.x;
  const handY = rigH * HAND.y;

  let lift = 0;      // насколько демон поднялся (px вверх от начального места)
  let maxLen;        // длина нитки в начале
  if (isMobile()) {
    // Демон стоит наверху, нитка тянется почти до низа экрана
    rig.style.transform = '';
    const handOnScreen = rig.getBoundingClientRect().top + handY;
    maxLen = Math.max(0, window.innerHeight - handOnScreen - canH - 24);
  } else {
    // Демон поднимается снизу колонки к верху
    const pad = stageH * 0.04;
    const startTop = stageH - rigH - pad;
    lift = (startTop - pad) * p;
    rig.style.transform = `translateY(${startTop - lift}px)`;
    maxLen = rigH * STRING_LEN;
  }

  // Центр банки опускается от руки на длину нитки + половину банки; при p = 1 — в руке
  const canCenterY = handY + (maxLen + canH / 2) * (1 - p);
  const stringLen = Math.max(0, canCenterY - canH / 2 - handY);
  stringEl.style.height = `${stringLen}px`;
  stringEl.style.left = `${handX}px`;
  stringEl.style.top = `${handY}px`;
  can.style.width = `${canW}px`;
  can.style.transform =
    `translate(${handX - canW / 2}px, ${canCenterY - canH / 2}px) rotate(${p * 360 * SPIN_TURNS}deg)`;
}

function requestUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(update);
}

// ---------- Раздел ----------

export function init(sectionRoot, content) {
  root = sectionRoot;
  const data = content.sections[NAME];

  const cover = el('section', { className: 'kilka__slide kilka__slide--cover' }, [
    el('p', { className: 'kilka__kicker', text: data.cover.subtitle }),
    el('h2', { className: 'kilka__title', id: sectionTitleId(NAME), tabIndex: -1, text: data.cover.title }),
    el('span', { className: 'kilka__scroll-hint', attrs: { 'aria-hidden': 'true' }, text: '↓' }),
  ]);

  const slides = data.slides.map((slide, i) =>
    el('section', { className: `kilka__slide kilka__slide--${i + 1}` }, [
      el('div', { className: 'kilka__slide-inner' }, [
        el('h3', { className: 'kilka__h3', text: slide.title }),
        ...renderContent(slide.content),
      ]),
    ]),
  );
  slide2 = slides[1];

  stringEl = el('span', { className: 'kilka__string' });
  can = el('img', { className: 'kilka__can', src: 'assets/kilka/can.png', alt: '', loading: 'lazy', decoding: 'async' });
  rig = el('div', { className: 'kilka__rig' }, [
    el('img', { className: 'kilka__demon', src: 'assets/kilka/demon.png', alt: '', loading: 'lazy', decoding: 'async' }),
    stringEl,
    can,
  ]);
  stage = el('div', { className: 'kilka__stage', attrs: { 'aria-hidden': 'true' } }, [rig]);

  root.replaceChildren(
    el('div', { className: 'kilka' }, [
      el('div', { className: 'kilka__slides' }, [cover, ...slides]),
      stage,
    ]),
  );

  root.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  // Строки с вычислениями на слайде 2 появляются по одной, когда слайд входит в экран
  new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) slide2.classList.add('is-revealed');
    },
    { root, threshold: 0.35 },
  ).observe(slide2);

  // Картинки грузятся лениво: пересчитать, когда станут известны их размеры
  can.addEventListener('load', requestUpdate);
}

export function onOpen() {
  slide2.classList.toggle('is-revealed', prefersReducedMotion());
  requestUpdate();
}

export function onClose() {}

export function onEscape() {
  return false;
}
