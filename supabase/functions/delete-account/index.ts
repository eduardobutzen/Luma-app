// Supabase Edge Function: delete-account
// Exclui permanentemente a conta do usuário autenticado (e, por cascata nas FKs
// de auth.users, todos os seus dados: profiles, meals, meal_items, weight_logs,
// water_logs).
//
// Deploy:
//   supabase functions deploy delete-account
// O secret SUPABASE_SERVICE_ROLE_KEY já é injetado automaticamente pela Supabase
// nas Edge Functions; não comite a service role no app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Identifica o usuário a partir do token do app.
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
