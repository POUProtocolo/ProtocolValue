# ProtocolValue — Centralizador privado 2.6

## Português — ativação necessária

Este ZIP **não deve ser enviado ao FileZilla ou copiado para a hospedagem pública**. Ele contém os leitores e a automação do coletor, sem senhas. A página pública está no ZIP separado **Site Completo 2.6**.

### Instalar

1. Crie um **NOVO repositório PRIVADO** no GitHub para a coleta. Não reutilize sem avaliar o repositório público de documentação do ProtocolValue; preserve as identidades do projeto e da documentação.
2. Extraia este ZIP. Envie as pastas `assets/`, `data/`, `scripts/`, `.github/workflows/` e o `.gitignore` à raiz do repositório privado. Pastas iniciadas por ponto precisam ser incluídas; verifique se o workflow existe no branch padrão.
3. Em **Settings → Secrets and variables → Actions**, adicione exatamente quatro segredos: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_REMOTE_DIR`.
   * `FTP_SERVER`: hostname exibido nas credenciais FTP Porkbun (por exemplo `pixie-ss1-ftp.porkbun.com`, **verifique seu próprio painel**).
   * `FTP_USERNAME`: usuário FTP específico do domínio.
   * `FTP_PASSWORD`: senha FTP (não envie pelo chat, ZIP ou repositório).
   * `FTP_REMOTE_DIR`: diretório remoto existente que contém o arquivo `current.json`, tipicamente `/data/live` **se a raiz remota no FileZilla for a raiz do site**. Confirme no painel remoto.
4. No FTP público, publique primeiro o ZIP **Site Completo 2.6**; certifique-se de que `/data/live/current.json` já existe na raiz web. Não sobrescreva o feed com o placeholder em atualizações subsequentes.
5. No GitHub, abra **Actions → ProtocolValue shared on-chain feed → Run workflow**. Verifique o log do job. Ele deve: validar catálogo, consultar RPC, produzir feed e carregar via **FTPS TLS** (sem degradar para FTP sem criptografia). Se o host FTP não suportar FTPS TLS e/ou o comando `mv` remoto, o envio falhará com segurança; confirme o protocolo do host com o suporte Porkbun em vez de desabilitar TLS.
6. Verifique manualmente no navegador `https://protocolvalue.com/data/live/current.json`: `generatedAt`, `records` não vazios, `catalogHash` igual, bloco/hash e tempo recentes. Em seguida abra a página principal e verifique a exibição do estado `LIVE` (<2 min) ou `VERIFIED ON-CHAIN` (até 8 min); nunca chame `VERIFIED` de preço do bloco corrente.
7. Observe os primeiros 3 ciclos e o consumo RPC. Desabilite ou aumente a agenda se houver muitos erros 429 ou consumo de GitHub Actions. O agendamento funciona no branch padrão do repositório e pode sofrer atrasos; por isso o site volta a SNAPSHOT quando envelhece.

### Limitações e segurança

- Sem GitHub Secrets e conexão FTPS, **não há centralização ativa**, apenas a versão do site preparada e a compatibilidade dos leitores diretos.
- GitHub Actions tem intervalo mínimo de 5 min e a cobrança/cotas dependem do plano e da duração efetiva; este modelo é um **piloto**. Para verificação <2 min contínua, será necessário outro executor com intervalo de 1 minuto e custo aferido, sem sacrificar a auditoria.
- O workflow atual reutiliza os adaptadores e as validações completas. **A separação entre leitura de preço e auditoria ampliada ainda não foi implementada**. Evita alteração silenciosa das fórmulas.
- Repositório privado deve acompanhar alterações do catálogo e dos adaptadores do site; se hashes divergirem o feed é ignorado deliberadamente. Não mantenha versões diferentes.
- O arquivo de feed é público e verificável, mas não é prova criptográfica; bloco, contrato, método e cálculo continuam conferíveis em exploradores.
- Não habilite ações FTP com `delete`, `mirror` ou `--delete` que possam apagar páginas SEO, arquivos bilíngues ou JSONs. Este workflow envia **somente** `current.json`.

## English

Keep this runner in a **private repository**, completely separate from the public documentation repo and the website deployment folder. Configure four GitHub Actions secrets (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_REMOTE_DIR`) and run the workflow manually before relying on the minimum five-minute schedule. Only the shared JSON feed is published through enforced TLS and a remote rename; all SEO pages and catalog evidence remain untouched. Scheduled jobs can be delayed and usage may be billable. The collector reuses the existing expensive validations; price-only audit separation remains a future, independently tested phase.
