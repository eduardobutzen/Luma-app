-- ============================================================================
-- Luma — Migration 22: realtime para amizades
-- Faz a lista de amigos/pedidos atualizar em tempo real (sem reabrir o app)
-- quando o outro usuário aceita/envia/cancela um pedido.
-- Rode no SQL Editor. É idempotente.
-- ============================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.friendships;
  exception when others then null;
  end;
end$$;
