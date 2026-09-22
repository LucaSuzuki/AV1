export interface EntidadeComId {
  id: string;
}

export interface DocumentoBasico {
  id?: string;
  dataCadastro?: Date;
  ativo?: boolean;
}

export interface OrganizacaoInput {
  id?: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  enderecoCompleto: string;
  telefone: string;
  email: string;
  dataCadastro?: Date;
  ativo?: boolean;
  contratoVigente?: any;
}

export interface LoteInput {
  id?: string;
  dataEntrada: Date;
  organizacaoId: string;
  notaFiscal: string;
  transportadora: string;
  equipamentos?: any[];
  statusProcessamento?: any;
  observacoes?: string;
}

export interface EquipamentoInput {
  id?: string;
  codigoBarrasInterno: string;
  tipo: any;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  estadoFisico: any;
  pesoQuilogramas: number;
  loteId: string;
  posicaoNoLote: number;
  statusRastreamento: any;
  historicoMovimentacao?: any[];
}
