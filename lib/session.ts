import { supabase } from '@/lib/supabase';

/**
 * Id do usuário autenticado (lido da sessão local, sem ida à rede).
 * Usado para filtrar as queries por user_id no cliente — defesa em profundidade
 * além do RLS, garantindo isolamento entre contas mesmo se o RLS falhar.
 */
export async function currentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}
