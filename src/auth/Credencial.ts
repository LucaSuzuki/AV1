import { createHash, randomBytes } from 'node:crypto';

import { PapelUsuario } from '../enums/enums-domino';

export class Credencial {
  usuario: string;
  hashSenha: string;
  salt: string;
  ultimoAcesso: Date | null;
  papel: PapelUsuario;

  constructor(usuario: string, senhaPlana: string, papel: PapelUsuario) {
    this.usuario = usuario;
    this.salt = randomBytes(16).toString('hex');
    this.hashSenha = this.gerarHash(senhaPlana, this.salt);
    this.ultimoAcesso = null;
    this.papel = papel;
  }

  private gerarHash(senha: string, salt: string): string {
    return createHash('sha256').update(`${salt}:${senha}`).digest('hex');
  }

  verificarSenha(senhaPlana: string): boolean {
    return this.hashSenha === this.gerarHash(senhaPlana, this.salt);
  }

  atualizarUltimoAcesso(): void {
    this.ultimoAcesso = new Date();
  }
}
