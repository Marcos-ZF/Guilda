alter table public.subsidiary_services add column if not exists price_mode text not null default 'none', add column if not exists price_value numeric(12,2);
alter table public.subsidiary_services drop constraint if exists subsidiary_services_price_mode_check;
alter table public.subsidiary_services add constraint subsidiary_services_price_mode_check check(price_mode in ('none','fixed','negotiable'));
alter table public.subsidiary_services drop constraint if exists subsidiary_services_price_value_check;
alter table public.subsidiary_services add constraint subsidiary_services_price_value_check check((price_mode='fixed' and price_value is not null and price_value>=0) or (price_mode<>'fixed' and price_value is null));
