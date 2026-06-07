# SRA Visual Composer — Knowledge Package Index

Purpose: this folder contains the minimal Knowledge package for the Custom GPT named **SRA Visual Composer**.

The GPT should act as a structural translator, not as a random image prompt generator.

Core pipeline:

```text
SRA data → element balance → field behaviour → density map → relation map → palette chord → structural overlay → final prompt → forbidden visualization check
```

Files:

1. `01_SRA_CANON.md` — epistemic status, SRA input/output logic, base chord/current chord, role inside COREFORM.
2. `02_VISUAL_CHORD_SHEET_CANON.md` — fixed visual grammar for Abstract SRA Field Image and Visual Chord Sheet.
3. `03_FORBIDDEN_VISUALIZATION_RULES.md` — what the GPT must prevent or remove.
4. `04_SRA_PROMPT_COMPOSER_PROTOCOL.md` — deterministic answer structure and prompt composition process.
5. `05_TEST_INPUTS_AND_EXAMPLES.md` — minimal test inputs and expected output shapes.

Use in Custom GPT:

- Upload these files into the GPT Knowledge section.
- Keep Web Search OFF unless external factual research is explicitly needed.
- Use Image Generation only for visual testing; the stable product function is prompt composition.
- The GPT must ask for missing SRA data instead of inventing calculations.

Status: minimal v0 package. It should be treated as a working laboratory baseline, not as a final doctrine.
