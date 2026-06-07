# 08 — SRA v0 Calculation Baseline

Purpose: stabilize SRA Visual Composer output for known test inputs and prevent random re-interpretation of the primary chord.

This file is Knowledge canon. If the user input matches a baseline here, use the baseline chord exactly. Do not recalculate it differently. Do not swap the core element or reinterpret the hierarchy.

SRA outputs remain interpretive structural hypotheses, not scientific facts, diagnostics, fate statements, or medical/psychological claims.

---

## Baseline 01 — 27.06.1975 / 1:45 / Kharkiv / 2026 / Kyiv

### Input match

Use this baseline when the user provides the following input, including close spelling variants:

```text
27.06.1975
1:45
Харьков / Kharkiv
2026
Киев / Kyiv
```

### Status

```text
SRA v0 calculated / interpretive.
Точные проценты не выводятся, но качественный аккорд построен в режиме SRA v0 / interpretive.
```

### Fixed qualitative chord

Do not change this hierarchy for this input.

```yaml
base_chord:
  wood: primary / delicate upward growth / form-generating vector
  water: strong support / depth / recovery / inward base
  earth: overload / density accumulation / compression risk
  metal: regulating contour / spacing / boundary clarity
  fire: restrained manifestation / soft visibility

current_chord:
  year: 2026
  modulation: fire modulation
  role: current-year activation, visibility and manifestation pressure
  warning: do not amplify Fire directly before Water and Metal are restored

harmonization_sequence:
  - Water
  - Metal
  - Wood
  - soft Fire
```

### Human-facing interpretation logic

The user-facing reading should start with recognition, not element notation.

Core recognition:

```text
Здесь чувствуется структура, в которой есть живой импульс роста и формообразования, но он не раскрывается через давление или прямой рывок. Росту нужна глубина, восстановление, ясный контур и свободное пространство. Когда появляется слишком много плотности, срочности или внешней видимости, движение сжимается. Правильная поддержка здесь — сначала восстановить глубину, затем задать границы, затем дать росту подняться мягко, и только после этого проявлять результат небольшими тёплыми акцентами.
```

Element explanation in Russian:

- **Wood** — первичный, но деликатный ростовой вектор: рост, раскрытие, формообразующий импульс, вертикальное движение. Это смысловое ядро, но не тяжёлая масса и не агрессивный рост.
- **Water** — сильная глубинная поддержка: восстановление, память, внутренняя опора, способность выдерживать процесс без немедленного вывода наружу.
- **Earth** — накопленная плотность / возможный перегруз: удержание, вес, обязанности, оседание, внутреннее уплотнение. Earth даёт устойчивость, но при избытке сжимает рост.
- **Metal** — регулирующий контур: границы, дистанция, точность, интервалы, структурная ясность. Metal не жёсткий контроль, а точное оформление пространства.
- **Fire** — сдержанное проявление: видимость, активность, тёплый акцент. В 2026 Fire усиливается как текущая модуляция, но не должен становиться давлением или перегревом.

### Do not output this mistaken chord

For this input, do **not** set:

```yaml
water: core impulse
metal: support layer
wood: regulation layer
fire: weak/delicate vector
```

That hierarchy is incorrect for this baseline.

Correct hierarchy:

```yaml
wood: core impulse / primary delicate growth
water: support layer / strong depth
metal: regulation layer / contour and spacing
earth: density overload / accumulation
fire: restrained manifestation / current modulation
```

### Product-facing section guidance

In BLOCK 1, keep section titles in Russian:

1. Статус SRA / уверенность данных
2. Человеческое узнавание
3. Первичный аккорд
4. Текущая модуляция
5. Что поддерживает
6. Риски перегруза / чего избегать
7. Логика гармонизации
8. Визуальное направление

Avoid English section labels inside BLOCK 1, such as:

```text
Core impulse
Support layer
Regulation layer
Density / overload
Weak vector
Overall chord
Active modulation
Field character
Dominant visual behaviour
```

Use Russian labels instead:

```text
Ядро
Поддерживающий слой
Регулирующий слой
Плотность / перегруз
Деликатный вектор
Общий характер аккорда
Активная модуляция
Характер поля
Главный визуальный вектор
```

### Visual direction baseline

The visual direction for this baseline:

```yaml
field_character: calm semantic field on warm off-white canvas
wood: delicate upward opening, visually important but not heavy
water: broad deep blue-grey / teal support layer
earth: visible warm sand / clay density accumulation, not terrain
metal: thin mineral-grey contour, spacing, arcs, construction lines
fire: small restrained terracotta / amber modulation accent
palette_strip: variable-width, flat full-colour, non-watercolor, no labels
```

Palette strip qualitative widths:

```yaml
water: wide / strong support
earth: significant / density accumulation
wood: medium-narrow but visually present / primary delicate vector
metal: medium interval / regulating contour
fire: narrow accent / restrained modulation
```

Do not make all palette strip segments equal width.

### Image prompt baseline

The image should remain a living Visual Chord Sheet, not a sterile dashboard background.

Must keep:

- horizontal format
- warm off-white canvas
- upper living watercolor-like semantic field
- bottom narrow flat full-colour palette chord strip
- variable-width palette segments
- architectural overlay
- no text inside image
- no labels inside image
- no terrain / landscape / map reading

The main field should feel alive: translucent watercolor, soft overlapping washes, pigment diffusion, layered transparency, visible density relations, quiet depth, precise but calm structural overlay.

The palette strip should be flat and product-like, not painterly. Segment widths must reflect qualitative volume rather than equal swatches.
