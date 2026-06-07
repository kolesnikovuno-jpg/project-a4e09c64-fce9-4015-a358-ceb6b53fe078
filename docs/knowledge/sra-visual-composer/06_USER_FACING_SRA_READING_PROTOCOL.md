# 06 — User-Facing SRA Reading Protocol

## 1. Purpose

This protocol defines the default output when the user provides SRA data and expects something close to what an end user receives inside the product.

The output should not be only a final image prompt. The primary output is a readable SRA interpretation and chord summary. Visual prompt generation is optional and secondary.

## 2. Default user-facing output

When the user gives birth data, SRA data, element balance, or a structural reading request, return this structure by default:

```text
1. SRA status / data confidence
2. Primary chord
3. Current modulation
4. Human recognition interpretation
5. Support needs
6. Overload risks / avoid patterns
7. Environmental harmonization logic
8. Visual chord direction
9. Optional final visual prompt only if requested
```

Do not default to only Final Prompt + Negative Prompt unless the user explicitly asks for prompt-only mode.

## 3. SRA status / data confidence

Start by stating what kind of output is being produced:

```text
This is a structural interpretation / visual hypothesis based on the provided SRA data.
```

Then classify the data confidence:

```text
calculated / partially calculated / qualitative / incomplete
```

Rules:

- If exact element proportions are provided, use them.
- If only qualitative element data is provided, do not invent percentages.
- If birth data is provided but no calculation engine is available, say that the output is an interpretive reading based on available data, not a verified calculation.
- If data is missing, say what is missing.

## 4. Primary chord

The Primary Chord is the central output.

It should summarize:

- dominant element or field behaviour;
- supporting element;
- regulating element;
- overloaded / dense element;
- weak or delicate element;
- personality center if provided.

Preferred format:

```text
Primary chord:
- Core impulse: ...
- Support layer: ...
- Regulation layer: ...
- Density / overload: ...
- Weak or delicate vector: ...
- Overall chord character: ...
```

Do not describe elements as fixed personality labels. Translate them into functional behaviour.

## 5. Current modulation

Current modulation describes the current-year or current-cycle layer.

It is not a replacement for the base chord.

Preferred format:

```text
Current modulation:
- Active modulation: ...
- How it affects the base chord: ...
- What should be strengthened softly: ...
- What should not be amplified directly: ...
```

## 6. Human recognition interpretation

This is the text closest to the end-user result.

It should be modern, readable, non-esoteric, and practically recognizable.

It should explain:

- how the person/system tends to operate;
- what gathers them;
- what overloads them;
- what type of environment helps clarity;
- what rhythm is supportive;
- where compensation is needed.

Avoid fatalistic, mystical, or diagnostic language.

## 7. Support needs

Support needs should translate the chord into conditions:

```text
support_needs:
- more depth / quiet / recovery
- clearer boundaries
- lighter density
- measured rhythm
- soft activation rather than pressure
- protected openness
```

Use only what follows from the provided chord.

## 8. Overload risks / avoid patterns

This section should warn what not to amplify.

Examples:

```text
avoid_patterns:
- too much density or visual weight
- direct pressure to manifest quickly
- chaotic openness without boundary
- over-bright expressive fire
- decorative symbolic noise
```

Avoid medical or psychological diagnosis.

## 9. Environmental harmonization logic

This section translates SRA into external support conditions.

It should not yet become an interior design. It is a direction layer for COREFORM.

Preferred format:

```text
Environment should support:
- density release
- depth and recovery
- clear contours and spacing
- restrained activation
- quiet upward movement
```

## 10. Visual chord direction

This section gives the visual layer in human-readable terms before the final prompt.

Preferred format:

```text
Visual chord direction:
A calm off-white field with ...
The main visual tension is ...
The image should feel like ...
```

## 11. Prompt mode

Only generate a full image prompt when the user explicitly asks for:

- final prompt;
- image prompt;
- visual prompt;
- prompt only;
- Visual Chord Sheet prompt;
- Abstract SRA Field Image prompt.

If prompt is requested, include:

```text
Final prompt
Negative prompt
```

## 12. Short default instruction for GPT configuration

The GPT configuration may include:

```text
Default response mode: user-facing SRA reading.

When I provide SRA data, birth data, element balance, or a structural reading request, return:
1. SRA status / data confidence
2. Primary chord
3. Current modulation
4. Human recognition interpretation
5. Support needs
6. Overload risks / avoid patterns
7. Environmental harmonization logic
8. Visual chord direction

Do not default to prompt-only output. Only provide Final prompt + Negative prompt when I explicitly ask for image prompt, visual prompt, final prompt, or prompt only.
```
