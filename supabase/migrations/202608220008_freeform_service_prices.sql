alter table public.subsidiary_services drop constraint if exists subsidiary_services_price_value_check;
alter table public.subsidiary_services alter column price_value type text using price_value::text;
alter table public.subsidiary_services add constraint subsidiary_services_price_value_check check((price_mode='fixed' and nullif(btrim(price_value),'') is not null) or (price_mode<>'fixed' and price_value is null));
