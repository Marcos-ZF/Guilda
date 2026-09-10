# V5.8.1 — Histórico da Tesouraria para funcionários

Substitui a restrição de visualização de histórico da V5.8.0.

- Funcionários com ou sem personagem vinculado podem consultar e filtrar o histórico.
- Sem botões de edição ou exclusão. As ações no servidor continuam exclusivas de ADM.
- Registro de entrada permanece restrito ao próprio personagem vinculado.
- Administradores mantêm todos os controles.
- A consulta mantém o limite existente dos 500 registros mais recentes.
- Perfis privados não são liberados: quando a conta de quem registrou não estiver
  disponível para leitura, aparece “Usuário da companhia”. O nome de quem deu/pediu
  o dinheiro continua visível no registro.

Execute o SQL separado `202609100002_treasury_employee_history.sql` no Supabase,
após o SQL de acesso da V5.8.0. Depois publique o código atualizado na Vercel.
Arquivos SQL não acompanham este ZIP: são entregues separadamente.

Após publicar, confira a consulta com funcionário com e sem vínculo, e confira que
o ADM mantém os botões de editar e excluir. Visitantes continuam sem acesso.
