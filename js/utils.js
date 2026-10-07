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
