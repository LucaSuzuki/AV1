import { RepositorioArquivo } from '../infra/RepositorioArquivo';
import { Organizacao } from '../core/Organizacao';
import { Lote } from '../core/Lote';

export class ServicoRelatorio {
  repositorio: RepositorioArquivo;

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
  }

  gerarRelatorioPorOrganizacao(organizacaoId: string, periodo: { inicio: Date; fim: Date }): any[] {
    const lotes = this.repositorio.listarEntidades('lotes.json') as Lote[];
    return lotes.filter(
      (lote) => lote.organizacaoId === organizacaoId && lote.dataEntrada >= periodo.inicio && lote.dataEntrada <= periodo.fim,
    );
  }

  gerarRelatorioPorStatus(status: string): any[] {
    const lotes = this.repositorio.listarEntidades('lotes.json') as Lote[];
    return lotes.filter((lote) => lote.statusProcessamento === status);
  }

  gerarRelatorioFinanceiro(periodo: { inicio: Date; fim: Date }): number {
    const organizacoes = this.repositorio.listarEntidades('organizacoes.json') as Organizacao[];
    return organizacoes
      .filter(
        (org) => org.contratoVigente && org.contratoVigente.dataAssinatura >= periodo.inicio && org.contratoVigente.dataAssinatura <= periodo.fim,
      )
      .reduce((total, org) => total + (org.contratoVigente?.valorMensal ?? 0), 0);
  }

  gerarRelatorioResumo(periodo: { inicio: Date; fim: Date }): { totalLotes: number; totalOrganizacoes: number; valorFinanceiro: number } {
    const lotes = this.repositorio.listarEntidades('lotes.json') as Lote[];
    const organizacoes = this.repositorio.listarEntidades('organizacoes.json') as Organizacao[];
    return {
      totalLotes: lotes.filter((lote) => lote.dataEntrada >= periodo.inicio && lote.dataEntrada <= periodo.fim).length,
      totalOrganizacoes: organizacoes.filter((org) => org.ativo).length,
      valorFinanceiro: this.gerarRelatorioFinanceiro(periodo),
    };
  }
}
