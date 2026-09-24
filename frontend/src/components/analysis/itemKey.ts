import type { AnalysisItem } from '../../types'

export function itemKey(item: AnalysisItem): string {
  return `${item.title}-${item.detail}`
}
