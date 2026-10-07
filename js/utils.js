// Мелкие помощники, общие для всех разделов.

// Создаёт элемент: el('p', { className: 'x', text: 'Привет' }, [детки])
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  const { text, attrs, ...rest } = props;
  Object.assign(node, rest);
  if (text !== undefined) node.textContent = text;
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  }
  for (const child of children) node.append(child);
  return node;
}

// Вставляет текст в элемент. \n в тексте — принудительный перенос: каждая строка
// становится отдельным блоком, чтобы браузер ровно раскладывал по ширине каждую строку
export function setText(node, text) {
  const lines = text.split('\n');
  if (lines.length === 1) {
    node.textContent = lines[0];
  } else {
    node.replaceChildren(...lines.map((line) => el('span', { className: 'text-line', text: line })));
  }
  return node;
}

// Пользователь попросил систему убрать лишнее движение
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// id заголовка раздела: по нему окно раздела получает своё название для скринридеров
export function sectionTitleId(name) {
  return `section-title-${name}`;
}

// Временная заглушка раздела: заголовок и строка «в работе»
export function renderStub(root, name, sectionContent, ui) {
  root.replaceChildren(
    el('div', { className: 'section__inner' }, [
      el('h2', {
        className: 'section__title',
        id: sectionTitleId(name),
        tabIndex: -1,
        text: sectionContent.title,
      }),
      el('p', { className: 'section__stub', text: ui.sectionStub }),
    ]),
  );
}
