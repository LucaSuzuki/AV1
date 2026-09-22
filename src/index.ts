import * as fs from 'node:fs';
import * as path from 'node:path';

import { ServicoAutenticacao } from './auth/ServicoAutenticacao';
import { Credencial } from './auth/Credencial';
import { CLIInterface } from './cli/CLIInterface';
import { RepositorioArquivo } from './infra/RepositorioArquivo';
import { CriptografiaArquivo } from './infra/CriptografiaArquivo';
import { ServicoOrganizacao } from './services/ServicoOrganizacao';
import { ServicoLote } from './services/ServicoLote';
import { ServicoEquipamento } from './services/ServicoEquipamento';
import { ServicoRelatorio } from './services/ServicoRelatorio';
import { PapelUsuario } from './enums/enums-domino';

const dataDir = path.join(process.cwd(), 'data');
const configPath = path.join(dataDir, 'config.enc');

function verificarProvisionamento(): void {
  fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(configPath)) return;

  console.log('Provisionamento inicial: configure o primeiro administrador.');
  const senha = 'admin123';
  const chave = new CriptografiaArquivo().gerarChave();
  const repo = new RepositorioArquivo(dataDir, new CriptografiaArquivo(), chave);
  const auth = new ServicoAutenticacao(repo);
  auth.registrarCredencial(new Credencial('admin', senha, PapelUsuario.ADMINISTRADOR));
  fs.writeFileSync(configPath, `${chave}`);
  console.log('Administrador provisionado com sucesso.');
}

async function main(): Promise<void> {
  verificarProvisionamento();
  const chave = fs.readFileSync(configPath, 'utf8').trim();
  const repo = new RepositorioArquivo(dataDir, new CriptografiaArquivo(), chave);

  const autenticacao = new ServicoAutenticacao(repo);
  autenticacao.registrarCredencial(new Credencial('admin', 'admin123', PapelUsuario.ADMINISTRADOR));

  const cli = new CLIInterface(
    autenticacao,
    new ServicoOrganizacao(repo),
    new ServicoLote(repo),
    new ServicoEquipamento(repo),
    new ServicoRelatorio(repo),
  );

  await cli.iniciarLoop();
}

main().catch((erro) => {
  console.error('Erro ao iniciar aplicação:', erro);
  process.exit(1);
});
