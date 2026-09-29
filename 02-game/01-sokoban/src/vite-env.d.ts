interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** anon 키 또는 publishable 키 */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
