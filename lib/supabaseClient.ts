import { createClient } from '@supabase/supabase-js';

/**
 * Utilitário para buscar variáveis de ambiente de forma segura em diferentes contextos
 * (Vite, Node/Netlify, ou Fallback)
 */
const getSafeEnv = (key: string): string | undefined => {
    try {
        // Fix: Use type assertion to 'any' for import.meta to bypass missing Vite type definitions and resolve 'env' property errors
        const meta = import.meta as any;
        if (typeof meta !== 'undefined' && meta.env) {
            return meta.env[key];
        }
        // Fix: Safely access process.env with type assertion to avoid environment-specific type errors
        const env = typeof process !== 'undefined' ? (process.env as any) : undefined;
        if (env) {
            return env[key];
        }
    } catch (e) {
        // Silencia erros de acesso a ambiente
    }
    return undefined;
};

// Busca as chaves com fallback para os valores padrão de teste
const supabaseUrl = getSafeEnv('VITE_SUPABASE_URL') || getSafeEnv('SUPABASE_URL') || 'https://jwkfrmlsibkqhanwkzyb.supabase.co'; 
const supabaseAnonKey = getSafeEnv('VITE_SUPABASE_ANON_KEY') || getSafeEnv('SUPABASE_ANON_KEY') || 'sb_publishable_kuH2Ut3jSPe6uJKTMR3xcQ_rO_nWhW1';

const isValidUrl = (url: string) => {
    try {
        return url && url.startsWith('http') && !url.includes('SUA_SUPABASE_URL');
    } catch {
        return false;
    }
};

export const supabase = (() => {
    try {
        if (!isValidUrl(supabaseUrl)) {
            console.warn("Supabase não configurado. Verifique as variáveis de ambiente VITE_SUPABASE_URL ou SUPABASE_URL.");
            return null;
        }
        return createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error("Erro ao inicializar Supabase:", e);
        return null;
    }
})();