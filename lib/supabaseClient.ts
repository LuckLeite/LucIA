
import { createClient } from '@supabase/supabase-js';

// Chaves de acesso ao banco de dados
const supabaseUrl = 'https://jwkfrmlsibkqhanwkzyb.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_kuH2Ut3jSPe6uJKTMR3xcQ_rO_nWhW1';

const isValidUrl = (url: string) => {
    try {
        return url && url.startsWith('http') && !url.includes('SUA_SUPABASE_URL');
    } catch {
        return false;
    }
};

// Inicialização segura: se falhar, retorna null em vez de quebrar o app inteiro
export const supabase = (() => {
    try {
        if (!isValidUrl(supabaseUrl)) {
            console.warn("Supabase URL não configurada ou inválida.");
            return null;
        }
        return createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error("Falha crítica ao inicializar cliente Supabase:", e);
        return null;
    }
})();
