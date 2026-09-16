# V5.8.2 — Painel restrito e remoção dos exemplos

- Removidos funcionários e registros históricos fictícios embutidos no código.
- Banco vazio mostra listas vazias; falhas de leitura mostram um aviso.
- Funcionários acessam ADM pelo menu, com apenas o módulo 05 (Tesouraria) e Backups.
- Contas, cargos e demais módulos permanecem restritos aos administradores.
- As permissões de entrada própria e consulta do histórico não mudaram.
- Horas dos indicadores de backup: intervalo inclusivo de 48 a 120 horas,
  mantendo a atualização dos valores a cada 48 horas.

IMPORTANTE: os indicadores de backup são visuais e não criam backups reais.

Esta atualização não exige SQL. Publique o código atualizado na Vercel.
Nenhum arquivo SQL acompanha o ZIP.
