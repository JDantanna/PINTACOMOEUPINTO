# Registro de validação

| Ambiente | Resultado |
| --- | --- |
| Node.js 24 / testes automatizados | 17 aprovados: biblioteca/migração, persistência, captura e restauração simuladas, tema não incluso, erros e integração CEP/UXP mockada. `node --test tests/core.test.cjs tests/host.test.cjs tests/panel.test.cjs` |
| Navegador local / modo demonstração | Painel carregou; criação de botão manual com 37 px, `#e74c3c`, opacidade 63% e flow 41% apareceu na biblioteca. Ativação informa que é simulação. Conferido visualmente a 320 px de largura. |
| Photoshop 2020 / CEP / Windows | Não testado. |
| Photoshop 2024 25.12 / UXP / Windows | Arquivos UXP foram copiados anteriormente para `C:\Program Files\Adobe\Adobe Photoshop 2024\Plug-ins\Pinta-Presets`; a versão nova usa o nome PINTACOMEUPINTO. Reconhecimento, atualização visual e carregamento por UXP Developer Tool ainda não confirmados. |
| UXP e CEP nativos | Capturar/restaurar `currentToolOptions`, aplicação de cor e persistência local ainda precisam do roteiro no host. |
| Photoshop / macOS | Não testado. |

## Roteiro de teste no host

1. Registre Photoshop completo, SO e runtime. Carregue UXP pelo UXP Developer Tool; teste CEP separadamente no Photoshop 2020.
2. Configure um pincel (ex.: 37 px, cor `#336699`, opacidade 42%, flow 23%, dureza/spacing à escolha). Clique **Salvar estado atual**, nomeie e salve o botão.
3. Altere ferramenta, cor e valores; clique no botão salvo. Compare todas as opções, inclusive dureza, espaçamento, dinâmica e cor.
4. Repita com borracha; confira modo, tamanho, opacidade e flow sem alterar a cor do primeiro plano.
5. Teste persistência após reabrir painel/Photoshop, editar/excluir/undo e backup/importação.
6. Teste ação instalada com nomes contendo espaços e acentos. Teste documento ausente e descritor inválido.
7. Faça os testes que modificam o documento em uma cópia descartável. Registre erros e qualquer aplicação parcial.

Não substituir “não testado” sem abrir a extensão dentro do Photoshop e conferir os valores nativos.
