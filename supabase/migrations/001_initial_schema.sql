-- =============================================================================
-- Schema inicial do Monesy
-- =============================================================================
-- Para aplicar:
--   1. Pelo Studio do Supabase: SQL Editor > New query > cole este arquivo.
--   2. Ou via Supabase CLI: supabase db push
-- =============================================================================

-- Extensoes
create extension if not exists "uuid-ossp";

-- =============================================================================
-- profiles: 1 linha por usuario autenticado, criada automaticamente via trigger
-- =============================================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users on delete cascade,
    nome text,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
    for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
    for update using (auth.uid() = id);

-- Cria profile automaticamente ao registrar usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, nome)
    values (new.id, new.raw_user_meta_data->>'nome');
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =============================================================================
-- secoes: configuradas por usuario, separadas por tipo (receita/despesa)
-- =============================================================================
create table if not exists public.secoes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users on delete cascade,
    tipo text not null check (tipo in ('receita', 'despesa')),
    nome text not null,
    created_at timestamptz not null default now(),
    unique (user_id, tipo, nome)
);

create index if not exists secoes_user_tipo_idx on public.secoes (user_id, tipo);

alter table public.secoes enable row level security;

drop policy if exists secoes_own_all on public.secoes;
create policy secoes_own_all on public.secoes
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- anos_cadastrados: anos planejados sem precisar de lancamento
-- =============================================================================
create table if not exists public.anos_cadastrados (
    user_id uuid not null references auth.users on delete cascade,
    ano integer not null check (ano between 1900 and 2200),
    created_at timestamptz not null default now(),
    primary key (user_id, ano)
);

alter table public.anos_cadastrados enable row level security;

drop policy if exists anos_own_all on public.anos_cadastrados;
create policy anos_own_all on public.anos_cadastrados
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- lancamentos: receitas e despesas com soft delete via excluido_em
-- =============================================================================
create table if not exists public.lancamentos (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users on delete cascade,
    ano integer not null check (ano between 1900 and 2200),
    mes integer not null check (mes between 1 and 12),
    tipo text not null check (tipo in ('receita', 'despesa')),
    descricao text not null,
    secao text not null default 'Geral',
    valor numeric(14, 2) not null check (valor > 0),
    observacao text not null default '',
    tags text[] not null default '{}',
    pago boolean not null default false,
    investido boolean not null default false,
    criado_em timestamptz not null default now(),
    excluido_em timestamptz
);

create index if not exists lancamentos_user_periodo_idx
    on public.lancamentos (user_id, ano, mes) where excluido_em is null;

create index if not exists lancamentos_lixeira_idx
    on public.lancamentos (user_id, excluido_em) where excluido_em is not null;

alter table public.lancamentos enable row level security;

drop policy if exists lancamentos_own_all on public.lancamentos;
create policy lancamentos_own_all on public.lancamentos
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- lancamento_historico: log de alteracoes por lancamento
-- =============================================================================
create table if not exists public.lancamento_historico (
    id uuid primary key default uuid_generate_v4(),
    lancamento_id uuid not null references public.lancamentos(id) on delete cascade,
    user_id uuid not null references auth.users on delete cascade,
    acao text not null,
    antes jsonb,
    depois jsonb,
    ts timestamptz not null default now()
);

create index if not exists hist_lancamento_idx on public.lancamento_historico (lancamento_id, ts desc);

alter table public.lancamento_historico enable row level security;

drop policy if exists hist_lanc_own on public.lancamento_historico;
create policy hist_lanc_own on public.lancamento_historico
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- meses_revisados: marca de mes conferido
-- =============================================================================
create table if not exists public.meses_revisados (
    user_id uuid not null references auth.users on delete cascade,
    ano integer not null check (ano between 1900 and 2200),
    mes integer not null check (mes between 1 and 12),
    revisado_em timestamptz not null default now(),
    primary key (user_id, ano, mes)
);

alter table public.meses_revisados enable row level security;

drop policy if exists revisao_own on public.meses_revisados;
create policy revisao_own on public.meses_revisados
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- assinaturas: custos recorrentes no cartao (independente dos lancamentos)
-- =============================================================================
create table if not exists public.assinaturas (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users on delete cascade,
    descricao text not null,
    data_inicio date not null,
    data_fim date,
    valor_mensal numeric(14, 2) not null check (valor_mensal > 0),
    cartao text not null,
    criado_em timestamptz not null default now(),
    constraint assin_datas check (data_fim is null or data_fim >= data_inicio)
);

create index if not exists assin_user_idx on public.assinaturas (user_id);

alter table public.assinaturas enable row level security;

drop policy if exists assin_own on public.assinaturas;
create policy assin_own on public.assinaturas
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- assinatura_historico: log de alteracoes
-- =============================================================================
create table if not exists public.assinatura_historico (
    id uuid primary key default uuid_generate_v4(),
    assinatura_id uuid not null references public.assinaturas(id) on delete cascade,
    user_id uuid not null references auth.users on delete cascade,
    acao text not null,
    antes jsonb,
    depois jsonb,
    ts timestamptz not null default now()
);

create index if not exists hist_assin_idx on public.assinatura_historico (assinatura_id, ts desc);

alter table public.assinatura_historico enable row level security;

drop policy if exists hist_assin_own on public.assinatura_historico;
create policy hist_assin_own on public.assinatura_historico
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- features: changelog global (sem user_id) — leitura publica para autenticados
-- =============================================================================
create table if not exists public.features (
    id text primary key,
    titulo text not null,
    descricao text,
    implementado_em timestamptz not null
);

alter table public.features enable row level security;

drop policy if exists features_select_authenticated on public.features;
create policy features_select_authenticated on public.features
    for select to authenticated using (true);

-- Apenas service_role pode inserir/atualizar (sem politica para anon/authenticated).
