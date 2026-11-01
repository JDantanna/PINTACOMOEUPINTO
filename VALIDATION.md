# Registro de validação

| Ambiente | Resultado |
| --- | --- |
| Node.js 24.22.1 / testes de unidade e adaptadores simulados | 7 testes passaram; `node --test tests/core.test.cjs tests/host.test.cjs` |
| Photoshop 2020 / CEP 9 / Windows | Não testado |
| Photoshop 23.3+ / UXP / Windows | Não testado |
| Photoshop / macOS | Não testado; instalação CEP macOS fora do escopo |
| Interface em runtime UXP / Chromium CEP | Não testado |
| Interface em navegador IAB / modo demonstração | Criar, editar, ordenar, recarregar, excluir, exportar/importar, rejeitar JSON inválido, escolher ícone, filtrar ações e ativar ação simulada: aprovados. Sem overflow horizontal nas larguras 260 e 320 px |
| Tentativa de teste ExtendScript no Photoshop 2024 aberto | Não executado: captura da interface nativa falhou com `FrameArrived timed out`; nenhum documento de teste foi criado |

Para cada teste manual, anotar data, versão completa, SO, passos do README, resultado observado e evidência. Não substituir “não testado” sem execução real no aplicativo.
