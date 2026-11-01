# Próximas etapas

## Feito no protótipo 0.2

- Painel enxuto com cores responsivas ao tema do Photoshop (variáveis UXP oficiais e leitura do tema CEP).
- Fluxo principal explícito: configurar pincel/borracha no Photoshop → **Salvar estado atual** → nomear → reativar com clique.
- Captura UXP/CEP de tamanho, cor (pincel), opacidade, flow e opções `currentToolOptions` serializadas.
- Botões manuais, aparência/ícone/miniatura própria, ações existentes, ferramentas e comandos permitidos.
- Abas, busca e filtro; edição, duplicação, exclusão, movimentação, redimensionamento e alinhamento; backup/importação e desfazer.
- 17 testes automatizados do core e adaptadores simulados.

## Próximo: provar no Photoshop

1. Carregar a edição UXP com UXP Developer Tool no Photoshop 2024 e confirmar que o painel abre com tema correto.
2. Capturar uma ferramenta e reativar o botão; conferir no Photoshop todas as opções, incluindo espaçamento, dureza, dinâmica e cor.
3. Repetir com borracha e confirmar quais opções são restauradas/compartilhadas.
4. Conferir `localStorage` após fechar e reabrir painel/Photoshop, além de importação/exportação.
5. Testar a edição CEP separadamente no Photoshop 2020 21.x. Confirmar serialização `ActionDescriptor.toStream()/fromStream()` e diferenças entre ferramentas.
6. Atualizar `VALIDATION.md` com a versão completa do host e evidências observadas.

## Produto após o teste nativo

- Ajustar descritores apenas com dados registrados pelo Photoshop e suportados pela versão testada.
- Gerar ícones/miniaturas a partir do conteúdo do usuário sem imitar nem redistribuir arquivos do Brusherator.
- Avaliar descoberta de presets instalados, atualização de preset existente e atalhos de teclado.
- Planejar migração e distribuição UXP; CEP fica limitado ao legado necessário para Photoshop 2020.

## Critério de compatibilidade

Manifesto e teste simulado são alvos de desenvolvimento, não prova de suporte. Registrar versão completa, sistema, passos e evidência por runtime antes de declarar compatibilidade.
