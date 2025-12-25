
import { createClient } from '@supabase/supabase-js';

// Usando as credenciais exatas fornecidas:
const supabaseUrl = 'https://jwkfrmlsibkqhanwkzyb.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_kuH2Ut3jSPe6uJKTMR3xcQ_rO_nWhW1';

const isValidUrl = (url: string) => {
    try {
        return url && url.startsWith('http') && !url.includes('SUA_SUPABASE_URL');
    } catch {
        return false;
    }
};

// Inicialização do cliente Supabase
export const supabase = isValidUrl(supabaseUrl) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;
