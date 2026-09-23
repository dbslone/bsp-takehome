# LLM provider comparison: creative brief analysis (free tier)

_Checked against each provider's docs and OpenRouter's live model list on September 23, 2026. Free offerings change often, so recheck before relying on specific model IDs._

## Goal

Build a working demo for a job interview, with no spending on tokens. A user uploads a creative brief (PDF, DOCX, or plain text). The backend sends it to an LLM and gets back JSON with five sections, which the frontend renders:

| Field         | Covers                                     |
| ------------- | ------------------------------------------ |
| `themes`      | Themes and content classification          |
| `audience`    | Interpretation of the target audience      |
| `strengths`   | Strengths and opportunities                |
| `risks`       | Risks, ambiguities, or missing information |
| `nextActions` | Recommended next actions                   |

This is not a production app. It only needs to handle a few dozen requests a day during development and the demo, using sample briefs rather than real client material.

## Summary

Neither Anthropic nor OpenAI can be used for free in a dependable way. **OpenRouter's free models are the only zero-cost option of the three**, and they're good enough for this demo. Google's Gemini free tier is a strong alternative outside the three because it reads PDFs directly.

## Criteria

- **Actually free**: No credit card charges and no required deposit.
- **File upload**: Can we send a PDF, or do we have to extract the text ourselves?
- **Structured output**: Does the model return JSON matching our schema reliably enough for a demo?
- **Reading quality**: Is the feedback specific to the brief rather than generic?
- **Limits**: Are there enough requests per day for development and a live demo?
- **Easy to upgrade**: If this became a real product, how much code would change to move to a paid model?

## Providers

### Anthropic (Claude): not free

- There's no ongoing free API tier. Anthropic's pricing docs say new Console accounts get "a small amount of free credits," often reported as a one-time $5. Recent reports say signup now requires a credit card and no credits are granted, so don't count on it.
- The free chat app at claude.ai accepts file uploads but doesn't include API access. It's still useful for trying out the analysis prompt by hand.
- If credits are available, Claude is the best technical fit: it reads PDFs directly (text and visuals) and guarantees schema-matching JSON through `output_config.format`.

### OpenAI (GPT): not free

- The "Free" usage tier is a spending cap ($100 a month), not a credit balance. Every request still needs a funded account.
- Some organizations are offered free daily tokens if they share their API inputs and outputs with OpenAI for training. The offer is only available to eligible accounts and still requires a positive balance, so it doesn't make the API free.
- The free chat app at chatgpt.com accepts file uploads but doesn't include API access.

### OpenRouter: free with limits (recommended)

- **Free models**: Model IDs ending in `:free` cost $0 per token. There were 22 on September 23, 2026. The `openrouter/free` router picks an available free model automatically.
- **Limits**: 20 requests per minute and 50 requests per day. That's plenty for building and demoing. The daily limit rises to 1,000 if you ever buy $10 in credits.
- **File upload**: Any model accepts PDFs through the `file` content type. None of the free models read PDFs natively, so OpenRouter extracts the text first. **Set the free Cloudflare parser explicitly.** Otherwise OpenRouter falls back to Mistral OCR, which costs $2 per 1,000 pages even on a free model. Text extraction loses layout and images, which is acceptable for text-heavy briefs.
- **Structured output**: Several free models support `response_format: json_schema`. Enforcement depends on the provider serving the request, so validate every response with Zod and retry once if it fails.
- **Good free models for this task** (as of September 23, 2026):

  | Model ID                                 | Context | Notes                                   |
  | ---------------------------------------- | ------- | --------------------------------------- |
  | `nvidia/nemotron-3-super-120b-a12b:free` | 262K    | Large model, supports structured output |
  | `qwen/qwen3.8-27b:free`                  | 262K    | Supports structured output              |
  | `nex-agi/nex-n2.5-pro:free`              | 262K    | Supports structured output              |
  | `openrouter/free`                        | 200K    | Picks any available free model          |

- **Privacy**: Free endpoints may log prompts or use them for training. OpenRouter's default privacy settings can block routing to those endpoints. If you get a "no endpoints found matching your data policy" error, allow free-model endpoints in OpenRouter's privacy settings. Only send sample briefs.
- **Upgrade path**: It's OpenAI-compatible, so it works with the `openai` SDK by changing `baseURL`. Moving to Claude or GPT later means changing the model ID to `anthropic/claude-sonnet-5` or `openai/gpt-5.6-terra` and adding credits.

### Alternative outside the three: Google Gemini (AI Studio)

- The Gemini API free tier needs no credit card. Its rate limits vary by model and are listed in AI Studio.
- It reads PDFs natively (text, images, and layout, up to 1,000 pages), and uploads through its Files API are free.
- It supports structured JSON output through `responseSchema`.
- Trade-offs: it's a fourth provider with its own SDK (`@google/genai`), and Google may use free-tier prompts to improve its products. It's worth considering if visual layout in briefs matters to the demo.

## Comparison

| Criterion         | Anthropic                | OpenAI            | OpenRouter (free models)           | Gemini (free tier)    |
| ----------------- | ------------------------ | ----------------- | ---------------------------------- | --------------------- |
| Actually free     | No (maybe a one-time $5) | No                | Yes                                | Yes                   |
| PDF upload        | Native (paid)            | Native (paid)     | Yes, via the free text parser      | Native                |
| DOCX upload       | Convert first            | Convert first     | Convert first                      | Convert first         |
| Structured output | Guaranteed (paid)        | Guaranteed (paid) | Supported on some models; validate | Supported             |
| Reading quality   | Excellent (paid)         | Excellent (paid)  | Good, varies by model              | Very good             |
| Limits            | N/A                      | N/A               | 20 per minute, 50 per day          | Varies by model       |
| Upgrade path      | N/A                      | N/A               | Change the model ID, add credits   | Switch to paid Gemini |

## Recommendation

1. **Use OpenRouter with a free model.** Pin `nvidia/nemotron-3-super-120b-a12b:free` and list one or two other free models as fallbacks in the `models` array, so the demo still works if a free endpoint goes away. Keep the model ID in an environment variable, with a default.
2. **Handle files on the server.** Send PDFs to OpenRouter with the `cloudflare-ai` parser. Convert DOCX to text with `mammoth`, and pass plain text through as-is.
3. **Validate and retry.** Parse the response with the `BriefAnalysis` Zod schema below. On failure, retry once with the validation errors added to the prompt, then return a clear error.
4. **Keep one provider function.** Put the call behind `analyzeBrief(input): Promise<BriefAnalysis>`. In the interview, you can explain that moving to Claude or GPT is a model-ID change on OpenRouter, or a small adapter against the direct API.
5. **Use sample briefs only.** Write 3-5 fake briefs of different quality (one complete, one vague, one missing its audience or budget) to show the risks and missing-information sections doing useful work.

## Request sketch

```ts
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    models: [
      process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b:free',
      'qwen/qwen3.8-27b:free',
      'openrouter/free',
    ],
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this creative brief.' },
          {
            type: 'file',
            file: { filename: 'brief.pdf', file_data: `data:application/pdf;base64,${pdfBase64}` },
          },
        ],
      },
    ],
    plugins: [{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'brief_analysis', strict: true, schema: briefAnalysisJsonSchema },
    },
  }),
})
```

`briefAnalysisJsonSchema` is generated from the Zod schema below, with `z.toJSONSchema(BriefAnalysis)` in Zod 4.

## Output schema sketch

```ts
import { z } from 'zod'

const Item = z.object({
  title: z.string(),
  detail: z.string(),
})

export const BriefAnalysis = z.object({
  themes: z.object({
    summary: z.string(),
    primaryThemes: z.array(z.string()),
    contentType: z.string(), // e.g. "brand campaign", "product launch video"
    tone: z.array(z.string()),
  }),
  audience: z.object({
    statedAudience: z.string().nullable(),
    interpretation: z.string(),
    segments: z.array(Item),
  }),
  strengths: z.array(Item),
  risks: z.array(
    Item.extend({
      kind: z.enum(['risk', 'ambiguity', 'missing']),
      severity: z.enum(['low', 'medium', 'high']),
    }),
  ),
  nextActions: z.array(
    Item.extend({
      priority: z.enum(['now', 'soon', 'later']),
    }),
  ),
})

export type BriefAnalysis = z.infer<typeof BriefAnalysis>
```
