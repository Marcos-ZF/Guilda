# V5.9.1 — Bestiário: oito estrelas e categorias de dano

Execute o SQL separado `202609160002_bestiary_levels_damage.sql` no Supabase antes
de publicar este projeto na Vercel. Ele depende do SQL inicial do Bestiário V5.9.0.
O ZIP não inclui SQL. A atualização preserva os registros, imagens e permissões.

- Ameaça de 1 a 8 estrelas no cadastro, edição, filtros, cards e detalhes.
- Habilidades com bolinha azul (mágico), vermelha (físico), roxa (híbrido) ou
  cinza (sem classificação/null). Habilidades antigas permanecem válidas e cinzas.
- Manual em popup ao lado de Nova criatura, com a progressão das Divisões 7 a 1.
- Três cards por linha em telas grandes, dois em telas médias, um no celular.
- Campos alinhados, contador de ameaça em uma linha e botão Remover menor.

As permissões permanecem: funcionários criam e editam somente seus registros;
ADMs editam todos e podem excluir. Visitantes não acessam o Bestiário.

Após aplicar o SQL, teste salvar uma criatura com 8 estrelas e habilidades de
cores diferentes. Reabra para confirmar a persistência. Confira também uma
criatura antiga. A migração não foi aplicada ao seu Supabase automaticamente.
