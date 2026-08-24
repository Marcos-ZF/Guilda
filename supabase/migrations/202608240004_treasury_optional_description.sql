-- Permite registrar movimentações da Tesouraria sem descrição.

alter table public.treasury_transactions
  drop constraint if exists treasury_transactions_description_length;

alter table public.treasury_transactions
  add constraint treasury_transactions_description_length
  check (char_length(description) <= 3000);
