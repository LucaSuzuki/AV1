import * as fs from 'node:fs';
import * as path from 'node:path';

import { JournalTransacao } from '../core/JournalTransacao';
import { CriptografiaArquivo } from './CriptografiaArquivo';
import { Journaling } from './Journaling';

export class RepositorioArquivo {
  diretorioBase: string;
  criptografia: CriptografiaArquivo;
  chave: string;
  journaling?: Journaling;

  constructor(diretorioBase: string, criptografia: CriptografiaArquivo, chave: string, journaling?: Journaling) {
    this.diretorioBase = diretorioBase;
    this.criptografia = criptografia;
    this.chave = chave;
    this.journaling = journaling;
    fs.mkdirSync(diretorioBase, { recursive: true });
  }

  private obterCaminhoArquivo(nomeArquivo: string): string {
    return path.join(this.diretorioBase, nomeArquivo);
  }

  salvarEntidade(nomeArquivo: string, entidade: any): void {
    const caminho = this.obterCaminhoArquivo(nomeArquivo);
    const temp = `${caminho}.tmp`;
    const payload = JSON.stringify(entidade, null, 2);
    const cifrado = this.criptografia.cifrar(payload, this.chave);
    const antes = this.listarEntidades(nomeArquivo);

    fs.writeFileSync(temp, cifrado, 'utf8');
    fs.renameSync(temp, caminho);

    if (this.journaling) {
      this.journaling.registrarTransacao(new JournalTransacao({
        operacao: 'SAVE',
        entidade: nomeArquivo,
        dadosAntes: antes,
        dadosDepois: entidade,
        usuarioResponsavel: 'sistema',
      }));
    }
  }

  carregarEntidade(nomeArquivo: string, id: string): any | null {
    const caminho = this.obterCaminhoArquivo(nomeArquivo);
    if (!fs.existsSync(caminho)) return null;
    const conteudo = fs.readFileSync(caminho, 'utf8');
    const decifrado = this.criptografia.decifrar(conteudo, this.chave);
    const entidades = JSON.parse(decifrado) as any[];
    return entidades.find((item) => item.id === id) ?? null;
  }

  listarEntidades(nomeArquivo: string): any[] {
    const caminho = this.obterCaminhoArquivo(nomeArquivo);
    if (!fs.existsSync(caminho)) return [];
    try {
      const conteudo = fs.readFileSync(caminho, 'utf8');
      const decifrado = this.criptografia.decifrar(conteudo, this.chave);
      return JSON.parse(decifrado) as any[];
    } catch {
      return [];
    }
  }

  excluirEntidade(nomeArquivo: string, id: string): void {
    const caminho = this.obterCaminhoArquivo(nomeArquivo);
    if (!fs.existsSync(caminho)) return;
    const conteudo = fs.readFileSync(caminho, 'utf8');
    const decifrado = this.criptografia.decifrar(conteudo, this.chave);
    const entidades = JSON.parse(decifrado) as any[];
    const restante = entidades.filter((item) => item.id !== id);

    if (this.journaling) {
      this.journaling.registrarTransacao(new JournalTransacao({
        operacao: 'DELETE',
        entidade: nomeArquivo,
        dadosAntes: entidades,
        dadosDepois: restante,
        usuarioResponsavel: 'sistema',
      }));
    }

    this.salvarEntidade(nomeArquivo, restante);
  }
}
