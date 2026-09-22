import { randomUUID } from 'node:crypto';

export class Sessao {
  token: string;
  usuario: string;
  papel: any;
  criacao: Date;
  expiracao: Date;

  constructor(dados: Partial<Sessao> & { token: string; usuario: string; papel: any; criacao: Date; expiracao: Date; }) {
    this.token = dados.token;
    this.usuario = dados.usuario;
    this.papel = dados.papel;
    this.criacao = dados.criacao;
    this.expiracao = dados.expiracao;
  }

  isValida(): boolean {
    return Date.now() < this.expiracao.getTime();
  }

  renovar(): string {
    this.token = randomUUID();
    this.expiracao = new Date(Date.now() + 30 * 60 * 1000);
    return this.token;
  }
}
