// Раздел «Вирусный проект» (айсберг). Задание: docs/01-iceberg.md
//
// Вертикальная сцена: небо, линия воды, толща воды, дно. Айсберг проходит через всю сцену.
// На нём слова-кнопки уровней; клик показывает вопрос уровня. Открыт только один вопрос.
// Уровни берутся из content.js и раскладываются по айсбергу автоматически.

import { el, prefersReducedMotion, sectionTitleId, setText } from './utils.js';

const NAME = 'iceberg';
const FADE_MS = 250; // должно совпадать с --question-fade в css/iceberg.css

let wrapper = null;   // корневой блок раздела
let bottomText = null;
let bottomObserver = null;
let items = [];       // { li, button, card }
let openIndex = null;

// Положение слова по вертикали: над водой — между верхушкой и линией воды,
// под водой — равномерно по толще воды. Значения — в единицах сцены (CSS calc).
function levelTop(indexInGroup, groupSize, underwater) {
  if (!underwater) {
    const f = groupSize === 1 ? 0.6 : 0.4 + 0.42 * (indexInGroup / (groupSize - 1));
    return `calc(var(--ice-top) + (var(--above) - var(--ice-top)) * ${f.toFixed(3)})`;
  }
  const f = 0.06 + 0.78 * ((indexInGroup + 0.5) / groupSize);
  return `calc(var(--above) + var(--below) * ${f.toFixed(3)})`;
}

function openQuestion(i) {
  const { li, button, card } = items[i];
  openIndex = i;
  li.classList.add('is-active');
  button.setAttribute('aria-expanded', 'true');
  card.hidden = false;
  if (prefersReducedMotion()) card.classList.add('is-visible');
  else requestAnimationFrame(() => card.classList.add('is-visible'));
}

function closeQuestion(i, { instant = false } = {}) {
  const { li, button, card } = items[i];
  if (openIndex === i) openIndex = null;
  li.classList.remove('is-active');
  button.setAttribute('aria-expanded', 'false');
  card.classList.remove('is-visible');
  if (instant || prefersReducedMotion()) {
    card.hidden = true;
  } else {
    setTimeout(() => {
      // Если за это время вопрос открыли снова, не прячем его
      if (!card.classList.contains('is-visible')) card.hidden = true;
    }, FADE_MS);
  }
}

function toggleQuestion(i) {
  if (openIndex === i) {
    closeQuestion(i);
    return;
  }
  if (openIndex !== null) closeQuestion(openIndex);
  openQuestion(i);
}

export function init(root, content) {
  const data = content.sections[NAME];

  const levels = el('ol', { className: 'iceberg__levels' });
  const counts = { above: data.levels.filter((l) => !l.underwater).length };
  counts.below = data.levels.length - counts.above;
  const seen = { above: 0, below: 0 };

  items = data.levels.map((level, i) => {
    const group = level.underwater ? 'below' : 'above';
    const top = levelTop(seen[group]++, counts[group], level.underwater);
    const cardId = `iceberg-question-${i}`;

    const button = el('button', {
      className: 'iceberg__word',
      type: 'button',
      text: level.word,
      attrs: { 'aria-expanded': 'false', 'aria-controls': cardId },
    });
    const card = el('p', { className: 'iceberg__question', id: cardId, hidden: true, text: level.question });
    // Якорь центрируется на айсберге; вопрос позиционируется относительно него,
    // поэтому всегда стоит рядом со словом, какой бы длины оно ни было
    const li = el('li', {
      className: `iceberg__level ${level.underwater ? 'is-underwater' : 'is-above'}`,
    }, [el('span', { className: 'iceberg__anchor' }, [button, card])]);
    li.style.top = top;

    button.addEventListener('click', () => toggleQuestion(i));
    levels.append(li);
    return { li, button, card };
  });

  bottomText = el('p', { className: 'iceberg__bottom', text: data.bottom });

  wrapper = el('div', { className: 'iceberg' }, [
    el('header', { className: 'iceberg__header' }, [
      el('h2', { className: 'iceberg__title', id: sectionTitleId(NAME), tabIndex: -1, text: data.title }),
    ]),
    setText(el('p', { className: 'iceberg__subtitle' }), data.subtitle),
    el('div', { className: 'iceberg__scene' }, [
      el('div', { className: 'iceberg__surface', attrs: { 'aria-hidden': 'true' } }),
      el('div', { className: 'iceberg__rays', attrs: { 'aria-hidden': 'true' } }),
      el('img', {
        className: 'iceberg__ice',
        src: 'assets/iceberg/iceberg.svg',
        alt: '',
        loading: 'lazy',
        decoding: 'async',
      }),
      levels,
      el('div', { className: 'iceberg__seabed', attrs: { 'aria-hidden': 'true' } }),
      bottomText,
    ]),
  ]);

  root.replaceChildren(wrapper);

  // Финальная строка проявляется, когда пользователь доскроллил до дна
  bottomObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) bottomText.classList.add('is-visible');
    },
    { root, threshold: 0.9 },
  );
  bottomObserver.observe(bottomText);
}

export function onOpen() {
  // Каждое открытие — с чистого листа: вопросы закрыты, дно ещё не показано
  if (openIndex !== null) closeQuestion(openIndex, { instant: true });
  bottomText.classList.remove('is-visible');

  // Перезапуск анимации появления заголовка, подписи и сцены
  wrapper.classList.remove('is-entering');
  void wrapper.offsetWidth;
  wrapper.classList.add('is-entering');
}

export function onClose() {}

export function onEscape() {
  return false;
}
