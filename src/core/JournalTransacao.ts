import { randomUUID } from 'node:crypto';

export class JournalTransacao {
  id: string;
  timestamp: Date;
  operacao: string;
  entidade: string;
  dadosAntes: any;
  dadosDepois: any;
  dataCadastro: Date;
  usuarioResponsavel: string;
  ativo: boolean;

  constructor(dados: Partial<JournalTransacao> & { operacao: string; entidade: string; dadosAntes?: any; dadosDepois?: any; usuarioResponsavel: string; }) {
    this.id = dados.id ?? randomUUID();
    this.timestamp = dados.timestamp ?? new Date();
    this.operacao = dados.operacao;
    this.entidade = dados.entidade;
    this.dadosAntes = dados.dadosAntes ?? null;
    this.dadosDepois = dados.dadosDepois ?? null;
    this.dataCadastro = dados.dataCadastro ?? new Date();
    this.usuarioResponsavel = dados.usuarioResponsavel;
    this.ativo = dados.ativo ?? true;
  }

  registrar(): void {
    this.ativo = true;
  }

  reverter(): boolean {
    this.ativo = false;
    return true;
  }
}
