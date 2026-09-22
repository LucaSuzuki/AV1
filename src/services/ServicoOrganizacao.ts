import { Organizacao } from '../core/Organizacao';
import { RepositorioArquivo } from '../infra/RepositorioArquivo';
import { ValidadorCNPJ } from '../validators/ValidadorCNPJ';

export class ServicoOrganizacao {
  repositorio: RepositorioArquivo;
  validadorCNPJ: ValidadorCNPJ;

  constructor(repositorio: RepositorioArquivo) {
    this.repositorio = repositorio;
    this.validadorCNPJ = new ValidadorCNPJ();
  }

  cadastrarOrganizacao(dados: Partial<Organizacao> & { razaoSocial: string; cnpj: string; inscricaoEstadual: string; enderecoCompleto: string; telefone: string; email: string; }): Organizacao | null {
    if (!this.validadorCNPJ.validar(dados.cnpj ?? '')) {
      return null;
    }

    const organizacoes = this.repositorio.listarEntidades('organizacoes.json') as Organizacao[];
    const jaExiste = organizacoes.some((item) => item.cnpj === (dados.cnpj ?? '').replace(/\D/g, ''));
    if (jaExiste) {
      return null;
    }

    const organizacao = new Organizacao({ ...dados, cnpj: (dados.cnpj ?? '').replace(/\D/g, '') });
    organizacoes.push(organizacao);
    this.repositorio.salvarEntidade('organizacoes.json', organizacoes);
    return organizacao;
  }

  buscarOrganizacao(id: string): Organizacao | null {
    const organizacoes = this.repositorio.listarEntidades('organizacoes.json') as Organizacao[];
    return organizacoes.find((item) => item.id === id) ?? null;
  }

  listarOrganizacoesAtivas(): Organizacao[] {
    const organizacoes = this.repositorio.listarEntidades('organizacoes.json') as Organizacao[];
    return organizacoes.filter((item) => item.ativo);
  }

  renovarContrato(organizacaoId: string, novoVencimento: Date): Organizacao | null {
    const organizacao = this.buscarOrganizacao(organizacaoId);
    if (!organizacao) return null;
    if (!organizacao.contratoVigente) {
      return null;
    }
    organizacao.contratoVigente.renovar(novoVencimento);
    return organizacao;
  }
}
