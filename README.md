# Pinta • Presets — MVP 0.1

Painel compacto, em português, para configurar pincel e borracha ou executar uma ação já instalada. Inclui criar, editar, excluir, escolher ícones, mover para cima/baixo, filtrar e backup/importação em JSON. Sem dependências de terceiros ou etapa de compilação.

Este repositório contém o protótipo inicial. A direção é um painel visual modular inspirado no Brusherator; veja [as próximas etapas](ROADMAP.md). A demonstração no navegador não comprova funcionamento dentro do Photoshop.

## Experimentar a interface

Requer Node.js 18 ou superior. Execute `node scripts/preview.cjs` e abra http://127.0.0.1:4173. A interface informa **DEMONSTRAÇÃO**: ativar um botão só simula a operação. Execute `node --test tests/*.test.cjs` para os testes automatizados. Se npm estiver instalado, os atalhos `npm run preview` e `npm test` também funcionam.

## Instalar para desenvolvimento

### UXP — alvo Photoshop 23.3 ou superior

1. Instale o UXP Developer Tool da Adobe e habilite o modo de desenvolvimento de plugins nas preferências do Photoshop, conforme sua versão.
2. No UXP Developer Tool, use **Add Plugin** e escolha o `manifest.json` desta pasta.
3. Com o Photoshop aberto, use **Load** e abra o painel Pinta pelo menu Plugins.
4. Abra um documento de teste e confira o rótulo **UXP** no painel.

O manifesto v5 declara API 2 e mínimo 23.3. O adaptador usa `executeAsModal` e `batchPlay`, verificando erros a cada comando. Isso é um alvo de implementação, não certificação de todas as versões a partir de 23.3. Photoshop 22.x e 23.0–23.2 não são alvo desta edição.

### CEP — alvo Photoshop 2020 / versão 21.x, Windows

1. Copie a pasta do projeto para `%APPDATA%\Adobe\CEP\extensions\br.pinta.panel` (o arquivo `CSXS\manifest.xml` deve ficar dentro dela).
2. Este protótipo não está assinado. Para carregamento local de desenvolvimento, configure a string `PlayerDebugMode` com valor `1` em `HKEY_CURRENT_USER\Software\Adobe\CSXS.9`. Isso habilita extensões não assinadas nesse runtime; restaure a configuração quando terminar os testes.
3. Reinicie o Photoshop 2020. Abra **Janela > Extensões > Pinta Presets** e confirme o rótulo **CEP**. Os nomes de menu variam com o idioma.
4. Abra um documento de teste e execute o roteiro abaixo.

CEP usa Chromium e ExtendScript síncrono por `evalScript`; UXP usa seu próprio runtime e APIs assíncronas sob escopo modal. Por isso há dois manifestos/adaptadores. O manifesto CEP limita deliberadamente o host a 21.x; não declara suporte genérico a versões recentes. Não há instalador nem pacote assinado neste MVP.

## Uso e limites

- **Pincel:** seleciona o pincel e aplica tamanho, opacidade, flow e cor de primeiro plano RGB. **Borracha:** seleciona a borracha e aplica tamanho, opacidade e flow; não altera a cor de primeiro plano.
- O MVP usa a ponta atual; dureza, modo de mistura e pressão da caneta não são configurados pelo painel. A preservação desses valores também precisa ser conferida no host. O MVP configura ferramentas existentes; não cria arquivos `.abr` nem captura a ponta atual. Borracha deve ser testada em modo Pincel, com camada raster desbloqueada.
- **Ação:** informe nome exato da ação e do conjunto já presentes no painel Ações do Photoshop. O botão executa uma ação; sequências podem ser gravadas no próprio Photoshop. Não há execução de scripts arbitrários nem editor de ações.
- Exclusão é imediata. Gere um backup antes de excluir ou importar. Importar substitui a lista, preservando a ordem do arquivo. O texto é validado antes da gravação.
- Presets persistem em `localStorage`, por ambiente de execução. CEP, UXP e navegador têm bibliotecas independentes; transfira pelo texto de backup. Desinstalar ou limpar dados do plugin pode apagar a biblioteca.
- Um erro de armazenamento não sobrescreve os dados anteriores. Na falha de leitura inicial o painel bloqueia a edição; é necessário recuperar o armazenamento do runtime antes de recarregar.
- Um preset aplica múltiplos comandos. Se algum falhar, anteriores podem ter sido aplicados. Não existe transação ou rollback; confira a barra de ferramentas e use um documento descartável nos testes. Ações podem alterar documentos e exibir diálogos.
- O botão de ativação fica bloqueado durante a chamada. Em CEP o timeout de 30 segundos não cancela uma ação que continua no Photoshop; confira seu término antes de repetir.

## Arquitetura

`src/core.js`: schema versionado, validação, operações de biblioteca e descritores independentes do host. `src/ui.js`: interface compartilhada, sem HTML dinâmico derivado de nomes do usuário. `src/host.js`: detecção de ambiente, simulação e adaptadores de comunicação. `host/cep.jsx`: implementação ES3 no Photoshop 2020. `index.html` e `style.css`: painel compartilhado. Sem acesso à rede.

## Validação e compatibilidade

Testes automatizados cobrem CRUD, reordenação, recarga, biblioteca vazia, falhas de gravação, dados corrompidos, validação/importação, descritores, escopo modal, interrupção em erro e serialização segura do bridge CEP. Chamadas Adobe são simuladas nesses testes; eles não comprovam que o Photoshop aceita os descritores nem que o DOM UXP renderiza a interface como o navegador.

**Nenhuma versão do Photoshop foi validada neste ambiente.** UI, descritores Action Manager e persistência real de cada runtime exigem o roteiro manual. Não se afirma compatibilidade testada com Photoshop 2020 ou versões atuais.

### Roteiro de aceitação no host

Registre versão completa do Photoshop, sistema, runtime e resultado em `VALIDATION.md`.

1. Abrir painel com largura 260 e 320 px; confirmar campos acessíveis, rolagem e ausência de cortes.
2. Criar pincel 37 px, cor #336699, opacidade 42%, flow 23%. Ativar e conferir **cada valor** na barra de opções/cor; pintar no documento e registrar evidência.
3. Em camada raster desbloqueada, configurar borracha em modo Pincel. Criar preset 51 px / 67% / 31%, ativar e conferir valores e apagamento. Confirmar cor de primeiro plano preservada.
4. Criar conjunto/ação com nomes contendo espaços e acentos, com um passo reversível. Executar e verificar resultado; testar nome inexistente e conferir erro visível.
5. Editar, reordenar, filtrar e excluir. Fechar/reabrir painel e reiniciar Photoshop; confirmar valores e ordem. Excluir todos e reabrir: a lista continua vazia.
6. Exportar backup, alterar biblioteca e importar. Comparar todos os dados. Tentar JSON inválido e IDs repetidos: biblioteca permanece intacta.
7. Sem documento e com Photoshop ocupado/modal, ativar e verificar erro. Repetir após liberar o aplicativo. Conferir estado parcial quando um comando falhar.

## Referências oficiais consultadas

- [Opções de extensibilidade e versões](https://developer.adobe.com/photoshop/): Photoshop 2020 (v21) usa CEP/ExtendScript; UXP começa em v22.
- [Manifesto UXP v5](https://developer.adobe.com/photoshop/uxp/2022/guides/uxp-guide/uxp-misc/manifest-v5/): mínimo 23.3 neste MVP.
- [Escopo modal](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/media/executeasmodal/) e [batchPlay](https://developer.adobe.com/photoshop/uxp/2022/ps-reference/media/batchplay/).
- [CEP Resources da Adobe](https://github.com/Adobe-CEP/CEP-Resources): versões do runtime, manifesto e configuração de desenvolvimento.
- [Exemplo original de configuração de pincel de Tom Ruark](https://github.com/TomRuark/JavaScripts/blob/master/SetPaintBrushOpacityAndOthers.jsx): referência de Action Manager; não substitui teste na versão-alvo.
- [Transição CEP/UXP](https://helpx.adobe.com/creative-cloud/apps/integration-with-other-apps/manage-plugins/cep-uxp-plugin-transition.html): CEP é uma solução legada com retirada planejada; UXP é o caminho para evolução. Consulte a Adobe antes de planejar distribuição comercial.
