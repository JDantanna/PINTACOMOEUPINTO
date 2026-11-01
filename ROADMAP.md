# Direção do produto

O objetivo é um plugin/painel encaixável dentro do Photoshop, inspirado no funcionamento do [Brusherator](https://kritskiy.gumroad.com/l/brusherator), com identidade própria.

## Base existente — MVP 0.1

- Cadastro, edição, exclusão, ordenação e filtros de presets.
- Nome e ícone personalizáveis; configurações de tamanho, cor, opacidade e flow.
- Biblioteca persistente por ambiente e backup/importação em JSON.
- Adaptadores separados para CEP/ExtendScript (alvo Photoshop 2020) e UXP (alvo Photoshop 23.3+).
- Demonstração no navegador e testes automatizados com chamadas Adobe simuladas.

O painel ainda não foi carregado e validado dentro do Photoshop. Atualmente usa a ponta selecionada; não recupera um pincel específico pelo botão.

## Próximas etapas — ainda não implementadas

1. Carregar o plugin no Photoshop e validar a aplicação de um preset completo em documento de teste.
2. Vincular cada botão a um pincel/preset específico e definir como recuperar essa referência entre sessões.
3. Capturar a ferramenta atual para criar ou atualizar um botão no painel.
4. Evoluir a lista atual para um painel visual compacto, com miniaturas, grupos e abas.
5. Adicionar movimentação e redimensionamento de botões em modo de edição.
6. Validar persistência, ações e falhas reais separadamente em CEP e UXP.
7. Preparar distribuição e instalação depois da validação nas versões-alvo.

## Fluxo desejado

O usuário seleciona um pincel no Photoshop, define 8 px, preto, opacidade 100% e flow 70%, e adiciona um botão chamado “Traço”. Mais tarde, um clique no botão deve recuperar o pincel e todas essas configurações.

## Critério de compatibilidade

Alvo declarado no manifesto não equivale a compatibilidade testada. Registrar versão completa, sistema, passos e evidências em `VALIDATION.md` antes de afirmar suporte.
