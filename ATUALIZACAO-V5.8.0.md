# V5.8.0 — Tesouraria para funcionários

## Instalação

1. Antes de publicar, execute no SQL Editor do Supabase o arquivo
   `supabase/migrations/202609100001_treasury_employee_access.sql`.
   Ele depende das migrações anteriores da Tesouraria e não remove registros.
2. Atualize o projeto e publique na Vercel pelo fluxo habitual.

## Acessos

- Funcionário: link Tesouraria no menu, com os quatro saldos. Sem histórico.
- Funcionário com personagem vinculado: botão Registrar entrada. O personagem
  vem da conta autenticada e não pode ser substituído nem acompanhado de outros.
- Funcionário sem vínculo: somente consulta, sem botão de registro.
- Administrador: histórico e todos os controles anteriores permanecem disponíveis.
- Visitante: não tem acesso ao caixa.

A data continua automática e editável; a descrição continua opcional.
Uma entrada de funcionário atualiza o caixa imediatamente, sem aprovação adicional.

## Verificação após publicar

Teste com contas de administrador, funcionário com vínculo e funcionário sem vínculo.
Confira se ambos os funcionários veem os mesmos saldos do ADM, sem histórico.
Registre uma entrada com o personagem vinculado e confira a autoria no histórico ADM.
Confirme que funcionários não conseguem criar saídas, editar ou excluir registros.

As permissões também são aplicadas no Supabase: funcionários não recebem SELECT,
UPDATE ou DELETE de registros; a leitura dos saldos passa por uma função autenticada
que retorna somente os quatro totais. INSERT exige entrada, autor autenticado,
ID e nome exatos do personagem vinculado. As políticas de ADM são preservadas.

Os testes locais das ações podem ser executados com
`node --test scripts/test-treasury-access.mjs`. Usam um banco simulado; não substituem
a conferência das políticas no Supabase após executar a migração.
