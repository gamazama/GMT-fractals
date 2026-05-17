# Animation Refactor — Spec Corrections Log

**Purpose:** track every post-shipping amendment to [`03_SPEC.md`](./03_SPEC.md). When implementation diverges from spec, the spec is updated and the change is logged here with date and rationale. The spec is the source of truth; this file is the audit trail.

**Format:** newest entry on top. Each entry: date, phase, section affected, change, rationale.

---

## Template (copy when adding entries)

```
### YYYY-MM-DD — PHASE_N — §X.Y "<Section title>"

**Change:** <what was edited in 03_SPEC.md>

**Rationale:** <why; usually because implementation found something the spec assumed wrong>

**Discovered by:** <Phase N work / spike / bench regression / external — be specific>

**Cross-refs:**
- Commit: <sha>
- Related PR / Phase report section: <pointer>

---
```

## Inbound from gmt-rs

When the Rust port ships a phase touching our scope, capture the relevant pattern here as well.

```
### YYYY-MM-DD — INBOUND — gmt-rs PHASE_X

**Pattern:** <what gmt-rs did>

**Adoption:** <whether we adopt, with rationale; if we don't, why not>

**gmt-rs ref:** `gmt-rs/PHASE_X_REPORT.md` / `gmt-rs/docs/...`

---
```

## Entries

*(none yet — the spec is at v2 with all 9 open questions resolved; corrections begin when implementation reveals what v2 got wrong)*
