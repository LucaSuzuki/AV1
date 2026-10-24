# Greencode

Sistema CLI em TypeScript para gestão de logística reversa de resíduos eletrônicos.

## Visão geral

O Greencode simula um fluxo operacional de recebimento, triagem, rastreio, autorização de desmontagem e geração de relatórios para equipamentos eletrônicos. A aplicação usa persistência em arquivos cifrados, autenticação por sessão e journaling para auditoria de transações.

## Funcionalidades

- Cadastro e autenticação de usuários
- Gerenciamento administrativo de usuários (cadastro, listagem e exclusão)
- Controle de papéis por perfil
- Cadastro de organizações e contratos
- Criação e triagem de lotes
- Cadastro e rastreio de equipamentos
- Validação de CNPJ e datas de entrada
- Geração de relatórios
- Persistência segura com criptografia AES-256
- Log de auditoria com journaling

## Stack

- Node.js
- TypeScript
- Jest
- ts-jest
- Node crypto
- readline nativo do Node

## Estrutura do projeto

```text
.
├── src/
│   ├── auth/
│   ├── cli/
│   ├── core/
│   ├── enums/
│   ├── infra/
│   ├── services/
│   ├── validators/
│   └── index.ts
├── tests/
├── docs/
├── data/
├── package.json
├── tsconfig.json
├── jest.config.js
├── .gitignore
├── README.md
└── package-lock.json
```

## Pré-requisitos

- Node.js LTS
- npm

## Instalação

```bash
npm install
```

## Scripts

```bash
npm run build
npm run dev
npm test -- --runInBand --verbose
```

## Execução local

### Rodar a aplicação CLI

```bash
npm run dev
```

### Compilar para produção

```bash
npm run build
```

### Rodar testes

```bash
npm test -- --runInBand --verbose
```

## Fluxo típico de uso

1. Faça login com o usuário administrador padrão:

```bash
login admin admin123
```

2. Cadastre, liste ou exclua usuários (somente o administrador):

```bash
usuario cadastrar --usuario operador --senha "senha-segura" --papel OPERADOR_CADASTRO
usuario listar
usuario excluir --usuario operador
```

Papéis disponíveis: `ADMINISTRADOR`, `OPERADOR_CADASTRO`, `GESTOR_ALMOXARIFADO` e `AUDITORIA`.

3. Cadastre uma organização:

```bash
organizacao cadastrar --razao "Empresa CLI" --cnpj 12.345.678/0001-95 --ie 123456 --endereco "Rua CLI, 10" --telefone 11999999999 --email contato@cli.com
```

4. Crie um lote:

```bash
lote criar --org org-default --nf NF-CLI-001 --transp LogiCLI --obs "lote cli"
```

5. Cadastre um equipamento:

```bash
equipamento cadastrar --lote <id-do-lote> --tipo NOTEBOOK --marca Dell --modelo Latitude --ano 2024 --estado 1 --peso 2.5 --codigo CB-CLI-01 --posicao 1
```

6. Consulte relatórios:

```bash
relatorio status
```

## Segurança

O projeto usa criptografia AES-256 para proteger dados persistidos em arquivo e hash de senha com salt para autenticação. A documentação de arquitetura e segurança está em:

- docs/seguranca.md

## Observações

- O diretório `data/` é gerado em runtime e normalmente não deve ser versionado.
- O projeto foi validado com build e testes automatizados.

## Licença

ISC

# [Gerson](https://youtu.be/u3H8O8RJp3M?si=QgdfEQUHSrQe6u9x)
