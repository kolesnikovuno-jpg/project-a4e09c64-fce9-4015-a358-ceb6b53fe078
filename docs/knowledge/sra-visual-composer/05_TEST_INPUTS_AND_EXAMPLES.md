# 05 — Test Inputs and Examples

## 1. Purpose

This file gives the SRA Visual Composer a small set of stable tests.

The goal is not to create final images here. The goal is to check whether the GPT keeps the canon:

```text
SRA data → visual tokens → final prompt → negative prompt
```

## 2. Minimal qualitative test input

Use this when no numeric proportions are available.

```text
Convert this SRA reading into visual tokens and a Visual Chord Sheet prompt:

base_chord:
wood: primary / weak upward growth
water: strong support
tfire: restrained manifestation
earth: overload / density accumulation
metal: regulating contour and spacing

current_chord:
fire modulation

Output:
1. source data
2. structural reading
3. visual tokens
4. final prompt
5. negative prompt
6. missing data notes
```

Expected behaviour:

- clearly state that no exact proportions were provided;
- do not invent percentages;
- use qualitative proportions;
- represent wood as upward opening / growth pressure;
- water as depth/support;
- fire as restrained modulation;
- earth as density/accumulation;
- metal as contour/spacing;
- include negative prompt.

## 3. Proportional palette test input

Use this when element percentages are available.

```text
Create a Visual Chord Sheet prompt from this element balance:

wood: 8.5%
fire: 19%
earth: 12%
metal: 34%
water: 27%

personality_center:
Jia / yang wood

current_chord:
soft fire modulation
```

Expected behaviour:

- largest mass: metal, approximately 34%;
- second largest: water, approximately 27%;
- fire: smaller accent/modulation, approximately 19%;
- earth: quiet grounding/density, approximately 12%;
- wood: smallest but semantically important personality center, approximately 8.5%;
- bottom palette strip must reflect these proportions;
- no literal tree/flame/wave/coin/mountain imagery.

## 4. Prompt audit test

```text
Audit this SRA prompt for forbidden visualization:

A mystical elemental portrait with a glowing tree in the center, fire flames around it, ocean waves below, mountains behind it and metallic coins floating in the air. Use zodiac symbols and chakra light.
```

Expected behaviour:

The GPT must flag:

- mystical portrait;
- glowing tree;
- flames;
- waves;
- mountains;
- coins;
- zodiac;
- chakra light.

Then it should convert the prompt into field behaviours:

- wood → upward opening / generative field;
- fire → restrained intensity modulation;
- water → depth/support field;
- earth → settled density;
- metal → contour/spacing.

## 5. Expected final prompt shape

A good final prompt should resemble this structure:

```text
SRA Visual Chord Sheet / Resonance Sheet — a restrained semantic field sheet translating the provided SRA chord into field behaviour, palette proportion and structural relationship.

Canvas and layout: airy off-white canvas, generous negative space, upper field occupying most of the sheet, bottom flat palette chord strip with proportional horizontal segments.

Main field: one continuous translucent watercolor-like field, soft overlapping washes, no isolated symbolic objects, no landscape horizon, no node-link diagram.

Elemental field behaviour: [element-specific behaviour based on input].

Structural overlay: thin precise grey construction lines, sparse measurement points, subtle arcs, quiet topology contours and delicate trajectory curves.

Atmosphere: calm, minimal, architectural, low-noise, readable, restrained.
```

Then include:

```text
Negative prompt: no mysticism, no zodiac, no chakras, no aura portrait, no literal trees, no flames, no waves, no coins, no mountains, no interior, no furniture, no landscape, no node-link graph, no labels, no fantasy glow, no saturated neon, no decorative symbols.
```

## 6. Calibration rule

After a test image is generated, user feedback should be converted into canon-level corrections only when repeated or clearly structural.

Do not overfit to one accidental generation.

Use this sequence:

```text
test prompt → generated image → user feedback → identify drift → correct prompt → update canon only if stable
```
