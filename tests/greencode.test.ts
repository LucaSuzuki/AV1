import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

import { ServicoAutenticacao } from '../src/auth/ServicoAutenticacao';
import { Credencial } from '../src/auth/Credencial';
import { Sessao } from '../src/auth/Sessao';
import { Organizacao } from '../src/core/Organizacao';
import { Contrato } from '../src/core/Contrato';
import { Lote } from '../src/core/Lote';
import { Equipamento } from '../src/core/Equipamento';
import { StatusLote, TipoEquipamento, EstadoFisico, PapelUsuario, StatusRastreamento } from '../src/enums/enums-domino';
import { RepositorioArquivo } from '../src/infra/RepositorioArquivo';
import { CriptografiaArquivo } from '../src/infra/CriptografiaArquivo';
import { Journaling } from '../src/infra/Journaling';
import { ServicoOrganizacao } from '../src/services/ServicoOrganizacao';
import { ServicoLote } from '../src/services/ServicoLote';
import { ServicoEquipamento } from '../src/services/ServicoEquipamento';
import { ServicoRelatorio } from '../src/services/ServicoRelatorio';
import { CLIInterface } from '../src/cli/CLIInterface';

describe('Greencode', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'greencode-tests-'));

  beforeEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
    fs.mkdirSync(baseDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it('provisiona primeiro administrador e autentica', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const auth = new ServicoAutenticacao(repo);
    const cred = new Credencial('admin', 'senha123', PapelUsuario.ADMINISTRADOR);
    auth.registrarCredencial(cred);
    const sessao = auth.login('admin', 'senha123');

    expect(sessao).toBeTruthy();
    expect(auth.validarToken(sessao.token)).toBe(true);
    const depois = auth.logout(sessao.token);
    expect(depois).toBe(true);
  });

  it('rejeita CNPJ inválido e aceita um válido', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const servico = new ServicoOrganizacao(repo);

    const invalida = servico.cadastrarOrganizacao({
      razaoSocial: 'Empresa Teste',
      cnpj: '11.111.111/1111-11',
      inscricaoEstadual: '123456',
      enderecoCompleto: 'Rua A, 123',
      telefone: '11999999999',
      email: 'contato@teste.com',
      dataCadastro: new Date(),
      ativo: true,
      contratoVigente: null as any,
    });

    expect(invalida).toBeNull();

    const valida = servico.cadastrarOrganizacao({
      razaoSocial: 'Empresa Valida',
      cnpj: '12.345.678/0001-95',
      inscricaoEstadual: '123456',
      enderecoCompleto: 'Rua B, 456',
      telefone: '11999999998',
      email: 'contato@valida.com',
      dataCadastro: new Date(),
      ativo: true,
      contratoVigente: null as any,
    });

    expect(valida).not.toBeNull();
    expect(valida?.cnpj).toBe('12345678000195');
  });

  it('rejeita lote com data inválida', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const servico = new ServicoLote(repo);

    const futura = servico.criarLote({
      id: randomUUID(),
      dataEntrada: new Date(Date.now() + 86400000),
      organizacaoId: 'org-1',
      notaFiscal: 'NF-123',
      transportadora: 'LogiX',
      equipamentos: [],
      statusProcessamento: StatusLote.RECEBIDO,
      observacoes: 'ok',
    });

    expect(futura).toBeNull();

    const antiga = servico.criarLote({
      id: randomUUID(),
      dataEntrada: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120),
      organizacaoId: 'org-1',
      notaFiscal: 'NF-124',
      transportadora: 'LogiX',
      equipamentos: [],
      statusProcessamento: StatusLote.RECEBIDO,
      observacoes: 'ok',
    });

    expect(antiga).toBeNull();
  });

  it('rejeita alteração de estado fisico sem justificativa e aceita com justificativa', () => {
    const equipamento = new Equipamento({
      id: 'eq-1',
      codigoBarrasInterno: 'CB-1',
      tipo: TipoEquipamento.COMPUTADOR_MESA,
      marca: 'Dell',
      modelo: 'OptiPlex',
      anoFabricacao: 2020,
      estadoFisico: EstadoFisico.BOM_ESTADO,
      pesoQuilogramas: 8,
      loteId: 'lote-1',
      posicaoNoLote: 1,
      statusRastreamento: StatusRastreamento.AGUARDANDO_TRIAGEM,
      historicoMovimentacao: [],
    });

    expect(() => equipamento.atualizarStatus(EstadoFisico.INSERVIVEL, '')).toThrow();
    expect(() => equipamento.atualizarStatus(EstadoFisico.INSERVIVEL, 'quebrado')).not.toThrow();
    expect(equipamento.estadoFisico).toBe(EstadoFisico.INSERVIVEL);
  });

  it('login/logout e expiração de sessão', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const auth = new ServicoAutenticacao(repo);
    const cred = new Credencial('admin', 'senha123', PapelUsuario.ADMINISTRADOR);
    auth.registrarCredencial(cred);

    const sessao = auth.login('admin', 'senha123');
    expect(auth.validarToken(sessao.token)).toBe(true);

    const expirada = new Sessao({
      token: 'token-expirado',
      usuario: 'admin',
      papel: PapelUsuario.ADMINISTRADOR,
      criacao: new Date(Date.now() - 1000 * 60 * 60),
      expiracao: new Date(Date.now() - 1000 * 60),
    });
    expect(expirada.isValida()).toBe(false);

    auth.logout(sessao.token);
    expect(auth.validarToken(sessao.token)).toBe(false);
  });

  it('implementa o contrato de autenticação e renova sessão', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const auth = new ServicoAutenticacao(repo);
    auth.registrarCredencial(new Credencial('admin', 'senha123', PapelUsuario.ADMINISTRADOR));

    expect(auth.autenticar('admin', 'senha123')).toBe(true);

    const sessao = auth.login('admin', 'senha123');
    const tokenAntigo = sessao.token;
    const tokenRenovado = auth.renovarToken(tokenAntigo);

    expect(tokenRenovado).not.toBe(tokenAntigo);
    expect(auth.validarToken(tokenRenovado)).toBe(true);
  });

  it('respeita autorização por papel e mantém sessão ativa somente com token válido', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const auth = new ServicoAutenticacao(repo);
    auth.registrarCredencial(new Credencial('admin', 'senha123', PapelUsuario.ADMINISTRADOR));
    auth.registrarCredencial(new Credencial('auditor', 'senha456', PapelUsuario.AUDITORIA));

    const sessaoAdmin = auth.login('admin', 'senha123');
    const sessaoAuditor = auth.login('auditor', 'senha456');

    expect(auth.usuarioPossuiPapel(sessaoAdmin.token, PapelUsuario.ADMINISTRADOR)).toBe(true);
    expect(auth.usuarioPossuiPapel(sessaoAuditor.token, PapelUsuario.ADMINISTRADOR)).toBe(false);
    expect(auth.usuarioPossuiPapel(sessaoAdmin.token, PapelUsuario.AUDITORIA)).toBe(false);

    const tokenRenovado = auth.renovarToken(sessaoAdmin.token);
    expect(auth.validarToken(tokenRenovado)).toBe(true);
    expect(auth.logout(tokenRenovado)).toBe(true);
    expect(auth.validarToken(tokenRenovado)).toBe(false);
  });

  it('persiste credenciais, lista dados públicos e impede excluir o último administrador', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const auth = new ServicoAutenticacao(repo);
    expect(auth.registrarCredencial(new Credencial('admin', 'senha123', PapelUsuario.ADMINISTRADOR))).toBe(true);
    expect(auth.registrarCredencial(new Credencial('operador', 'senha456', PapelUsuario.OPERADOR_CADASTRO))).toBe(true);
    expect(auth.registrarCredencial(new Credencial('operador', 'outra-senha', PapelUsuario.OPERADOR_CADASTRO))).toBe(false);

    const authRecarregada = new ServicoAutenticacao(repo);
    expect(authRecarregada.autenticar('operador', 'senha456')).toBe(true);
    expect(authRecarregada.listarUsuarios()).toEqual(expect.arrayContaining([
      expect.objectContaining({ usuario: 'admin', papel: PapelUsuario.ADMINISTRADOR }),
      expect.objectContaining({ usuario: 'operador', papel: PapelUsuario.OPERADOR_CADASTRO }),
    ]));
    expect(authRecarregada.listarUsuarios()[0]).not.toHaveProperty('hashSenha');
    expect(authRecarregada.excluirCredencial('admin')).toBe(false);
    const sessaoOperador = authRecarregada.login('operador', 'senha456');
    expect(authRecarregada.excluirCredencial('operador')).toBe(true);
    expect(authRecarregada.validarToken(sessaoOperador.token)).toBe(false);
    expect(new ServicoAutenticacao(repo).autenticar('operador', 'senha456')).toBe(false);
  });

  it('rastreia histórico completo de equipamento', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const servico = new ServicoEquipamento(repo);
    const equipamento = new Equipamento({
      id: 'eq-2',
      codigoBarrasInterno: 'CB-2',
      tipo: TipoEquipamento.NOTEBOOK,
      marca: 'Lenovo',
      modelo: 'ThinkPad',
      anoFabricacao: 2021,
      estadoFisico: EstadoFisico.NOVO,
      pesoQuilogramas: 2,
      loteId: 'lote-10',
      posicaoNoLote: 2,
      statusRastreamento: StatusRastreamento.AGUARDANDO_TRIAGEM,
      historicoMovimentacao: [],
    });

    equipamento.registrarMovimentacao('triagem', 'operador-a');
    equipamento.registrarMovimentacao('desmonte', 'operador-b');
    const rastreio = servico.rastrearEquipamento(equipamento);

    expect(rastreio.equipamento.id).toBe('eq-2');
    expect(rastreio.movimentacoes.length).toBeGreaterThanOrEqual(2);
  });

  it('registra auditoria de transações ao salvar entidades', () => {
    const journaling = new Journaling(baseDir);
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key', journaling);
    const entidade = { id: 'org-1', razaoSocial: 'Empresa Auditada', ativo: true };

    repo.salvarEntidade('organizacoes.json', [entidade]);

    const journalPath = path.join(baseDir, 'journal.log');
    expect(fs.existsSync(journalPath)).toBe(true);
    const conteudo = fs.readFileSync(journalPath, 'utf8');
    expect(conteudo).toContain('organizacoes.json');
    expect(conteudo).toContain('org-1');
  });

  it('conclui o ciclo real de negócio de organização, lote e equipamento', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const servicoOrganizacao = new ServicoOrganizacao(repo);
    const servicoLote = new ServicoLote(repo);
    const servicoEquipamento = new ServicoEquipamento(repo);

    const organizacao = servicoOrganizacao.cadastrarOrganizacao({
      razaoSocial: 'Empresa do Ciclo Real',
      cnpj: '12.345.678/0001-95',
      inscricaoEstadual: '123456',
      enderecoCompleto: 'Rua do Ciclo, 200',
      telefone: '11999999999',
      email: 'ciclo@empresa.com',
      dataCadastro: new Date(),
      ativo: true,
      contratoVigente: null as any,
    });

    const lote = servicoLote.criarLote({
      id: 'lote-ciclo',
      dataEntrada: new Date(),
      organizacaoId: organizacao!.id,
      notaFiscal: 'NF-CICLO-001',
      transportadora: 'LogiCycle',
      equipamentos: [],
      statusProcessamento: StatusLote.RECEBIDO,
      observacoes: 'fluxo de negócio completo',
    });

    expect(organizacao).not.toBeNull();
    expect(lote).not.toBeNull();

    const equipamento = servicoEquipamento.cadastrarEquipamento({
      id: 'eq-ciclo',
      codigoBarrasInterno: 'CB-CICLO',
      tipo: TipoEquipamento.NOTEBOOK,
      marca: 'Dell',
      modelo: 'Latitude',
      anoFabricacao: 2024,
      estadoFisico: EstadoFisico.BOM_ESTADO,
      pesoQuilogramas: 2.7,
      loteId: lote!.id,
      posicaoNoLote: 1,
      statusRastreamento: StatusRastreamento.AGUARDANDO_TRIAGEM,
      historicoMovimentacao: [],
    });

    expect(equipamento).not.toBeNull();
    expect(servicoEquipamento.permitirDesmonte(equipamento!.id)).toBe(false);

    const loteTriado = servicoLote.processarTriagem(lote!.id);
    expect(loteTriado?.statusProcessamento).toBe(StatusLote.TRIAGEM_CONCLUIDA);
    expect(servicoEquipamento.atualizarStatusRastreamento(equipamento!.id, StatusRastreamento.EM_DESMONTE)).toBe(true);
    expect(servicoEquipamento.permitirDesmonte(equipamento!.id)).toBe(true);

    const rastreio = servicoEquipamento.rastrearEquipamento(equipamento!);
    expect(rastreio.equipamento.id).toBe('eq-ciclo');
    expect(rastreio.totalMovimentacoes).toBeGreaterThanOrEqual(1);
  });

  it('processa os comandos da CLI para o fluxo operacional', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const auth = new ServicoAutenticacao(repo);
    auth.registrarCredencial(new Credencial('admin', 'senha123', PapelUsuario.ADMINISTRADOR));

    const cli = new CLIInterface(
      auth,
      new ServicoOrganizacao(repo),
      new ServicoLote(repo),
      new ServicoEquipamento(repo),
      new ServicoRelatorio(repo),
    );

    expect(cli.processarComando('login admin senha123')).toContain('SUCESSO');

    const org = cli.processarComando('organizacao cadastrar --razao "Empresa CLI" --cnpj 12.345.678/0001-95 --ie 123456 --endereco "Rua CLI, 10" --telefone 11999999999 --email contato@cli.com');
    expect(org).toContain('SUCESSO');

    const organizacaoCriada = (repo.listarEntidades('organizacoes.json') as any[])[0];
    const lote = cli.processarComando(`lote criar --org ${organizacaoCriada.id} --nf NF-CLI-001 --transp LogiCLI --obs "lote cli"`);
    expect(lote).toContain('SUCESSO');

    const loteCriado = (repo.listarEntidades('lotes.json') as any[])[0];
    const equipamento = cli.processarComando(`equipamento cadastrar --lote ${loteCriado.id} --tipo NOTEBOOK --marca Dell --modelo Latitude --ano 2024 --estado 1 --peso 2.5 --codigo CB-CLI-01 --posicao 1`);
    expect(equipamento).toContain('SUCESSO');

    const relatorio = cli.processarComando('relatorio status');
    expect(relatorio).toContain('status');
  });

  it('permite ao administrador gerenciar usuários sem permitir autoexclusão', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const auth = new ServicoAutenticacao(repo);
    auth.registrarCredencial(new Credencial('admin', 'senha123', PapelUsuario.ADMINISTRADOR));
    const cli = new CLIInterface(
      auth,
      new ServicoOrganizacao(repo),
      new ServicoLote(repo),
      new ServicoEquipamento(repo),
      new ServicoRelatorio(repo),
    );

    cli.processarComando('login admin senha123');
    expect(cli.processarComando('usuario cadastrar --usuario auditor --senha senha456 --papel AUDITORIA')).toContain('SUCESSO');
    expect(cli.processarComando('usuario listar')).toContain('auditor | AUDITORIA');
    expect(cli.processarComando('usuario excluir --usuario admin')).toContain('não é permitido excluir');
    expect(cli.processarComando('usuario excluir --usuario auditor')).toContain('SUCESSO');
  });

  it('impede que usuários não administradores gerenciem credenciais', () => {
    const repo = new RepositorioArquivo(baseDir, new CriptografiaArquivo(), 'secret-key');
    const auth = new ServicoAutenticacao(repo);
    auth.registrarCredencial(new Credencial('operador', 'senha456', PapelUsuario.OPERADOR_CADASTRO));
    const cli = new CLIInterface(
      auth,
      new ServicoOrganizacao(repo),
      new ServicoLote(repo),
      new ServicoEquipamento(repo),
      new ServicoRelatorio(repo),
    );

    cli.processarComando('login operador senha456');
    expect(cli.processarComando('usuario listar')).toContain('somente o administrador');
  });
});
