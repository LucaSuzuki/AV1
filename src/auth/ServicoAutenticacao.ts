import { createHash, randomUUID } from 'node:crypto';

import { Credencial } from './Credencial';
import { Sessao } from './Sessao';
import { PapelUsuario } from '../enums/enums-domino';
import { RepositorioArquivo } from '../infra/RepositorioArquivo';

export class ServicoAutenticacao {
  credenciais: Credencial[];
  sessoesAtivas: Sessao[];
  repositorio: RepositorioArquivo;

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
    this.credenciais = repositorio.listarEntidades('usuarios.json').map((dados) =>
      Credencial.restaurar(dados as {
        usuario: string;
        hashSenha: string;
        salt: string;
        ultimoAcesso: Date | string | null;
        papel: PapelUsuario;
      }),
    );
    this.sessoesAtivas = [];
  }

  registrarCredencial(credencial: Credencial): boolean {
    if (!credencial.usuario.trim() || credencial.verificarSenha('')) return false;
    if (this.credenciais.some((item) => item.usuario === credencial.usuario)) return false;
    this.credenciais.push(credencial);
    this.persistirCredenciais();
    return true;
  }

  listarUsuarios(): Array<Pick<Credencial, 'usuario' | 'papel' | 'ultimoAcesso'>> {
    return this.credenciais.map(({ usuario, papel, ultimoAcesso }) => ({ usuario, papel, ultimoAcesso }));
  }

  excluirCredencial(usuario: string): boolean {
    const index = this.credenciais.findIndex((item) => item.usuario === usuario);
    if (index === -1) return false;

    const credencial = this.credenciais[index];
    const quantidadeAdministradores = this.credenciais.filter((item) => item.papel === PapelUsuario.ADMINISTRADOR).length;
    if (credencial.papel === PapelUsuario.ADMINISTRADOR && quantidadeAdministradores === 1) return false;

    this.credenciais.splice(index, 1);
    this.sessoesAtivas = this.sessoesAtivas.filter((sessao) => sessao.usuario !== usuario);
    this.persistirCredenciais();
    return true;
  }

  private persistirCredenciais(): void {
    this.repositorio.salvarEntidade('usuarios.json', this.credenciais);
  }

  obterSessaoAtiva(token: string): Sessao | null {
    const sessao = this.sessoesAtivas.find((item) => item.token === token);
    if (!sessao || !sessao.isValida()) {
      if (sessao) {
        this.sessoesAtivas = this.sessoesAtivas.filter((item) => item.token !== token);
      }
      return null;
    }
    return sessao;
  }

  usuarioPossuiPapel(token: string, papel: PapelUsuario): boolean {
    const sessao = this.obterSessaoAtiva(token);
    if (!sessao) return false;
    return sessao.papel === papel;
  }

  autenticar(usuario: string, senha: string): boolean {
    const cred = this.credenciais.find((item) => item.usuario === usuario);
    return !!cred && cred.verificarSenha(senha);
  }

  renovarToken(token: string): string {
    const sessao = this.obterSessaoAtiva(token);
    if (!sessao) {
      throw new Error('Sessão inválida para renovação.');
    }

    const novoToken = sessao.renovar();
    sessao.token = novoToken;
    return novoToken;
  }

  login(usuario: string, senha: string): Sessao {
    const cred = this.credenciais.find((item) => item.usuario === usuario);
    if (!cred || !cred.verificarSenha(senha)) {
      throw new Error('Credenciais inválidas.');
    }

    const sessaoExistente = this.sessoesAtivas.find((item) => item.usuario === usuario && item.isValida());
    if (sessaoExistente) {
      return sessaoExistente;
    }

    const agora = new Date();
    const sessao = new Sessao({
      token: randomUUID(),
      usuario,
      papel: cred.papel,
      criacao: agora,
      expiracao: new Date(agora.getTime() + 30 * 60 * 1000),
    });

    this.sessoesAtivas.push(sessao);
    cred.atualizarUltimoAcesso();
    this.persistirCredenciais();
    return sessao;
  }

  logout(token: string): boolean {
    const index = this.sessoesAtivas.findIndex((sessao) => sessao.token === token);
    if (index === -1) return false;
    this.sessoesAtivas.splice(index, 1);
    return true;
  }

  validarToken(token: string): boolean {
    return !!this.obterSessaoAtiva(token);
  }

  alterarSenha(usuario: string, senhaAntiga: string, senhaNova: string): boolean {
    const cred = this.credenciais.find((item) => item.usuario === usuario);
    if (!cred) return false;
    if (!cred.verificarSenha(senhaAntiga)) return false;
    cred.hashSenha = createHash('sha256').update(`${cred.salt}:${senhaNova}`).digest('hex');
    return true;
  }
}
