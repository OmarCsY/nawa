/** Typed, validated access to the four VITE_* variables. Never read import.meta.env elsewhere. */

function read(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL') || 'https://xjegeggcsemvytfnvzez.supabase.co',
  supabaseKey: read('VITE_SUPABASE_PUBLISHABLE_KEY') || 'sb_publishable_WDIZovqRMVBIPPAVvPRkQQ_Qb2Q7l4j',
  engineUrl: (read('VITE_ENGINE_URL') || 'https://automations-n8n.gkrgfu.easypanel.host/webhook/noo-engine/v1').replace(/\/+$/, ''),
  useMock: import.meta.env.DEV && read('VITE_USE_MOCK').toLowerCase() === 'true',
} as const
