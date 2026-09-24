import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})

export function briefFileUrl(briefId: string): string {
  return `/api/briefs/${briefId}/file`
}
