import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';

import { ServicoAutenticacao } from '../auth/ServicoAutenticacao';
import { Sessao } from '../auth/Sessao';
import { PapelUsuario } from '../enums/enums-domino';
import { ServicoOrganizacao } from '../services/ServicoOrganizacao';
import { ServicoLote } from '../services/ServicoLote';
import { ServicoEquipamento } from '../services/ServicoEquipamento';
import { ServicoRelatorio } from '../services/ServicoRelatorio';

export class CLIInterface {
  autenticacao: ServicoAutenticacao;
  organizacao: ServicoOrganizacao;
  lote: ServicoLote;
  equipamento: ServicoEquipamento;
  relatorio: ServicoRelatorio;
  sessaoAtual: Sessao | null;

  constructor(
    autenticacao: ServicoAutenticacao,
    organizacao: ServicoOrganizacao,
    lote: ServicoLote,
    equipamento: ServicoEquipamento,
    relatorio: ServicoRelatorio,
  ) {
    this.autenticacao = autenticacao;
    this.organizacao = organizacao;
    this.lote = lote;
    this.equipamento = equipamento;
    this.relatorio = relatorio;
    this.sessaoAtual = null;
  }

  exibirMenuPorPapel(papel: PapelUsuario): string {
    const menus: Record<PapelUsuario, string[]> = {
      [PapelUsuario.ADMINISTRADOR]: ['login', 'logout', 'organizacao cadastrar', 'lote criar', 'equipamento rastrear', 'relatorio status'],
      [PapelUsuario.OPERADOR_CADASTRO]: ['login', 'logout', 'organizacao cadastrar', 'lote criar'],
      [PapelUsuario.GESTOR_ALMOXARIFADO]: ['login', 'logout', 'lote criar', 'equipamento rastrear'],
      [PapelUsuario.AUDITORIA]: ['login', 'logout', 'relatorio status', 'relatorio financeiro'],
    };
    return menus[papel]?.join(' | ') ?? 'sem comandos';
  }

  async iniciarLoop(): Promise<void> {
    const historyPath = path.join(process.cwd(), 'data', '.cli_history');
    fs.mkdirSync(path.dirname(historyPath), { recursive: true });
    const rl = readline.createInterface({
      input: process.stdin as any,
      output: process.stdout,
      completer: (line: string): [string[], string] => {
        const comandos = ['login', 'logout', 'organizacao cadastrar', 'lote criar', 'equipamento rastrear', 'relatorio status'];
        const hits = comandos.filter((cmd) => cmd.startsWith(line.trim()));
        return [hits.length ? hits : comandos, line];
      },
    });

    console.log('Greencode CLI iniciado. Use "login usuario senha" ou "sair" para encerrar.');

    while (true) {
      const entrada = await rl.question('greencode> ');
      const texto = entrada.trim();
      if (!texto) continue;
      if (texto.toLowerCase() === 'sair') {
        fs.writeFileSync(historyPath, `${texto}\n`, { flag: 'a' });
        rl.close();
        break;
      }

      const resultado = this.processarComando(texto);
      console.log(resultado);
      fs.writeFileSync(historyPath, `${texto}\n`, { flag: 'a' });
    }
  }

  processarComando(entrada: string): string {
    const partes = this.parseComando(entrada);
    if (partes.length === 0) return 'INFO: comando vazio.';

    const comando = partes[0].toLowerCase();

    if (comando === 'login') {
      const usuario = partes[1] ?? '';
      const senha = partes[2] ?? '';
      if (!usuario || !senha) return 'ERRO: uso correto: login <usuario> <senha>';
      if (!this.autenticacao.autenticar(usuario, senha)) return 'ERRO: credenciais inválidas.';
      this.sessaoAtual = this.autenticacao.login(usuario, senha);
      return `SUCESSO: login realizado para ${usuario}.`;
    }

    if (comando === 'logout') {
      if (!this.sessaoAtual) return 'AVISO: nenhuma sessão ativa.';
      const ok = this.autenticacao.logout(this.sessaoAtual.token);
      this.sessaoAtual = null;
      return ok ? 'SUCESSO: sessão encerrada.' : 'ERRO: falha ao encerrar sessão.';
    }

    if (!this.sessaoAtual) {
      return 'AVISO: faça login antes de executar comandos do sistema.';
    }

    const recurso = comando;
    const acao = partes[1]?.toLowerCase() ?? '';
    const params = this.parseParametros(partes.slice(2));

    if (recurso === 'organizacao' && acao === 'cadastrar') {
      const cnpj = params['cnpj'] ?? params['--cnpj'] ?? '';
      const organizacao = this.organizacao.cadastrarOrganizacao({
        razaoSocial: params['razao'] ?? params['--razao'] ?? 'Empresa',
        cnpj,
        inscricaoEstadual: params['ie'] ?? params['--ie'] ?? '000000',
        enderecoCompleto: params['endereco'] ?? params['--endereco'] ?? 'Rua principal',
        telefone: params['telefone'] ?? params['--telefone'] ?? '00000000000',
        email: params['email'] ?? params['--email'] ?? 'contato@empresa.com',
        dataCadastro: new Date(),
        ativo: true,
      });
      return organizacao ? `SUCESSO: organização cadastrada ${organizacao.id}.` : 'ERRO: CNPJ inválido ou duplicado.';
    }

    if (recurso === 'lote' && acao === 'criar') {
      const lote = this.lote.criarLote({
        id: undefined,
        dataEntrada: new Date(),
        organizacaoId: params['org'] ?? params['--org'] ?? 'org-default',
        notaFiscal: params['nf'] ?? params['--nf'] ?? 'NF-0001',
        transportadora: params['transp'] ?? params['--transp'] ?? 'Transportadora',
        equipamentos: [],
        statusProcessamento: 'RECEBIDO' as any,
        observacoes: params['obs'] ?? params['--obs'] ?? 'Lote criado pela CLI',
      });
      return lote ? `SUCESSO: lote criado ${lote.id}.` : 'ERRO: não foi possível criar o lote.';
    }

    if (recurso === 'equipamento' && acao === 'cadastrar') {
      const loteId = params['lote'] ?? params['--lote'] ?? '';
      const tipo = params['tipo'] ?? params['--tipo'] ?? 'NOTEBOOK';
      const marca = params['marca'] ?? params['--marca'] ?? 'Marca';
      const modelo = params['modelo'] ?? params['--modelo'] ?? 'Modelo';
      const ano = Number(params['ano'] ?? params['--ano'] ?? '2024');
      const estado = Number(params['estado'] ?? params['--estado'] ?? '1');
      const peso = Number(params['peso'] ?? params['--peso'] ?? '0');
      const codigo = params['codigo'] ?? params['--codigo'] ?? `CB-${Date.now()}`;
      const posicao = Number(params['posicao'] ?? params['--posicao'] ?? '1');

      if (!loteId) return 'ERRO: lote obrigatório para cadastrar equipamento.';

      const equipamento = this.equipamento.cadastrarEquipamento({
        id: undefined,
        codigoBarrasInterno: codigo,
        tipo: (tipo as any),
        marca,
        modelo,
        anoFabricacao: ano,
        estadoFisico: Number.isFinite(estado) ? estado as any : 1,
        pesoQuilogramas: peso,
        loteId,
        posicaoNoLote: posicao,
        statusRastreamento: 'AGUARDANDO_TRIAGEM' as any,
        historicoMovimentacao: [],
      });

      return equipamento ? `SUCESSO: equipamento cadastrado ${equipamento.id}.` : 'ERRO: lote informado inexistente.';
    }

    if (recurso === 'equipamento' && acao === 'rastrear') {
      const id = params['id'] ?? params['--id'] ?? '';
      if (!id) return 'ERRO: id do equipamento obrigatório.';
      const equipamentos = (this.equipamento.repositorio.listarEntidades('equipamentos.json') as any[]);
      const item = equipamentos.find((equip) => equip.id === id);
      return item ? `SUCESSO: rastreio do equipamento ${id} disponível.` : 'ERRO: equipamento não encontrado.';
    }

    if (recurso === 'relatorio' && (acao === 'status' || acao === 'financeiro')) {
      return `INFO: relatório ${acao} solicitado com o usuário autenticado.`;
    }

    return `INFO: comando ${recurso} ${acao || ''} reconhecido pelo parser.`;
  }

  parseComando(entrada: string): string[] {
    const resultado: string[] = [];
    let token = '';
    let dentroAspas = false;

    for (const char of entrada) {
      if (char === '"') {
        dentroAspas = !dentroAspas;
        continue;
      }

      if (/\s/.test(char) && !dentroAspas) {
        if (token.trim()) {
          resultado.push(token.trim());
          token = '';
        }
        continue;
      }

      token += char;
    }

    if (token.trim()) resultado.push(token.trim());
    return resultado;
  }

  parseParametros(partes: string[]): Record<string, string> {
    const params: Record<string, string> = {};
    for (let i = 0; i < partes.length; i += 1) {
      const parte = partes[i];
      if (!parte) continue;
      if (parte.startsWith('--')) {
        const chave = parte.replace(/^--/, '');
        const valor = partes[i + 1] && !partes[i + 1].startsWith('--') ? partes[i + 1] : 'true';
        params[chave] = valor;
        if (valor !== 'true' && partes[i + 1] && !partes[i + 1].startsWith('--')) i += 1;
        continue;
      }
      if (parte.startsWith('-') && parte.length > 1) {
        const chave = parte.replace(/^-+/, '');
        const valor = partes[i + 1] && !partes[i + 1].startsWith('-') ? partes[i + 1] : 'true';
        params[chave] = valor;
        if (valor !== 'true' && partes[i + 1] && !partes[i + 1].startsWith('-')) i += 1;
      }
    }
    return params;
  }
}
