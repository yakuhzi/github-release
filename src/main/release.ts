export interface Release {
  id: number
  name: string | null
  tag_name: string
  upload_url: string
  html_url: string
  body?: string | null
}
