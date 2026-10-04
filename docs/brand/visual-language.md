# Visual language

**DECISION — 2026-10-04.** The design review replaces the earlier warm T3 palette with Graphite & Blue. Implementation specification; behavioural fit remains a hypothesis until user-tested. Canonical roles come from `@lilleri/brand`, not arbitrary hex literals.

## A screen should be recognisable without a logo

The signature is a clear neutral field, aligned tabular amounts, precise headings and generous whitespace. The custom li mark stays graphite in light mode and light ink in dark mode. Blue appears where a user can act or locate their selection. Remove decorative panels around every number, ornamental currency symbols, overlarge brand marks and competing accents.

White and light grey define the light planes; graphite defines text. Dark mode uses near-black, graphite surfaces and brighter blue with independently measured contrast. Neutral planes carry most of each screen. Financial direction and connection state use semantic colours only with signs, labels or icons. `primarySoft` is a selection tint with primary/textPrimary content; do not put onPrimary text on a tint.

## Type, spacing, surfaces

Geist 16/24 body; title18/24; amount36/42; secondary explanatory14/20; caption12/18 only supplementary. Main numbers remain tabular; no black-box arithmetic or rolling count animation. Newsreader belongs to an editorial heading with ample room; never mixed into balances/transaction names. Start mobile content at 24-unit margins, use 16 within cards,8 between related words/elements,24–32 between concepts. A long amount gets a dedicated full-width line. Let rows grow for accessibility text rather than shrinking fonts.

Radius follows function: small8, standard12, card20, sheet28. Dot is fully round; other edges are calmer than a bubbly interface. Default elevation is flat; overlays use the specified soft shadow plus clear grouping, not blur glass. Dark surfaces use neutral graphite with modest plane separation; borders are decorative unless using borderStrong for an essential input boundary. Dark contrast is designed separately, not an inverted screenshot.

## Graphic device, illustration, photography

The **anchored row** repeats the wordmark's stem/foot and dot in abstract form: a small aligned dot or category icon at the left, a confident text baseline and one clear next action. It can become a sparse diagram of entries settling into order. It is not a timeline implying unsupported chronology. Dot styles never replace live text/status, bank identifiers or validation icons.

Illustrations show flat paper entries, two entries becoming linked, one uncertain entry awaiting review. Use2–3 neutral planes and one accent, no faces, wealth fantasies, piggy banks, coin piles, 3D liquid chrome or distorted competitor marks. Photography is optional: everyday work/home, natural light, ordinary adult lives, consent-cleared original/licensed imagery; avoid affluent lifestyle aspiration and Tuscan postcard shorthand. Never present a stock photo as a customer testimonial.

## Data visualisation

Use labelled bars or a calm line for one question, maximum 6 categorical series with stable theme tokens. Order by task or size, label directly, add exact numeric/accessible table equivalent, and show units/time interval. No red/green-only differences: signs, labels, patterns or shapes carry direction. Blue denotes actions and selections; ordinary debits stay graphite. Chart fills are not approved text colours. On light surfaces some chart fills fall below 3:1: use contrasting outlines/patterns and direct labels when shape boundaries carry information, or darken that chart encoding independently. Never claim every supplied chart fill passes UI contrast. No chart area distorting magnitude, unsupported forecast as fact, misleading truncated axis or doughnut with many tiny sectors.

## Motion moments

| Moment | Behaviour | Copy / accessible counterpart |
|---|---|---|
| First sync | Reveal each genuinely completed stage; no fabricated progress percentage;≤180ms opacity transition | “Sto recuperando i movimenti.” Later stages appear only when those jobs run |
| Transaction classified | Category label replaces suggestion when save succeeds;≤4px settling optional | “Categoria aggiornata.” Undo remains available |
| Review complete | Count changes after server acknowledgement; final card clears calmly | “Niente da controllare. I movimenti sono al loro posto.” Only for current loaded/confirmed data |
| Account connected | Connection status changes with a real success response; no confetti | “Collegamento attivo.” Announce once, then sync status |
| Insight reveal | Explanation expands vertically, anchored to triggering card | “Perché?” plus calculation, period, coverage and uncertainty |
| Loading | Static skeleton or quiet spinner; no bouncing logo/currency | Status region announces start/end, not every frame |
| Error / success | Inline text and vector status icon; no shake/vibration-only encoding | Name operation/cause and retry or undo; no blame |

Tokens:120ms fast,180ms normal,280ms large-sheet transition; easing cubic-bezier(0.2,0,0,1). One nonessential animation at a time. Reduced motion uses0-duration transform and state replacement; never rely on motion to show linked transactions. Make web/native reduced-motion handling explicit; CSS variables alone do not change arbitrary animations. Never animate monetary amounts through fictitious values. User control and state truth outrank brand gesture.

## Evaluation status

FACT: final vector/raster proofs and80 contrast pairs exist. Expert CVD simulation shows why hue cannot carry state alone. UNKNOWN: recognition in real app grids, accessibility on physical devices, emotional tone across age/markets. A designer must finalise vector optical alignment and kerning. Use `docs/design/visual-quality-gate.md` to collect real screen evidence before release.
