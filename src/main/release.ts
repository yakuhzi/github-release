export interface Release {
  id: number
  name: string | null
  upload_url: string
  html_url: string
  body?: string | null
}
