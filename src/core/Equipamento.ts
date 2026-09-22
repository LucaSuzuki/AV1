import { randomUUID } from 'node:crypto';

import { EstadoFisico, ORDEM_ESTADO_FISICO, StatusRastreamento, TipoEquipamento } from '../enums/enums-domino';
import { Movimentacao } from './Movimentacao';

export class Equipamento {
  id: string;
  codigoBarrasInterno: string;
  tipo: TipoEquipamento;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  estadoFisico: EstadoFisico;
  pesoQuilogramas: number;
  loteId: string;
  posicaoNoLote: number;
  statusRastreamento: StatusRastreamento;
  historicoMovimentacao: Movimentacao[];

  constructor(dados: Partial<Equipamento> & { codigoBarrasInterno: string; tipo: TipoEquipamento; marca: string; modelo: string; anoFabricacao: number; estadoFisico: EstadoFisico; pesoQuilogramas: number; loteId: string; posicaoNoLote: number; statusRastreamento: StatusRastreamento; }) {
    this.id = dados.id ?? randomUUID();
    this.codigoBarrasInterno = dados.codigoBarrasInterno;
    this.tipo = dados.tipo;
    this.marca = dados.marca;
    this.modelo = dados.modelo;
    this.anoFabricacao = dados.anoFabricacao;
    this.estadoFisico = dados.estadoFisico;
    this.pesoQuilogramas = dados.pesoQuilogramas;
    this.loteId = dados.loteId;
    this.posicaoNoLote = dados.posicaoNoLote;
    this.statusRastreamento = dados.statusRastreamento;
    this.historicoMovimentacao = dados.historicoMovimentacao ?? [];
  }

  atualizarStatus(novoEstado: EstadoFisico, justificativa: string): void {
    const diferenca = Math.abs(novoEstado - this.estadoFisico);
    if (diferenca >= 2 && (!justificativa || justificativa.trim().length === 0)) {
      throw new Error('Justificativa obrigatória para alteração de 2 ou mais categorias de estado físico.');
    }
    this.estadoFisico = novoEstado;
    this.historicoMovimentacao.push(new Movimentacao({
      equipamentoId: this.id,
      origem: ORDEM_ESTADO_FISICO[this.estadoFisico] !== undefined ? String(this.estadoFisico) : 'DESCONHECIDO',
      destino: String(novoEstado),
      responsavel: 'sistema',
      observacao: justificativa || 'Atualização de estado',
    }));
  }

  registrarMovimentacao(destino: string, responsavel: string): void {
    this.historicoMovimentacao.push(new Movimentacao({
      equipamentoId: this.id,
      origem: this.statusRastreamento,
      destino,
      responsavel,
      observacao: `Movimentação para ${destino}`,
    }));
  }

  calcularDepreciacao(): number {
    const base = 100;
    const idade = Math.max(0, new Date().getFullYear() - this.anoFabricacao);
    const perda = idade * 5 + (this.estadoFisico * 4);
    return Math.min(base, Math.max(0, base - perda));
  }
}
