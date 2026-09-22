import { EstadoFisico, HistoricoCompleto, StatusLote, StatusRastreamento, TipoEquipamento } from '../enums/enums-domino';
import { Equipamento } from '../core/Equipamento';
import { Lote } from '../core/Lote';
import { RepositorioArquivo } from '../infra/RepositorioArquivo';

export class ServicoEquipamento {
  repositorio: RepositorioArquivo;

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
  }

  cadastrarEquipamento(dados: Partial<Equipamento> & { codigoBarrasInterno: string; tipo: TipoEquipamento; marca: string; modelo: string; anoFabricacao: number; estadoFisico: EstadoFisico; pesoQuilogramas: number; loteId: string; posicaoNoLote: number; statusRastreamento: StatusRastreamento; }): Equipamento | null {
    const equipamentos = this.repositorio.listarEntidades('equipamentos.json') as Equipamento[];
    const equipamento = new Equipamento(dados);
    const lote = (this.repositorio.listarEntidades('lotes.json') as Lote[]).find((item) => item.id === equipamento.loteId);

    if (!lote) return null;

    equipamento.historicoMovimentacao.push({
      id: `${equipamento.id}-cadastro`,
      equipamentoId: equipamento.id,
      dataHora: new Date(),
      origem: 'CADASTRO',
      destino: equipamento.statusRastreamento,
      responsavel: 'sistema',
      observacao: 'Equipamento cadastrado no lote',
    });

    equipamentos.push(equipamento);
    this.repositorio.salvarEntidade('equipamentos.json', equipamentos);

    lote.equipamentos.push(equipamento);
    this.repositorio.salvarEntidade('lotes.json', (this.repositorio.listarEntidades('lotes.json') as Lote[]).map((item) => item.id === lote.id ? lote : item));
    return equipamento;
  }

  rastrearEquipamento(equipamento: Equipamento): HistoricoCompleto {
    const movimentacoes = equipamento.historicoMovimentacao ?? [];
    return {
      equipamento,
      movimentacoes,
      totalMovimentacoes: movimentacoes.length,
    };
  }

  atualizarEstadoFisico(id: string, novoEstado: EstadoFisico, justificativa = ''): Equipamento | null {
    const equipamentos = this.repositorio.listarEntidades('equipamentos.json') as Equipamento[];
    const equipamento = equipamentos.find((item) => item.id === id);
    if (!equipamento) return null;

    const diferenca = Math.abs(novoEstado - equipamento.estadoFisico);
    if (diferenca >= 2 && (!justificativa || justificativa.trim().length === 0)) {
      throw new Error('Justificativa obrigatória para mudança de 2 ou mais categorias de estado físico.');
    }

    equipamento.estadoFisico = novoEstado;
    equipamento.historicoMovimentacao.push({
      id: `${equipamento.id}-${Date.now()}`,
      equipamentoId: equipamento.id,
      dataHora: new Date(),
      origem: String(equipamento.estadoFisico),
      destino: String(novoEstado),
      responsavel: 'sistema',
      observacao: justificativa || 'Atualização de estado',
    });

    this.repositorio.salvarEntidade('equipamentos.json', equipamentos);
    return equipamento;
  }

  permitirDesmonte(id: string): boolean {
    const equipamentos = this.repositorio.listarEntidades('equipamentos.json') as Equipamento[];
    const equipamento = equipamentos.find((item) => item.id === id);
    if (!equipamento) return false;

    const lotes = this.repositorio.listarEntidades('lotes.json') as Lote[];
    const lote = lotes.find((item) => item.id === equipamento.loteId);
    if (!lote) return false;

    return lote.statusProcessamento === StatusLote.TRIAGEM_CONCLUIDA;
  }

  atualizarStatusRastreamento(id: string, novoStatus: StatusRastreamento): boolean {
    const equipamentos = this.repositorio.listarEntidades('equipamentos.json') as Equipamento[];
    const equipamento = equipamentos.find((item) => item.id === id);
    if (!equipamento) return false;

    if (novoStatus === StatusRastreamento.EM_DESMONTE && !this.permitirDesmonte(id)) {
      return false;
    }

    const origem = equipamento.statusRastreamento;
    equipamento.statusRastreamento = novoStatus;
    equipamento.historicoMovimentacao.push({
      id: `${equipamento.id}-${Date.now()}`,
      equipamentoId: equipamento.id,
      dataHora: new Date(),
      origem,
      destino: novoStatus,
      responsavel: 'sistema',
      observacao: `Atualização de status para ${novoStatus}`,
    });

    this.repositorio.salvarEntidade('equipamentos.json', equipamentos);
    return true;
  }

  gerarCodigoBarras(tipo: string, sequencia: number): string {
    return `${tipo}-${sequencia.toString().padStart(6, '0')}`;
  }
}
