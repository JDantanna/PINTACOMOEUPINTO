# PKP 0.13.0

## UX/UI
Referência: https://developer.adobe.com/photoshop/uxp/2022/design/ux-patterns/designingforphotoshop — painel redimensionável, tema do host, foco e operações não bloqueantes. Aplicados: feedback de sucesso visível e temporário, controles de 28px, contraste de ícones em tema claro, imagens ocupando a área do botão, acesso ao menu do botão por Shift+F10, fechamento com Escape, formulários compactos e nomes respeitando a preferência do usuário. Preservados nome/logo, captura com + e disposição livre.

## Backup
Configurações > Backup e biblioteca > Salvar backup / Restaurar backup. Seletor nativo de arquivos CEP/UXP. Validação antes de importar, resumo da quantidade de botões/abas e confirmação de substituição. A biblioteca anterior é salva localmente antes da restauração; Recuperar biblioteca anterior apresenta a mesma prévia. Se essa cópia não puder ser gravada, a restauração é interrompida. Exportação textual fica em detalhes avançados. O arquivo inclui biblioteca e imagens; recursos nativos do Photoshop (ABR, ações e predefinições internas) continuam dependências externas.

## Miniaturas
Botão direito em um pincel > área Miniatura do pincel: cole imagem/recorte da miniatura do Photoshop com Ctrl+V, ou importe PNG/JPEG/WebP. A imagem é validada, limitada a 250KB e persistida ao salvar aparência. Para reproduzir a miniatura exata, o recorte é feito pelo usuário. Não foi implementada extração automática da miniatura interna do Photoshop; não confundir com o preview aproximado do traço.

## Validação
44 testes automatizados passaram, incluindo cancelamento do seletor de backup, leitura UTF8, fechamento de arquivo em erro e persistência de imagens. Prévia/cancelamento de restauração conferidos na demonstração em navegador. Não houve nova validação nativa das interfaces de arquivo/clipboard no Photoshop. Setup 0.13.0 passou na extração, instalação e reinstalação simuladas dos 27 arquivos com hashes conferidos.
