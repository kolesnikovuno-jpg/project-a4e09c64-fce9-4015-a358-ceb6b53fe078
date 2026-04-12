---
name: Stem on product page
description: Positioning rules for garden stem on product pages like /lyra
type: feature
---
Стебель на продуктовой странице (например /lyra):

Позиционирование:
- Ось стебля — по центру иконки AR (right:34px от края stage)
- Линия земли — на уровне базовой линии субтитра (bottom:-4px)
- Контейнер: position:absolute, right:34px, bottom:-4px, height:calc(100% - 32px), width:0, overflow:visible
- SVG: position:absolute, left:50%, bottom:0, height:100%, transform:translateX(-50%), preserveAspectRatio="xMidYMax meet"

Масштаб:
- viewBox="-50 0 100 600" (совпадает с Garden viewBox 900×600)
- Стебель занимает 410/600 высоты — визуально совпадает с размером на /garden
- Ground line at y=560, stem top at y=150

Нумерация кружков сверху вниз: 05.1 (верхний = top bud), 05.2 (первая ветка), 05.3 (вторая ветка).
Верхний кружок = ссылка на текущую страницу (как на garden).

Правые ветки: len=22 (укорочены чтобы не обрезались stage overflow:hidden).
