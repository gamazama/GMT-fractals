# AI Formula Kit — SOTA research (BYO-LLM paste-back authoring)

> Background research (2026-06-24) on the state of the art for the kit's interaction model
> (in-app prompt → user's own chat LLM → paste back → sanitize → compile → surface errors).
> Verdict: the design is right; the wins are targeted reinforcements. Ordered by expected lift on WEAK models.

## The load-bearing finding
- "Is Self-Repair a Silver Bullet?" (Olausson et al., ICLR 2024): a WEAK model repairing from its OWN feedback barely improves (Code Llama 1.1% HumanEval / 2.2% APPS) — it can't diagnose its own bug. With EXTERNAL/stronger feedback it jumps to 39.3% / 11.5%. https://arxiv.org/abs/2306.09896
- "How Many Tries Does It Take?" (2026): modern small models DO benefit from repair with grounded errors (Llama 3.1 8B 67→77% over 4 rounds); **2 rounds capture 76–95% of the achievable gain**; first round biggest. https://arxiv.org/html/2604.10508v1
- ⇒ **Our compile errors are the external grounded feedback.** The repair loop is the highest-leverage feature — but only if we surface a diagnosed, instruction-shaped repair prompt, not a raw dump.

## Tier 1 (largest weak-model lift)
1. **Error-repair as a first-class pre-formatted prompt** — bundle (a) the verbatim compiler error, (b) the offending line, (c) the restated output contract, (d) one instruction: "fix only this, return the complete GMF, output-only, one fenced block." Plus a small GLSL-error→plain-hint translator (driver errors are terse; weak models need the diagnosis). De-Hallucinator pattern fixed 63.2% of hallucination-failed tests by re-injecting grounded context. https://arxiv.org/abs/2401.01701  ✅ IMPLEMENTED: `buildRepairPrompt` + `glslErrorHint`, wired to the modal's "Copy fix request for LLM".
2. **Cap the loop at ~2–3 rounds, then offer regenerate-from-scratch** — initial-sample DIVERSITY beats repeated repair for eventual success. After N stalls, nudge "try again from scratch / try a stronger model," not a 5th patch.  ⬜ TODO (diversity escape hatch).
3. **Embed ≥1 full worked input→output example** (few-shot) — for a custom format the model never saw in training this is non-negotiable. Modify mode already inlines the current formula (a worked example ✅). Convert mode should add one Shadertoy/frag→GMF before/after pair.  ⬜ TODO (convert worked pair).

## Tier 2 (contract & format hardening)
4. **Grammar-prompting mini-spec** (Xie et al., https://arxiv.org/abs/2305.19234) — a fill-in-the-blanks GMF skeleton (section markers + required keys + uniform-decl shape + identifier rules) beats prose for weak models. Prompt-only, reachable from chat.  ⬜ TODO (grammar skeleton in the contract).
5. **Single fenced code block WITH a language tag (```gmf)**, then sanitize defensively — the instruction reduces but never guarantees compliance.  ✅ one-block rule shipped; ⬜ suggest the `gmf` tag explicitly.
6. **Harden the sanitizer** against documented chat-formatter failures: missing/mismatched closing fence, capitalized lang tags, bare fences, indented blocks, `<pre>` wrappers, smart-quotes/nbsp, multiple blocks. Separate extraction (regex) from validation (compile = ground truth).  ✅ fences/prose/artifact-lines + smart-quote/nbsp normalize shipped; ⬜ missing-closing-fence fallback already OK (we slice to the tag).

## Tier 3 (shader/DSL specifics)
7. **Ship an explicit builtin/uniform ALLOWLIST with exact signatures** (De-Hallucinator: +24–61% correct-API recall) ✅ HELPERS section has it; **call out WebGL2/ESSL traps** (frexp/ldexp are ESSL 3.10, absent in WebGL2 — see [[reference_webgl2_no_frexp_ldexp]]) ⬜ add a "forbidden built-ins" line.
8. **Parameterization rule + before/after example** (constants → named params) ✅ shipped (slider section + slot-id example).
9. **Role-priming** ("world-recognized artist…") + "preserve structure" measurably improved shader coherence/compile rate (AI Co-Artist, https://arxiv.org/html/2512.08951) ⬜ cheap one-liner to add.

## Off the table
10. Grammar-CONSTRAINED decoding (GBNF/logit masking) is unreachable from a BYO chat paste. Our only levers: prompt contract, grammar-PROMPTING, few-shot, post-hoc sanitize+compile. Lean on all four.

## Bottom line (top 3 to lift weak models)
1. Pre-formatted repair prompt w/ plain-language diagnosis ✅ ; 2. worked examples (modify ✅, convert ⬜) ; 3. grammar-skeleton template + allowlist, restated each repair round ⬜. Cap loop ~2 rounds, then regenerate. Sanitizer is the real guarantee, never the instruction.

Sources: see inline URLs above (Olausson 2306.09896, 2604.10508, De-Hallucinator 2401.01701, AI Co-Artist 2512.08951, Grammar Prompting 2305.19234, llm CLI --extract, et al.).
