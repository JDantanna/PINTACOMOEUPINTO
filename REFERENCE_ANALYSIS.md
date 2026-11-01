# Análise do Brusherator fornecido

## Fonte e limites da inspeção

Arquivo analisado: `FreePsdVn.com_2202489_PLUGIN_brusherator_for_photoshop_cc_1098203.zip` (SHA-256 `55233cf2d3f0c4f788423f2add73a26b4026307d9a5070bee6560fa2ddcc2b5e`). O pacote contém versões Brusherator, Brusherator Plus, Previewrator, ZXP assinado, manual PDF de três páginas e scripts JSX auxiliares.

O manual identifica a versão 1.2, de 5 de dezembro de 2016, e descreve instalação CEP e scripts de apoio para versões antigas do Photoshop. Isso explica a referência visual/comportamental, mas não comprova suporte em versões atuais.

Os arquivos JavaScript de interface e CSS puderam ser lidos. O `hostscript.jsx` principal começa com `@JSXBIN@ES@2.0`: é código compilado do ExtendScript e não foi executado nem descompilado. Assim, as chamadas e o fluxo observáveis na interface foram identificados; detalhes internos das operações nativas do Brusherator não podem ser afirmados fielmente apenas com esse material.

## Comportamentos observáveis

- Painel CEP encaixável com área de botões em posições livres. Há modo de edição para mover botões numa grade de 5 px e redimensionar botões com imagens; seleção múltipla permite mover/copiar em grupo.
- Abas/prateleiras independentes, transferência de botões, adicionar e gerenciar prateleiras.
- Botões podem representar ferramentas/predefinições, texto, imagem/miniatura e ações. O código visível registra identificador do elemento, nome de preset, tipo, coordenadas, cor, dimensão da imagem e proporção.
- O menu e a interface mostram captura “da ferramenta atual”, inclusão de imagem e comandos de contexto. Um botão pode ser editado, atualizado com o preset corrente, duplicado/transferido e excluído.
- Opções visíveis incluem preservar tamanho do pincel, mostrar nomes em miniaturas, ocultar o painel após clique, realçar o botão corrente e mostrar abas. O tema acompanha a aparência do Photoshop.
- A interface conversa com ExtendScript por CEP, grava preferências e miniaturas na pasta de dados do usuário e escuta eventos para pré-visualização em um painel complementar.
- Brusherator Plus contém o mesmo `js/main.js` e `jsx/hostscript.jsx` do painel principal, mas usa outro identificador de extensão e outras chaves de preferência. Previewrator é uma extensão separada para pré-visualização; não é a área principal de botões.
- O código legível expõe funções host como `newB`, `editButton`, `eraseMe`, `readBrushes`, `updatePreset`, `cutCopy` e `makeNewList`. Suas implementações ficam, em parte, no JSXBIN, portanto os nomes não bastam para reconstruir a lógica interna.

## Como isso orientou PINTACOMEUPINTO 0.2

O objetivo confirmado pelo usuário é criar um atalho visual reutilizável para o estado exato da ferramenta: configurar pincel/borracha no Photoshop, capturar e nomear, e reaplicar pelo clique. Essa captura é diferente de um formulário que apenas guarda tamanho, cor, opacidade e flow; ela também precisa guardar opções adicionais que o Photoshop fornece.

O protótipo implementa o ciclo com **Salvar estado atual**, que lê `currentToolOptions`, valores de tamanho/opacidade/flow, cor frontal no pincel e serializa o descritor retornado pelo host. Ao ativar, seleciona a ferramenta, restaura as opções capturadas e reaplica os valores explícitos. CEP serializa ActionDescriptor como stream; UXP guarda actionJSON. O suporte efetivo desses descritores precisa ser confirmado em cada versão no Photoshop real.

A interface foi compactada e usa o tema do host: variáveis oficiais de tema UXP e dados de skin/evento no CEP. A área modular oferece abas, busca, filtros, edição, duplicação, exclusão, seleção múltipla, arraste, redimensionamento, alinhamento, cópia/transferência e backup. Na tela compacta, o atalho aparece como botão visual dentro do painel.

## Diferenças e itens ainda pendentes

| Brusherator observado | PINTACOMEUPINTO 0.2 |
| --- | --- |
| Interface de painel CEP antiga, grade de movimento/redimensionamento de 5 px | Tema responsivo UXP/CEP, grade de 8 px; aparência e gestos precisam de conferência dentro do Photoshop |
| Botões e abas em organização livre | Implementado com edição, abas e biblioteca persistente; ordenação é espacial, não um arranjo em lista |
| Captura/edição de predefinição atual pela interface | Captura serializada implementada nos adaptadores, mas ainda sem validação no host |
| Miniaturas a partir de pincel/preview e painel Previewrator separado | Imagem escolhida pelo usuário e traço ilustrativo; não gera amostra real nem inclui painel Previewrator |
| Extensões e atalhos de contexto/menus próprios do CEP | Conjunto menor de ações, comandos e opções; sem menu de extensão nativo ou atalhos globais |
| Scripts JSX compilados e auxiliares do fornecedor | Nenhum código/asset de fornecedor foi copiado; adaptadores são implementação própria |

A intenção é reproduzir o fluxo e a ergonomia geral, com nome e código próprios, não redistribuir assets nem prometer paridade. A biblioteca atual não importa dados do Brusherator. Compatibilidade Photoshop 2020 segue como alvo separado CEP; versões atuais usam UXP. Consulte o registro de teste em `VALIDATION.md`.
