# MetaView como aplicativo

Há dois caminhos. O primeiro é o mais simples e já está pronto.

## 1. App instalável (PWA)

O app abre em tela cheia, tem ícone próprio e funciona offline depois da primeira visita.

**Requisito:** os arquivos precisam estar em um endereço **HTTPS**. Em `localhost` (Live Server) também funciona, mas só no computador.

1. Publique a pasta em uma hospedagem gratuita com HTTPS (por exemplo Netlify Drop, GitHub Pages ou Vercel).
2. No celular, abra `https://SEU-ENDERECO/mobile.html`.
3. **Android (Chrome):** menu ⋮ > "Instalar app" ou "Adicionar à tela inicial".
4. **iPhone (Safari):** botão Compartilhar > "Adicionar à Tela de Início".

Os nomes dos menus podem variar conforme a versão do navegador.

**Atualizar o app:** ao mudar qualquer arquivo, troque `metaview-v1` por `metaview-v2` (e assim por diante) no topo do `sw.js`. Sem isso, quem já instalou continua vendo a versão antiga.

## 2. App nativo (Android/iOS) com Capacitor

Gera um projeto nativo usando os mesmos arquivos.

**Requisitos:** Node.js; Android Studio (para Android); um Mac com Xcode (para iOS).

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android      # só na primeira vez
npm run android          # copia os arquivos para www/ e abre o Android Studio
```

No Android Studio, rode no emulador ou em um celular com cabo. Para gerar o arquivo de instalação, use Build > Generate Signed Bundle / APK.

Para iOS, instale também `@capacitor/ios`, rode `npx cap add ios` e depois `npm run ios`.

**Observações**
- Esta estrutura não foi compilada nem testada em um aparelho.
- Dentro do app nativo as fontes do Google não carregam offline; o app usa as fontes de reserva do sistema.
- Contas e dados continuam salvos no próprio aparelho. Para acessar de vários aparelhos é preciso um banco na nuvem (Supabase).
