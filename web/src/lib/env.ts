/** Typed, validated access to the four VITE_* variables. Never read import.meta.env elsewhere. */

function read(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseKey: read('VITE_SUPABASE_PUBLISHABLE_KEY'),
  engineUrl: read('VITE_ENGINE_URL').replace(/\/+$/, ''),
  useMock: read('VITE_USE_MOCK').toLowerCase() === 'true',
} as const
