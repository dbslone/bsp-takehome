import { z } from 'zod'

const Item = z.object({
  title: z.string().describe('Short label, a few words'),
  detail: z.string().describe('One or two sentences specific to this brief'),
})

export const BriefAnalysis = z.object({
  themes: z.object({
    summary: z.string().describe('Two or three sentence summary of what the brief is about'),
    primaryThemes: z.array(z.string()).describe('Main themes, a few words each'),
    contentType: z
      .string()
      .describe('Content classification, e.g. "brand campaign" or "product launch video"'),
    tone: z.array(z.string()).describe('Tone and mood descriptors'),
  }),
  audience: z.object({
    statedAudience: z
      .string()
      .nullable()
      .describe('The audience as written in the brief, or null if it is not stated'),
    interpretation: z.string().describe('Who the audience really is and what they care about'),
    segments: z.array(Item).describe('Distinct audience segments worth targeting'),
  }),
  strengths: z.array(Item).describe('Strengths of the brief and opportunities it creates'),
  risks: z
    .array(
      Item.extend({
        kind: z.enum(['risk', 'ambiguity', 'missing']),
        severity: z.enum(['low', 'medium', 'high']),
      }),
    )
    .describe('Risks, ambiguities, and missing information'),
  nextActions: z
    .array(
      Item.extend({
        priority: z.enum(['now', 'soon', 'later']),
      }),
    )
    .describe('Recommended next actions for the creative team'),
})

export type BriefAnalysis = z.infer<typeof BriefAnalysis>

export const ExtractedBrief = z.object({
  title: z
    .string()
    .describe('Title from the file, at most 255 characters. Empty string if unstated'),
  description: z.string().describe('What the work is. Empty string if unstated'),
  contentType: z
    .string()
    .describe('Content classification, at most 255 characters. Empty string if unstated'),
  targetAudience: z
    .string()
    .describe('Audience named in the file, at most 255 characters. Empty string if unstated'),
  notes: z
    .string()
    .describe('Timing, budget, deliverables, and other notes. Empty string if unstated'),
})

export const ModelResponse = BriefAnalysis.extend({
  extracted: ExtractedBrief.describe('Brief fields copied from the attached file'),
})

const { $schema: _schema, ...jsonSchema } = z.toJSONSchema(ModelResponse)

export const modelResponseJsonSchema: Record<string, unknown> = jsonSchema
