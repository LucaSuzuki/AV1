import * as fs from 'node:fs';
import * as path from 'node:path';

import { JournalTransacao } from '../core/JournalTransacao';

export class Journaling {
  private readonly diretorioBase: string;
  private readonly arquivoJournal: string;
  private readonly maxBytes = 10 * 1024 * 1024;
  private readonly retencaoDias = 180;

  constructor(diretorioBase: string) {
    this.diretorioBase = diretorioBase;
    this.arquivoJournal = path.join(this.diretorioBase, 'journal.log');
    fs.mkdirSync(this.diretorioBase, { recursive: true });
    this.manterRetencao();
  }

  registrarTransacao(transacao: JournalTransacao): void {
    fs.mkdirSync(this.diretorioBase, { recursive: true });
    const linha = JSON.stringify({
      id: transacao.id,
      timestamp: transacao.timestamp,
      operacao: transacao.operacao,
      entidade: transacao.entidade,
      dadosAntes: transacao.dadosAntes,
      dadosDepois: transacao.dadosDepois,
      dataCadastro: transacao.dataCadastro,
      usuarioResponsavel: transacao.usuarioResponsavel,
      ativo: transacao.ativo,
    });

    fs.appendFileSync(this.arquivoJournal, `${linha}\n`, 'utf8');
    this.rotacionarSeNecessario();
  }

  private rotacionarSeNecessario(): void {
    if (!fs.existsSync(this.arquivoJournal)) return;

    const tamanho = fs.statSync(this.arquivoJournal).size;
    if (tamanho < this.maxBytes) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destino = path.join(this.diretorioBase, `journal-${timestamp}.log`);
    fs.renameSync(this.arquivoJournal, destino);
  }

  private manterRetencao(): void {
    if (!fs.existsSync(this.diretorioBase)) return;

    const limite = Date.now() - this.retencaoDias * 24 * 60 * 60 * 1000;
    for (const item of fs.readdirSync(this.diretorioBase)) {
      if (!item.startsWith('journal-') || !item.endsWith('.log')) continue;
      const caminho = path.join(this.diretorioBase, item);
      const stats = fs.statSync(caminho);
      if (stats.mtimeMs < limite) {
        fs.unlinkSync(caminho);
      }
    }
  }
}
