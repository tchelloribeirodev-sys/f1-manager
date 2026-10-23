-- Configuração do bridge editável pelo app (linha única, id = 1).
-- forward_to: "IP:porta[,IP:porta]" para repassar os pacotes UDP a outro programa
-- (SimHub, Aethernum...). Vazio = usa o FORWARD_TO do .env do bridge.
create table if not exists f1.tb_bridge_config (
  id         integer primary key default 1 check (id = 1),
  forward_to text not null default '',
  updated_at timestamptz not null default now()
);

insert into f1.tb_bridge_config (id) values (1) on conflict (id) do nothing;

alter table f1.tb_bridge_config enable row level security;
drop policy if exists auth_all_tb_bridge_config on f1.tb_bridge_config;
create policy auth_all_tb_bridge_config on f1.tb_bridge_config for all to authenticated using (true) with check (true);
grant select, insert, update, delete on f1.tb_bridge_config to authenticated;
