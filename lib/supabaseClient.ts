import { createClient } from '@supabase/supabase-js';

/**
 * Utilitário para buscar variáveis de ambiente de forma segura
 */
const getEnv = (key: string): string => {
  try {
    // Tenta o padrão do Vite (injeta em tempo de build)
    const viteEnv = (import.meta as any).env;
    if (viteEnv && viteEnv[key]) return viteEnv[key];

    // Tenta o padrão process.env (comum em CI/CD)
    const nodeEnv = typeof process !== 'undefined' ? (process.env as any) : {};
    if (nodeEnv[key]) return nodeEnv[key];
  } catch (e) {
    // Silencia erros de acesso
  }
  return '';
};

// Se as variáveis não existirem, usamos o fallback do seu projeto de teste
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://jwkfrmlsibkqhanwkzyb.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_kuH2Ut3jSPe6uJKTMR3xcQ_rO_nWhW1';

const isValidUrl = (url: string) => {
  return url && url.startsWith('http') && !url.includes('SUA_SUPABASE_URL');
};

export const supabase = (() => {
  if (!isValidUrl(supabaseUrl)) {
    console.warn("Supabase não configurado corretamente. Verifique VITE_SUPABASE_URL.");
    return null;
  }
  
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Erro ao inicializar Supabase:", e);
    return null;
  }
})();