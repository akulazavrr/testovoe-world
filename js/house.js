// Раздел «Домик: спецпроект «Качок Кабачок». Задание: docs/02-house.md»
// Пока заглушка: заголовок и строка «в работе».

import { renderStub } from './utils.js';

// Вызывается один раз при загрузке страницы
export function init(root, content) {
  renderStub(root, 'house', content.sections.house, content.ui);
}

// Раздел открылся
export function onOpen() {}

// Раздел закрывается
export function onClose() {}

// Esc внутри раздела. Вернуть true, если раздел обработал клавишу сам
// (например, закрыл крупный мем), тогда раздел не закроется.
export function onEscape() {
  return false;
}