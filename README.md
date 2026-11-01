# PINTACOMEUPINTO

Painel modular para Photoshop inspirado no fluxo do Brusherator: configure uma ferramenta no Photoshop, capture seu estado e salve como um botão. Um clique posterior seleciona a ferramenta e tenta restaurar as opções registradas.

## Fluxo principal

1. No Photoshop, escolha o pincel ou a borracha e ajuste as opções que deseja guardar.
2. No painel **PINTACOMEUPINTO**, clique **Salvar estado atual**.
3. Dê um nome ao atalho e salve. O botão guarda tamanho, cor de primeiro plano, opacidade, flow e o descritor completo de opções que o Photoshop devolver.
4. Clique no botão para reaplicar a captura. O resultado ainda precisa ser conferido na versão do Photoshop usada: os descritores Action Manager variam por ferramenta e versão, e pincéis/recursos externos precisam continuar instalados.

O painel também permite criar presets manualmente, configurar ações já instaladas, organizar botões em abas, editar, duplicar, excluir, mover e redimensionar, além de exportar/importar a biblioteca. A captura nativa aceita pincel e borracha. A simulação de navegador não acessa o Photoshop.

## Experimentar e validar

Requer Node.js 18 ou superior.

- `node scripts/preview.cjs` inicia a demonstração local em `http://127.0.0.1:4173`.
- `node --test tests/*.test.cjs` executa a suíte automatizada.
- `node scripts/build-uxp.cjs` prepara os arquivos UXP em `dist/photoshop2024/PINTACOMEUPINTO`.

Na demonstração, **Salvar estado atual** não captura nada do Photoshop; use **+ Botão** para exercitar a biblioteca. Os testes simulam as respostas Adobe e não comprovam a execução nativa.

## Photoshop e compatibilidade

### Photoshop 2024 e versões UXP

O manifesto UXP declara mínimo Photoshop 23.3, API 2. O alvo local é Photoshop 2024 25.12. Para desenvolvimento, carregue o `manifest.json` pelo UXP Developer Tool da Adobe, abra o painel em **Plugins** e faça o teste manual abaixo. Copiar os arquivos para `Plug-ins` não comprova que o Photoshop reconheceu ou carregou a extensão.

UXP usa `executeAsModal` e `batchPlay`. Para alinhar o painel ao host, o CSS utiliza as variáveis de tema fornecidas pelo Photoshop. A captura serializa `currentToolOptions`; seu ciclo de leitura e reaplicação precisa ser validado no host.

### Photoshop 2020

Photoshop 2020 (21.x) requer a edição CEP/ExtendScript, separada da UXP. O manifesto CEP limita o host a 21.x; ele não declara suporte a versões atuais. O adaptador usa Action Manager para ler/restaurar `currentToolOptions` e CEP para aplicar as cores do tema. Isso é uma implementação experimental, ainda sem validação no Photoshop 2020.

Não alegamos compatibilidade testada com Photoshop 2020, 2024 ou outras versões enquanto os roteiros de cada host não forem executados e registrados em [VALIDATION.md](VALIDATION.md). Consulte também [ROADMAP.md](ROADMAP.md).

## Limites do protótipo

- Capturar/restaurar opções depende de descritores do Photoshop e precisa de teste real. Um clique pode falhar se o Photoshop não aceitar um descritor ou se o recurso do pincel não estiver instalado.
- Uma aplicação contém vários comandos; se um falhar, os anteriores podem já ter sido executados. Não há rollback automático. Teste em documento descartável.
- Ação salva referencia nomes de uma ação e de seu conjunto já existentes no painel Ações. Não executa scripts arbitrários.
- A biblioteca persiste por runtime em `localStorage`; CEP, UXP e navegador têm bibliotecas distintas. Use backup JSON para transferir botões. Arquivos `.abr`, ações e recursos do Photoshop não vão no backup.
- Miniatura de traço é ilustrativa, não uma amostra real de tinta. O painel não cria arquivos de pincel.
- APIs de pincel e opções variam entre UXP, CEP e versões do Photoshop. UXP começa a partir das versões suportadas pela Adobe; CEP é um caminho legado.

## Estrutura

- `src/core.js`: biblioteca, validação, captura serializada e descritores comuns.
- `src/ui.js`, `index.html`, `style.css`: painel e interação compartilhados.
- `src/host.js`: implementação UXP, comunicação CEP e demonstração.
- `host/cep.jsx`: adaptador ExtendScript para Photoshop 2020.
- `CSXS/manifest.xml`: registro CEP, separado do manifesto UXP.
- `tests/`: testes automatizados com serviços Adobe simulados.

Veja o registro de versões e resultados em [VALIDATION.md](VALIDATION.md).
