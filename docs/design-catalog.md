# Claude Design catalog — redesign reference for FAI

A working reference distilled from
[rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design),
the community catalog for **Claude Design** (Anthropic's AI design workspace).
Use it to pick a direction and steer a redesign of FAI's look.

---

## How this maps to FAI today

FAI's current theme (`src/index.css`) is a dark, high-contrast
"combine-broadcast" look — structurally already in the **Data-Dense Pro**
family. Two current choices land on the catalog's anti-slop list, so they're
the first things to reconsider in a redesign:

- **Font:** `--font-sans` is **Inter** — the toolkit's headline example of an
  overused family. Swap for something with more character (see below).
- **Accent:** `--color-fai` is a generic cyan `#22d3ee` — effectively the
  "teal accent everywhere" default fingerprint. A distinctive, brand-grounded
  accent would immediately de-genericize the app.

Everything else (deep ink base, panel layers, saturated status colors, gold
for leaders) is solid and on-family.

**Likely good fits for a combine dashboard:** _Data-Dense Pro_ (where it
already lives), _Cinematic Dark_ (broadcast drama, oversized type), or a remix
like _Warp × Sentry_ (developer-dashboard rigor without the coldness).

---

## The 9 aesthetic families

| # | Family | Character | Notes for FAI |
|---|--------|-----------|---------------|
| 1 | **Editorial Minimalism** | Calm neutrals, serif headlines, generous spacing, single accent | Too quiet for a broadcast scoreboard |
| 2 | **Terminal-Core** | Monospace everywhere, phosphor colors on near-black, CLI metaphors | Works for a "combine data terminal" angle |
| 3 | **Warm Editorial** | Terracotta, cream, clay; serif body, human-centered | Off-brand for a dark dashboard |
| 4 | **Data-Dense Pro** | Charts prominent, tight spacing, saturated palette, dark dashboards | **Where FAI lives now** |
| 5 | **Cinematic Dark** | Film-grade gradients, oversized type, motion-forward, media-heavy | Strong fit — broadcast energy |
| 6 | **Playful Color** | High-saturation, illustrated accents, rounded corners, consumer-friendly | Too casual for combine data |
| 7 | **Glass / Soft-Futurism** | Frosted blur, translucency, soft gradients, premium feel | Possible for TV Mode / hero panels |
| 8 | **Neon Brutalist** | Hard edges, type mixing, oversized numerals, saturated single hue | Great for the 0–100 index numerals |
| 9 | **Cult / Indie Picks** | Non-Fortune-500 brands: indie SaaS, cult tools, magazines, studios | Grab-bag of references |

---

## Brand `DESIGN.md` systems

Reference systems distilled into portable token/type/motion/voice files —
drop one into a prompt to steer generation toward that brand's feel:

Linear · Stripe · Vercel · Ollama · Warp · Raycast · Claude / Anthropic ·
Notion · ClickHouse · PostHog · RunwayML · ElevenLabs · Figma · Arc Browser ·
Bugatti · The Verge · Granola · MongoDB · Datadog · Sentry · Supabase · Canva ·
Toss · Apple · Spotify · Airbnb · Midjourney · NVIDIA · BMW · Ferrari ·
Lamborghini · Renault · Duolingo · Mailchimp · Criterion Collection · A24 ·
Letterboxd · Superhuman · Obsidian

**Most relevant to FAI:** Datadog, Sentry, PostHog, ClickHouse (data-dense
dashboards); NVIDIA, BMW, Ferrari, Lamborghini (performance/athletic energy);
Linear, Warp (rigorous dark product UI).

---

## Remix recipes

Named cross-family combinations — borrow one system's structure and another's warmth:

| Recipe | Result |
|--------|--------|
| **Linear × Claude** | Editorial SaaS with soul |
| **Warp × Sentry** | Developer dashboard, minus the coldness |
| **Stripe × A24** | Fintech pitch with personality |
| **Vercel × Pitchfork** | Editorial docs site |
| **Granola × Criterion** | Premium notes with gravitas |
| **Ollama × ElevenLabs** | CLI landing page |
| **Notion × Duolingo** | Friendly education SaaS |
| **Mercury × Linear** | Fintech dashboard, editorial warmth |

---

## Prompt packs (5 shipped)

Reusable prompts — give a URL or two files, get a system, audit, or critique back:

- `brand-to-design-md` — a URL → a full `DESIGN.md` for that brand
- `audit-live-site` — a URL → a scored audit plus a punch list
- `3-designer-debate` — three voices critique the work, then synthesize a direction
- `remix-two-brands` — combine two `DESIGN.md` files into one system
- `family-picker` — answer three questions, get a recommended family

---

## Anti-slop toolkit

> Avoid overused font families (Inter, Roboto, Arial) and cliché color schemes
> (purple gradients). Anthropic's guidance emphasizes unique fonts chosen for the
> brand, cohesive colors grounded in the product story, animation used for
> effect, and context-specific character over defaults.

**Eight default fingerprints to design against:**

1. Teal accent everywhere ← _FAI's current cyan_
2. Blinking status dot
3. Container soup
4. Default serif headline
5. Accent bar left of every card
6. Three-column feature grid
7. Lucide icon stack
8. Generative hero ignoring palette tokens

---

_Content mirrors the upstream awesome-list; all credit to its authors and
contributors. Assembled here as a redesign reference for FAI._
