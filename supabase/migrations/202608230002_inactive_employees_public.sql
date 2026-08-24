-- Funcionários inativos continuam no arquivo público, ao fim da lista normal.
drop policy if exists "Funcionarios ativos e falecidos sao publicos" on public.employees;
drop policy if exists "Funcionarios publicos" on public.employees;

create policy "Funcionarios publicos"
on public.employees
for select
to anon, authenticated
using (employee_status in ('active', 'inactive', 'deceased'));

drop policy if exists "Equipamentos de funcionarios publicos" on public.employee_equipment;

create policy "Equipamentos de funcionarios publicos"
on public.employee_equipment
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.employees employee
    where employee.id = employee_id
      and employee.employee_status in ('active', 'inactive', 'deceased')
  )
);

drop policy if exists "Feitos de funcionarios publicos" on public.employee_achievements;

create policy "Feitos de funcionarios publicos"
on public.employee_achievements
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.employees employee
    where employee.id = employee_id
      and employee.employee_status in ('active', 'inactive', 'deceased')
  )
);
