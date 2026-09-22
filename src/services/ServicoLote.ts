import { randomUUID } from 'node:crypto';

import { Lote } from '../core/Lote';
import { Equipamento } from '../core/Equipamento';
import { RepositorioArquivo } from '../infra/RepositorioArquivo';
import { StatusLote } from '../enums/enums-domino';
import { ValidadorDataEntrada } from '../validators/ValidadorDataEntrada';

export class ServicoLote {
  repositorio: RepositorioArquivo;
  validadorDataEntrada: ValidadorDataEntrada;

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
    this.validadorDataEntrada = new ValidadorDataEntrada();
  }

  criarLote(dados: Partial<Lote> & { dataEntrada: Date; organizacaoId: string; notaFiscal: string; transportadora: string; equipamentos?: Equipamento[]; statusProcessamento?: StatusLote; observacoes?: string; }): Lote | null {
    if (!this.validadorDataEntrada.validar(dados.dataEntrada)) {
      return null;
    }

    const lote = new Lote({
      ...dados,
      id: dados.id ?? randomUUID(),
      equipamentos: dados.equipamentos ?? [],
      statusProcessamento: dados.statusProcessamento ?? StatusLote.RECEBIDO,
      observacoes: dados.observacoes ?? '',
    });

    const lotes = this.repositorio.listarEntidades('lotes.json') as Lote[];
    lotes.push(lote);
    this.repositorio.salvarEntidade('lotes.json', lotes);
    return lote;
  }

  adicionarEquipamentoToLote(loteId: string, equipamento: Equipamento): boolean {
    const lotes = this.repositorio.listarEntidades('lotes.json') as Lote[];
    const lote = lotes.find((item) => item.id === loteId);
    if (!lote) return false;
    lote.equipamentos.push(equipamento);
    this.repositorio.salvarEntidade('lotes.json', lotes);
    return true;
  }

  processarTriagem(loteId: string): Lote | null {
    const lotes = this.repositorio.listarEntidades('lotes.json') as Lote[];
    const lote = lotes.find((item) => item.id === loteId);
    if (!lote) return null;
    lote.statusProcessamento = StatusLote.TRIAGEM_CONCLUIDA;
    this.repositorio.salvarEntidade('lotes.json', lotes);
    return lote;
  }

  consultarLotePorPeriodo(dataInicio: Date, dataFim: Date): Lote[] {
    const lotes = this.repositorio.listarEntidades('lotes.json') as Lote[];
    return lotes.filter((lote) => lote.dataEntrada >= dataInicio && lote.dataEntrada <= dataFim);
  }
}
