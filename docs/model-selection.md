# Choosing a model

How to decide which OpenRouter model analyzes a brief, and how to defend that choice. The provider is already settled in [llm-provider-comparison.md](llm-provider-comparison.md): free OpenRouter models, with the id in `OPENROUTER_MODEL`. This note is the bake-off that picks the id.

The live app does not pick a model per brief. [`backend/src/analysis/openrouter.ts`](../backend/src/analysis/openrouter.ts) sends one list: the primary from `OPENROUTER_MODEL` (default `nvidia/nemotron-3-super-120b-a12b:free`), then `qwen/qwen3.8-27b:free`, then `openrouter/free`. OpenRouter uses the first model that answers. A bake-off has to pin one id per run, or a failure on model A gets scored as model B.

## What a good model is here

The team uses the analysis to decide what to do next. A model is good enough to be the default when it does all of the following on the fixture set:

- Returns JSON that passes `ModelResponse` in [`backend/src/analysis/schema.ts`](../backend/src/analysis/schema.ts). The UI never shows an unvalidated result, so a fluent model that misses the schema is a failed analysis.
- Names things that are actually in the brief: product, audience, deliverables, budget, dates. Generic advice that would still make sense if you swapped the file is a miss, even when the schema passes.
- Marks real gaps as `missing` or `ambiguity` (budget, timeline, deliverables, success metrics, approvals) and does not invent a budget or date the file never stated.
- Gives next actions a producer could assign. "Develop the creative" is not one of those.
- Fills blank title, description, content type, audience, and notes from the file, and leaves a value the user already typed alone. Extraction is applied in `fillBlankBriefFields`.
- Finishes well inside the 90 second timeout in `callOpenRouter`. Aim for a median under 45 seconds so a slow day still completes.

Cost is not a tie-break while every candidate is a `:free` model. It becomes one only if a paid model enters the list.

## Candidates

Recheck OpenRouter's free model list the day you run this. Free ids change. Keep only models that accept `response_format: json_schema`. Drop any that need a paid PDF parser. The app already forces the free Cloudflare parser for PDFs.

Start from the ids already in the comparison note:

| Model id                                 | Role in the bake-off                                      |
| ---------------------------------------- | --------------------------------------------------------- |
| `nvidia/nemotron-3-super-120b-a12b:free` | Current default. Include it.                              |
| `qwen/qwen3.8-27b:free`                  | Current fallback. Include it.                             |
| `nex-agi/nex-n2.5-pro:free`              | Structured-output candidate from the comparison. Include. |
| `openrouter/free`                        | Router, not a model. Leave it out of the quality table.   |

Three models is enough. The free tier is 50 requests per day. Three models, four text fixtures, one run each is 12 requests. A second run on the top two is 8 more. Stay under that budget so a failed call can be repeated.

## Fixtures

Score models on the same plain text. File parsing is a separate smoke test on the winner, because every free model on OpenRouter sees extracted text rather than the PDF itself.

Use the files in `example-briefs/` and add two short text files before the first run. Submit each with the form fields below, so extraction and "do not overwrite" are both tested.

| Fixture       | File                                                                                               | Form fields                          | Pass looks like                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete      | `example-briefs/complete.txt`                                                                      | All blank                            | Title Harbor Light, audience weekday commuters, notes include $80,000 and March. Risks do not claim the budget or the shoot month is missing. |
| Thin          | `example-briefs/file-only.txt`                                                                     | All blank                            | Audience is career-changing adults. At least one `missing` risk for budget or success metrics. No invented dollar amount.                     |
| Vague         | New file, one sentence, no audience, budget, or deliverable                                        | All blank                            | High-severity missing information. Next actions ask for those gaps. The summary would be wrong if you pasted it onto the Harbor Light brief.  |
| Contradiction | New file whose audience is parents of young children, with a note that the cut is for trade buyers | Audience field set to `Adults 25–40` | An `ambiguity` risk that names both audiences. The saved audience field stays `Adults 25–40`.                                                 |

After a winner is chosen, run two smoke tests on that model only:

- The complete brief as a PDF, form blank. Same extraction as the text run. A parser failure here is a file-pipeline bug, not a reason to switch models.
- The thin brief as a DOCX. Mammoth text should produce the same gaps as the `.txt` run.

`example-briefs/title-too-long.txt` is an upload-limit case. It never reaches a model. Leave it out.

## How to run one model

1. Freeze `SYSTEM_PROMPT` in [`backend/src/analysis/run.ts`](../backend/src/analysis/run.ts) and `ModelResponse` for the whole bake-off. A prompt tweak between models makes the table useless.
2. Point the request at one id. Set `OPENROUTER_MODEL` to that id and, for these runs only, send `models: [that id]` with no fallbacks. Restore the fallback list when the bake-off is done.
3. Restart the backend so it reads the new id.
4. Create a brief per fixture. Wait until the analysis row is `succeeded` or `error`.
5. Confirm `brief_analyses.model` equals the id you pinned. If it does not, that row is not a score for this candidate.

Read the rows from Postgres:

```sql
SELECT
  model,
  status,
  error,
  EXTRACT(EPOCH FROM (completed_at - created_at)) AS seconds,
  result
FROM brief_analyses
ORDER BY created_at DESC;
```

The brief page also shows the model id on a finished analysis. `raw_response` is stored only on errors, which is what you want when the schema rejects a body.

If OpenRouter returns a rate-limit or "no endpoints" error, record that as a failed run for availability. Do not immediately retry into another model. Wait and repeat the same id once. Two infrastructure failures on the same id, with the others healthy, is a reason to demote it to fallback or drop it.

## Score sheet

One row per model per fixture. Copy this table into the notes for the run.

| Model | Fixture | HTTP ok | Schema ok | Seconds | Specific (0–2) | Risks (0–2) | Actions (0–2) | Extraction (0–2) |
| ----- | ------- | ------- | --------- | ------- | -------------- | ----------- | ------------- | ---------------- |

Score each 0–2 column by reading the result, not the prose quality in the abstract:

| Score | Specific                                                        | Risks                                                                                  | Actions                                               | Extraction                                                                                         |
| ----- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 2     | Names the product, audience, and deliverable from this file     | Right gaps, right `kind`, no invented facts                                            | A producer could assign it this week                  | Blank fields match the file. Filled fields were not overwritten. Length limits held.               |
| 1     | Right brief, but one section could apply to any similar project | Right topic, wrong severity or kind, or one invented detail                            | Direction is right, the step is vague                 | One field empty that the file stated, or one field loosely paraphrased                             |
| 0     | Could be pasted onto a different brief without becoming false   | Misses an obvious gap, or states a budget, date, or audience the file does not contain | Generic ("refine the strategy", "align stakeholders") | Invents a value, overwrites a user field, or leaves every blank empty when the file had the answer |

## Decision

A model is eligible to be the default only if:

- Schema passes on at least 3 of the 4 text fixtures.
- No fixture scores 0 on Risks or Extraction.
- Median seconds across its schema-passing runs is under 45.
- The stored `model` id matches the id you requested on every successful run.

Among eligible models, the default is the one with the highest sum of the four 0–2 columns. Tie-break in this order: fewer schema failures, then lower median latency, then the model whose failure mode you can explain (timeout versus bad JSON versus generic copy).

Write the result back into config:

- `OPENROUTER_MODEL` is the winner.
- The first hardcoded fallback is the next eligible model. Prefer a different model family from the winner, so one provider outage does not remove both.
- Keep `openrouter/free` as the last entry only as an availability net. It is not a quality claim. If the demo cannot tolerate an unknown model, delete that entry and accept a hard error when the two named models are down.

If no model is eligible, do not average them into a pass. Fix the prompt or the schema, then rerun. The usual cause is a schema the free models cannot hit, or a prompt that rewards a generic summary.

## What to say about the choice

After the sheet is filled in, the defense is one paragraph:

> The default is `<id>`. On four fixtures with the prompt and schema frozen, it passed validation `<n>` times, median latency was `<s>` seconds, and it was the only eligible model that flagged the missing budget on the thin brief without inventing one on the complete brief. Fallbacks are `<id>` and then `openrouter/free`. The same Zod schema rejects a bad body before the UI sees it.

That matches how the app actually behaves: one list, validated output, model id stored on the analysis row.

## When to run it again

- A free model id disappears or starts returning schema errors on briefs that used to pass.
- Median latency on real briefs crosses about 45 seconds, or timeouts show up in the analysis `error` column.
- The prompt or `ModelResponse` changes. The old scores do not carry over.
- The morning of a demo. Repeat the complete and thin fixtures once on the default. That is two requests.

## Routing a brief to a different model

Not part of this demo. Every brief uses the same list. Add a second path only after this bake-off shows a gap you can predict from the brief before the call, for example a long file that the fast model summarizes generically while a stronger model names the gaps.

If that gap shows up, the rule stays simple: short text (under a few thousand characters, form mostly filled) stays on the free default; a long file or a brief with several blank fields goes to one paid model on the same schema. Both paths still go through `ModelResponse.safeParse`. Do not route on a model's own confidence score. The stored `model` column is how you check the rule later.
