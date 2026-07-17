# Crisma Digital - Passaporte & Check-in

Este é um aplicativo web completo, responsivo e altamente refinado para gerenciar check-ins de alunos do Crisma em diferentes salas/localizações por meio de leitura de QR Code, integrando de forma bidirecional e em tempo real com uma planilha do Google Sheets.

Desenvolvido em **React**, **TypeScript** e **Tailwind CSS**, o aplicativo possui um visual moderno estilo "Bilhete de Embarque" (Wallet Boarding Pass) e conta com um fluxo robusto offline-first.

---

## 🚀 Funcionalidades Principais

1. **Passaporte Digital (Estilo Boarding Pass)**: Cada aluno tem seu bilhete personalizado contendo Nome, Número/ID, progresso de salas concluídas, slots para carimbos visuais e um QR Code dinâmico.
2. **Leitura de QR Code via Câmera**: Os catequistas podem ativar a câmera do celular para ler o QR Code do passaporte impresso do aluno.
   - **Check-in Automático**: Ao selecionar a localização ativa no scanner (ex: "Capela"), o escaneamento do QR Code realiza o check-in instantâneo daquele aluno na sala correspondente e exibe uma animação com chuva de confetes!
3. **Painel Geral (Dashboard)**:
   - Estatísticas gerais em formato bento-grid (Média de carimbos, salas mais visitadas, progresso de preenchimento).
   - Tabela interativa para busca rápida de alunos e marcação manual de check-ins diretamente nas células da tabela.
   - Gráfico de preenchimento e presença por sala.
4. **Geração e Impressão de Bilhetes em Lote**: Permite selecionar múltiplos crismandos e gerar um documento de impressão otimizado com linhas de corte para facilitar a distribuição física.
5. **Certificado Digital de Conclusão**: Ao concluir todas as salas, o crismando desbloqueia um certificado espiritual exclusivo pronto para salvar ou imprimir.
6. **Modo Aluno Autônomo**: Se o aplicativo for acessado passando a query string com o ID do aluno (ex: `/?id=101`), ele abre **bloqueado exclusivamente na visualização do passaporte daquele aluno**, permitindo que ele acompanhe seus carimbos com segurança, sem expor o painel dos catequistas.

---

## 📊 Integração com Google Sheets

A planilha padrão do projeto está configurada em:
`https://docs.google.com/spreadsheets/d/1Li7P6qPJIRJRo-P59j3PXA5VRgAkxqDIABx1D1rcGXs/edit?usp=sharing`

### Como funciona a sincronização?
- **Leitura Pública**: O aplicativo baixa os dados de alunos e salas instantaneamente através do formato público de exportação CSV da planilha. O app abre de imediato, funcionando mesmo sem login prévio.
- **Gravação Segura**: Para alterar dados na planilha online, o catequista/coordenador faz login com sua conta Google pelo botão **"Conectar Planilha"** no canto superior direito. Ao realizar check-ins, o app atualiza em tempo real as células exatas da planilha usando a API segura do Google Sheets.
- **Sincronização Local (Offline-first)**: Caso esteja offline ou sem conexão, as marcações são mantidas no cache local (`localStorage`) e mostradas de forma instantânea para não travar o evento.

---

## 💻 Como Rodar o Projeto Localmente

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Abra `http://localhost:3000` no seu navegador.

---

## 📦 Como Publicar no GitHub Pages

O aplicativo está 100% pronto para ser hospedado no **GitHub Pages** de forma totalmente estática e gratuita!

1. No terminal, compile a aplicação para produção:
   ```bash
   npm run build
   ```
   Isso gerará a pasta `dist` contendo o código HTML, CSS e JavaScript estático compilado.

2. Você pode usar o pacote `gh-pages` para publicar rapidamente:
   ```bash
   # Instale o utilitário gh-pages
   npm install -D gh-pages
   
   # Publique a pasta dist diretamente para o ramo gh-pages do seu GitHub
   npx gh-pages -d dist
   ```

3. Configure nas configurações do repositório no GitHub para ler do ramo `gh-pages`. O aplicativo estará acessível no link fornecido pelo GitHub!

---

## 🛠️ Como Usar sua Própria Planilha

Se quiser trocar de planilha:
1. Crie uma planilha no Google Sheets com as seguintes colunas obrigatórias:
   - **Coluna A**: `Nome do aluno`
   - **Coluna B**: `Número` (deve ser um ID único, ex: 101, 102, 103...)
   - **Colunas C em diante**: Digite o nome dos locais (ex: `Capela`, `Auditório`, `Sala 1`, etc.). Você pode adicionar quantas salas desejar!
2. No arquivo `src/App.tsx`, altere a constante do ID da planilha:
   ```typescript
   const [spreadsheetId] = useState('INSIRA_O_ID_DA_SUA_PLANILHA_AQUI');
   ```
3. Lembre-se de publicar a planilha na web em **Arquivo > Compartilhar > Publicar na Web** para habilitar a leitura instantânea sem login.
