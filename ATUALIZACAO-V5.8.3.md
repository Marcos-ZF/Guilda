# V5.8.3 — Proteção de Cargo e Cargo de Honra

Funcionários continuam editando os dados permitidos da própria ficha, mas Cargo
e Cargo de Honra são somente leitura. Função (Classe) não foi bloqueada.

O servidor não inclui os dois campos no salvamento de funcionário, mesmo se forem
enviados manualmente. Administradores continuam podendo editar ou limpar ambos.

Execute o SQL separado `202609150001_protect_employee_ranks.sql` no Supabase e
publique o código atualizado. A proteção adicional no banco impede alterações
diretas desses campos por contas comuns, preservando as regras existentes.
Nenhum dado existente é apagado ou alterado pela migração.

O ZIP não contém SQL. O SQL precisa ser aplicado manualmente no seu ambiente.
Testes locais usam banco simulado; confira também com contas reais após publicar.
