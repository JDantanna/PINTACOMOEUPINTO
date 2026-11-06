# Instalador PKP para Windows

Arquivo: PKP-Setup-0.12.0.exe. Pacote offline, 27 arquivos, sem download de dependências e sem necessidade de Creative Cloud Desktop. Usa o .NET Framework disponível no Windows 10/11.

Uso: abrir o setup, marcar a opção para permitir extensões locais e clicar em Instalar PKP. Após concluir, reiniciar o Photoshop e abrir Janela > Extensões (legado) > PKP. O painel é instalado em AppData do usuário automaticamente; não requer administrador. Se já existir, os arquivos do painel são substituídos. A biblioteca de botões não é alterada.

A edição CEP é não assinada. O consentimento no instalador habilita PlayerDebugMode nos runtimes CSXS 9 a 12 do usuário; essa configuração permite carregar extensões locais não assinadas, não apenas o PKP. A versão instalada tem manifesto para Photoshop 2020–2024; o caminho de ferramentas foi testado no Photoshop 2024, não em todas essas versões.

Validação: executável compilado e executado com /verify, código de saída 0; extração, instalação e reinstalação em pasta temporária, com hashes dos 27 arquivos conferidos. O modo de teste não altera registro ou instalação real. A instalação pela interface ainda não foi testada ponta a ponta. O executável não possui assinatura Authenticode.
