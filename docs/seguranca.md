# Documentação de arquitetura de segurança

## 1. Criptografia AES-256

A persistência em arquivo utiliza criptografia simétrica com AES-256 para proteger os dados em disco. A escolha desta cifra é adequada ao cenário da aplicação porque:

- oferece nível de segurança forte e amplamente aceito em sistemas corporativos;
- funciona nativamente com o módulo `node:crypto` do Node.js;
- reduz a dependência de bibliotecas externas e facilita portabilidade entre Windows e Linux;
- preserva o requisito de persistência em arquivos cifrados, sem a necessidade de banco de dados para a fase inicial do projeto.

A chave é gerada em formato aleatório e armazenada de forma protegida no ambiente de execução, sendo reaproveitada pelo repositório para cifrar e decifrar os arquivos do sistema.

## 2. Hashing de senha

As credenciais usam SHA-256 com salt aleatório por usuário. O processo é:

1. gerar salt com `crypto.randomBytes`;
2. concatenar salt + senha;
3. aplicar hash SHA-256;
4. armazenar o valor e o salt.

Essa abordagem impede que duas contas com a mesma senha tenham o mesmo hash e dificulta ataques de dicionário e rainbow tables. Em evoluções futuras, a recomendação é migrar para `scrypt` ou `PBKDF2`, que são mais resistentes a ataques de força bruta e permitem maior custo computacional por tentativa.

## 3. Política de expiração de sessão

A sessão expira em 30 minutos de inatividade. Essa escolha equilibra segurança e usabilidade:

- reduz risco de uso indevido se o usuário esquecer de encerrar a sessão;
- mantém experiência confortável para operações de rotina;
- é uma política padrão em sistemas de controle interno e operação de logística.

## 4. Cenários de falha testados

Os testes automatizados cobrem cenários críticos do sistema:

- provisionamento inicial do primeiro administrador;
- autenticação e logout;
- expiração de sessão;
- rejeição de CNPJ inválido e aceitação de CNPJ válido;
- rejeição de lote com data futura ou fora do limite de 90 dias;
- validação de justificativa obrigatória para mudança de estado físico em duas categorias ou mais;
- rastreamento e histórico do equipamento.

Em todos esses casos, a aplicação responde com rejeição explícita ou comportamento esperado, sem corromper a persistência de dados.

## 5. Evolução futura

Como próxima etapa, o projeto pode evoluir para:

- interface web com autenticação e sessões em backend;
- banco de dados relacional (PostgreSQL ou MySQL);
- controle de auditoria mais robusto e logs centralizados;
- migração de armazenamento local para infraestrutura distribuída e escalável.

Essa evolução preserva a mesma lógica de domínio, mas aumenta confiabilidade, observabilidade e governança de dados.
