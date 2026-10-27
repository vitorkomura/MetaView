# Banco de dados na nuvem com Supabase

O Supabase oferece banco Postgres, login de usuários e regras de segurança prontos. Os nomes dos menus podem mudar um pouco com o tempo.

## Passo a passo
1. Crie uma conta em supabase.com e clique em **New project**. Escolha um nome, defina a senha do banco (guarde-a) e a região (South America, São Paulo).
2. Espere o projeto terminar de ser criado (alguns minutos).
3. No menu lateral, abra **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**. Isso cria as tabelas, as regras de segurança e o perfil automático.
4. Confira em **Table Editor** se aparecem `profiles`, `habits`, `daily_logs` e `events`, e se cada uma mostra RLS ativado.
5. Em **Authentication > Providers**, deixe **Email** ativado. Em **Authentication > URL Configuration**, informe o endereço onde o app ficará publicado (necessário para o link de recuperar senha).
6. Em **Project Settings > API**, copie a **Project URL** e a chave **anon / publishable**. São as duas informações que o app vai usar.
7. Me envie a URL e a chave anon para eu ligar o app ao banco (login, hábitos, registros e agenda).

## Regras de ouro
- A chave **anon/publishable** pode ficar no código do app, porque as regras RLS impedem que alguém leia dados de outra pessoa.
- Nunca coloque no app a chave **service_role** nem a senha do banco.
- Nunca desligue o RLS de uma tabela.

## Como o app fala com o banco (exemplo)
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const sb = supabase.createClient("SUA_URL", "SUA_CHAVE_ANON");

  await sb.auth.signUp({ email, password, options: { data: { name } } });
  await sb.auth.signInWithPassword({ email, password });
  await sb.auth.resetPasswordForEmail(email);

  const { data: habitos } = await sb.from("habits").select("*");
  await sb.from("daily_logs").upsert({
    user_id, habit_id, log_date: "2026-10-26", status: "done",
  });
</script>
```

## O que muda no app quando conectar
- Login passa a valer em qualquer aparelho, com recuperação de senha por e-mail.
- Hábitos, registros e agenda ficam na nuvem e acompanham a conta.
- Os dados que hoje estão só neste navegador precisam ser importados uma vez (posso fazer isso na ligação).
- A tela de amigos e as notificações para outros aparelhos passam a ser possíveis com mais tabelas e uma função no servidor.

---

## App já ligado ao seu projeto (modo nuvem)

O `config.js` aponta para o seu projeto e o `cloud.js` faz o login e a sincronização. Para voltar ao modo local (contas só no navegador), apague o conteúdo do `config.js`.

### Como testar
1. Confirme que você rodou o `supabase/schema.sql` (passo 3 acima). Sem isso o app mostra: "As tabelas ainda não existem no Supabase".
2. Abra a pasta no VS Code e rode o **Live Server** em `index.html` ou `mobile.html`. Abrir por `http://localhost` é o jeito mais seguro; evite o duplo clique no arquivo.
3. Crie uma conta. Se o e-mail de confirmação estiver ativado no Supabase, confirme pelo link recebido e depois entre.
4. Faça um check-in e confira no **Table Editor** do Supabase as tabelas `habits` e `daily_logs`.
5. Abra o app em outro navegador ou no celular, entre com a mesma conta e veja os dados chegarem.

### Ajustes no painel do Supabase
- **Authentication > URL Configuration:** em *Site URL* e *Redirect URLs* coloque o endereço onde o app roda (por exemplo `http://localhost:5500` durante os testes e depois o endereço publicado). Sem isso os links de confirmação e de recuperar senha não voltam para o app.
- **Authentication > Providers > Email:** para testar mais rápido você pode desligar *Confirm email*. Em produção, deixe ligado.

### O que sincroniza
Hábitos, registros diários (status), agenda, faixas de cor, dias finalizados e amigos. Observação escrita sem marcar um status no hábito não é enviada.

### Limites
- Excluir a conta de login por completo exige uma função no servidor; o botão do app apaga seus dados da nuvem e sai.
- Este modo só funciona fora do Claude: a página publicada aqui não pode falar com o Supabase.

### Erro "permission denied for table profiles"
Projetos novos do Supabase não liberam as tabelas para usuários logados automaticamente. Rode o arquivo `supabase/fix-permissoes.sql` no SQL Editor (ou rode o `schema.sql` atualizado em um projeto novo) e tente entrar de novo. As regras RLS continuam impedindo que alguém veja dados de outra pessoa.
