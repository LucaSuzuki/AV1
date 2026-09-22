import { randomUUID } from 'node:crypto';

export class Contrato {
  id: string;
  organizacaoId: string;
  dataAssinatura: Date;
  dataVencimento: Date;
  clausulas: string[];
  valorMensal: number;
  renovacaoAutomatica: boolean;

  constructor(dados: Partial<Contrato> & { organizacaoId: string; dataAssinatura: Date; dataVencimento: Date; valorMensal: number; }) {
    this.id = dados.id ?? randomUUID();
    this.organizacaoId = dados.organizacaoId;
    this.dataAssinatura = dados.dataAssinatura;
    this.dataVencimento = dados.dataVencimento;
    this.clausulas = dados.clausulas ?? [];
    this.valorMensal = dados.valorMensal;
    this.renovacaoAutomatica = dados.renovacaoAutomatica ?? true;
  }

  estaVigente(): boolean {
    return new Date() <= this.dataVencimento;
  }

  renovar(novoVencimento: Date): void {
    this.dataVencimento = novoVencimento;
  }
}
