export type TipoResultadoOperacao = 'INFO' | 'SUCESSO' | 'AVISO' | 'ERRO';

export interface ResultadoOperacao {
  sucesso: boolean;
  mensagem: string;
  severidade: TipoResultadoOperacao;
  codigo?: number;
}

export interface PeriodoConsulta {
  inicio: Date;
  fim: Date;
}

export interface HistoricoCompleto {
  equipamento: any;
  movimentacoes: any[];
  totalMovimentacoes: number;
}
