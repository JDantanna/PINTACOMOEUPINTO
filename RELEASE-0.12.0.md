# PKP 0.12.0

Configurações > Atualizar pelo GitHub consulta releases/cep-latest.json no repositório público JDantanna/PINTACOMOEUPINTO. Somente versões superiores são instaladas. O pacote é baixado integralmente e validado por identidade, versão, lista restrita de caminhos, limites de tamanho e SHA-256 de cada arquivo antes de gravar. Falhas de escrita tentam restaurar em memória os arquivos anteriores; não cria backups permanentes. A biblioteca localStorage não é alterada.

Nesta primeira instalação, reinicie o Photoshop para ativar Node no painel CEP. Após atualizações futuras, reinicie para recarregar o manifesto e o adaptador. O botão é manual; não há instalação silenciosa em segundo plano nem suporte a repositórios privados.

Publicar atualização: alterar as versões (incluindo VERSION em src/updater.js), executar testes, node scripts/build-cep.cjs e node scripts/build-update.cjs, e publicar fontes e releases/cep-latest.json juntos no GitHub. O hash detecta corrupção; a confiança do pacote vem do repositório fixo via HTTPS, não de uma assinatura independente.

42 testes passaram, incluindo rejeição de caminhos indevidos/corrupção e recuperação após falha de escrita. O download real do GitHub foi verificado: 0.12.0, 27 arquivos com hashes válidos. O clique no atualizador dentro do Photoshop ainda não foi testado após reinício.

