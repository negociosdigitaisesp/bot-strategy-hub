-- =============================================================
-- IQ Bot Integration — Schema Supabase
-- Tabelas: iq_bots + iq_trade_logs
-- =============================================================

-- ─── TABELA: iq_bots ─────────────────────────────────────────
-- Armazena configuração e estado do bot de copy trading por usuário.

create table if not exists public.iq_bots (
  id            uuid        not null default gen_random_uuid() primary key,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  iq_email      text,
  iq_password_enc text,                   -- senha codificada com btoa (nunca em claro)
  stake         numeric     not null default 10,
  trader_id     text,                     -- ID do trader sendo copiado
  mode          text        not null default 'demo' check (mode in ('demo', 'real')),
  is_active     boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint iq_bots_user_id_unique unique (user_id)
);

comment on table public.iq_bots is 'Configuração e estado do bot IQ Option por usuário';
comment on column public.iq_bots.iq_password_enc is 'Senha codificada com btoa — nunca armazenar em texto claro';

-- ─── TABELA: iq_trade_logs ───────────────────────────────────
-- Histórico de operações executadas pelo bot.

create table if not exists public.iq_trade_logs (
  id          uuid        not null default gen_random_uuid() primary key,
  bot_id      uuid        not null references public.iq_bots(id) on delete cascade,
  asset       text        not null,         -- ex: 'EURUSD-OTC'
  direction   text        not null check (direction in ('CALL', 'PUT')),
  result      text        not null check (result in ('WIN', 'LOSS')),
  profit      numeric     not null default 0,
  executed_at timestamptz not null default now()
);

comment on table public.iq_trade_logs is 'Histórico de operações executadas pelo bot IQ';

-- ─── ÍNDICES ─────────────────────────────────────────────────
create index if not exists iq_trade_logs_bot_id_idx         on public.iq_trade_logs (bot_id);
create index if not exists iq_trade_logs_executed_at_idx    on public.iq_trade_logs (executed_at desc);
create index if not exists iq_bots_user_id_idx              on public.iq_bots (user_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.iq_bots       enable row level security;
alter table public.iq_trade_logs enable row level security;

-- Policies: iq_bots
drop policy if exists "iq_bots_select_own"  on public.iq_bots;
drop policy if exists "iq_bots_insert_own"  on public.iq_bots;
drop policy if exists "iq_bots_update_own"  on public.iq_bots;
drop policy if exists "iq_bots_delete_own"  on public.iq_bots;

create policy "iq_bots_select_own" on public.iq_bots
  for select using (auth.uid() = user_id);

create policy "iq_bots_insert_own" on public.iq_bots
  for insert with check (auth.uid() = user_id);

create policy "iq_bots_update_own" on public.iq_bots
  for update using (auth.uid() = user_id);

create policy "iq_bots_delete_own" on public.iq_bots
  for delete using (auth.uid() = user_id);

-- Policies: iq_trade_logs
drop policy if exists "iq_trades_select_own"  on public.iq_trade_logs;
drop policy if exists "iq_trades_insert_own"  on public.iq_trade_logs;

create policy "iq_trades_select_own" on public.iq_trade_logs
  for select using (
    bot_id in (select id from public.iq_bots where user_id = auth.uid())
  );

create policy "iq_trades_insert_own" on public.iq_trade_logs
  for insert with check (
    bot_id in (select id from public.iq_bots where user_id = auth.uid())
  );

-- ─── REALTIME ────────────────────────────────────────────────
-- Permite subscriptions via Supabase Realtime nos dois canais.
alter publication supabase_realtime add table public.iq_bots;
alter publication supabase_realtime add table public.iq_trade_logs;

-- ─── TRIGGER: updated_at automático ─────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_iq_bots_updated_at on public.iq_bots;
create trigger set_iq_bots_updated_at
  before update on public.iq_bots
  for each row execute procedure public.handle_updated_at();

-- ─── VERIFICAÇÃO FINAL ────────────────────────────────────────
select 'iq_bots' as tabela, count(*) as linhas from public.iq_bots
union all
select 'iq_trade_logs', count(*) from public.iq_trade_logs;
