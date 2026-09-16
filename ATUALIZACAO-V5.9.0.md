# V5.9.0 — Bestiário

## Instalação

Execute o SQL separado `202609160001_bestiary.sql` no SQL Editor do Supabase.
Depois publique o projeto na Vercel. O ZIP não contém arquivos SQL.
O SQL cria a tabela, as permissões e o bucket privado `bestiary-media`; não inclui
criaturas fictícias nem altera registros existentes dos outros módulos.

## Funcionamento

- Bestiário no menu, logo após Relatórios, no computador e no celular.
- Removido apenas o atalho Linha do Tempo do menu. O mural da home permanece.
- Categorias: Sapiens, Ferais, Amorfos, Vegetais, Umbros e Artificiais.
- Cards com nome, categoria, foto e ameaça de 1 a 5 estrelas.
- Detalhes com os mesmos dados, descrição, até 20 habilidades individuais,
  estratégias no combate e responsável pela descoberta/informações.
- Busca por nome sem distinção de acentos; filtros independentes de categoria e ameaça.
- Foto obrigatória no cadastro, preservada na edição se não for substituída.
- Descrição, habilidades, estratégias e responsável são opcionais.
- Responsável é escolhido entre as fichas cadastradas; não determina permissão.

## Permissões

- Visitantes não acessam páginas, registros ou o bucket do Bestiário.
- Funcionários e ADMs consultam e criam registros.
- Funcionários editam somente registros criados pela própria conta.
- ADMs editam todos e são os únicos que podem excluir.
- Autoria é determinada pela sessão e não pode ser transferida pelo formulário/API.
- Imagens usam URLs temporárias com validade de uma hora; atualizar a página renova
  os links. Não compartilhe URLs temporárias com pessoas sem acesso.

Verifique em produção usando duas contas de funcionário e uma de ADM: uma conta
não deve conseguir editar o registro da outra, nem por acesso direto à URL.
Os testes locais validam interface, filtros e ações com banco simulado; não aplicam
nem testam a migração no seu Supabase. A migração precisa ser executada lá.

O SQL de reset antigo é anterior ao Bestiário: não o reutilize sem adaptação.
