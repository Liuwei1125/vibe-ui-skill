# Vibe UI Methodology Comparison

This experiment compares a direct-model baseline and three Vibe UI methodology stages with the same brief:

> Design a landing page that introduces the Vibe UI skill.

The product content stays intentionally similar. The visible differences come from the method used to constrain the page.

## Versions

### v-1-direct-model.html

Represents asking a model directly with only a natural-language brief:

- no Vibe UI skill
- no `DESIGN.md`
- no source style
- no template recipe
- no static check or report

Expected effect:

- visually energetic at a glance
- strongest generic AI SaaS feel
- more gradients, glass effects, emoji icons, and unsupported metrics
- weakest evidence and weakest reviewability

### v0-original.html

Represents the early Vibe UI workflow:

- curated style registry
- generic landing prompt
- basic design consistency check

Expected effect:

- visually polished
- fast to understand
- more generic SaaS/AI landing page energy
- weaker evidence and weaker readiness signal

### v1-resource-backed.html

Represents Vibe UI after adding the bundled external design-resource library:

- `open-design:linear-app`
- concrete token palette
- namespaced source
- template recipe framing
- provenance-friendly commands

Expected effect:

- more specific visual language
- better style discipline
- clearer relation between CLI behavior and page sections
- still mostly a generated marketing page

### v2-vibe-gate.html

Represents the Vibe Gate layer on top of the resource-backed workflow:

- execution contract
- design invariants
- materials/source status
- anti-pattern awareness
- P0 self-check

Expected effect:

- less generic
- more reviewable
- stronger quality bar
- clearer evidence for claims
- more like a deliverable that can enter implementation or QA

## What Vibe Gate Adds

The useful contribution borrowed from external quality-gate practice is not the parchment/serif visual style. For Vibe UI, the useful pieces are branded as Vibe Gate:

- invariants: a short set of rules that must not be violated
- anti-patterns: known AI output failures with fixes
- materials status: what evidence/assets are available or missing
- execution contract: what output, style, recipe, and verification are locked
- P0 self-check: the bar before claiming a page is ready

## What The External Resource Library Adds

The bundled resource library adds breadth and source specificity:

- many real design-system references
- concrete `DESIGN.md` text
- reusable page/template patterns
- provenance and attribution

## Reading Order

1. Open `index.html`.
2. Compare all four side by side.
3. Open each page individually for full-width inspection.
4. Use the matrix at the bottom of `index.html` to compare method-level effects.
