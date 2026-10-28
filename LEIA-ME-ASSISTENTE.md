# Assistente de metas com Gemini

O assistente lê um **resumo da sua semana** (percentuais por dia, taxa por hábito e por categoria, sequência) e conversa sobre como melhorar. A chave do Gemini fica só no servidor da Vercel, na função `api/chat.js`; o navegador nunca vê essa chave.

## Como funciona
1. Você toca na bolinha no canto inferior direito e escreve no painel que abre sobre a tela (ele não troca de página).
2. O app calcula o resumo da semana e envia para `/api/chat` junto com o seu login do Supabase.
3. A função confere o login no Supabase, monta o pedido e chama o Gemini com a sua chave.
4. A resposta volta para o chat.

## O que é enviado ao Gemini
Percentuais dos últimos 7 dias, nomes dos hábitos e categorias, taxa de cada um, sequência atual, quantidade de compromissos de hoje, o primeiro nome e as últimas mensagens da conversa. **Não** são enviados observações dos check-ins, títulos da agenda, e-mail nem amigos.

## Configuração na Vercel
1. A pasta do projeto precisa ter `index.html` e a pasta `api/` (com `chat.js`) na raiz do que você envia à Vercel.
2. Em **Project > Settings > Environment Variables**, confirme a variável **`GEMINI_API_KEY`** com a sua chave (marque Production e, se quiser, Preview). O código também aceita `GOOGLE_API_KEY` e `GOOGLE_GENERATIVE_AI_API_KEY`; se você usou outro nome, renomeie.
3. Opcional: crie **`GEMINI_MODEL`** para trocar o modelo. O padrão é `gemini-flash-latest`, que acompanha o modelo Flash atual do Google, e o servidor tenta outros nomes se um deles for aposentado (o `gemini-2.5-flash` já retornou erro 404 em 2026). Se quiser fixar um modelo, veja os nomes atuais no Google AI Studio e coloque aqui.
4. Faça um **novo deploy** (Deployments > Redeploy). Variáveis novas só valem em deploys feitos depois delas.
5. No Supabase, em **Authentication > URL Configuration**, inclua o endereço do seu site da Vercel em Site URL e Redirect URLs.
6. Abra o site da Vercel, entre na conta e toque na bolinha do canto inferior direito. Ela só aparece depois do login na nuvem.

## Se der erro
| Mensagem ou sintoma | Causa provável |
|---|---|
| A bolinha não aparece | O app não está usando o Supabase (falta o `config.js`) ou você ainda não entrou na conta |
| 404 em `/api/chat` | A pasta `api/` não foi enviada ou o diretório raiz do projeto na Vercel está errado |
| "A chave do Gemini não está configurada no servidor" | Variável ausente, com outro nome, ou falta redeploy |
| "O Google recusou a chave…" | Chave errada, com aspas ou espaços, ou restrita; confira `GEMINI_API_KEY` e faça novo deploy |
| "Nenhum modelo do Gemini respondeu…" | Os nomes de modelo foram aposentados; defina `GEMINI_MODEL` com um modelo atual |
| "Não consegui falar com o Gemini." | Veja o texto entre parênteses que vem logo abaixo: ele traz o código e a mensagem do Google (a chave nunca aparece) |
| "Sua sessão expirou" | Saia e entre de novo |
| "Muitas mensagens em pouco tempo" | Limite de 20 mensagens por 10 minutos por pessoa |

## Segurança e custo
- Só quem está logado no Supabase consegue usar. Isso evita que outras pessoas gastem a sua cota.
- O limite de 20 mensagens por 10 minutos é uma proteção básica, que vale por instância do servidor.
- O uso do Gemini tem limites e preços definidos pelo Google; acompanhe no Google AI Studio.
- Nunca coloque a chave do Gemini em arquivos do navegador (`config.js`, `app.js` etc.) nem no GitHub.

## Diagnóstico rápido
Abra `https://SEU-SITE.vercel.app/api/chat?diag=1`. A página mostra se a chave foi encontrada, com qual nome de variável, se o formato parece correto (chaves do Google começam com `AIza`) e quais modelos serão tentados. Ela nunca mostra a chave.
