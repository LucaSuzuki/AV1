import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

export class CriptografiaArquivo {
  cifrar(dados: string, chave: string): string {
    const key = createHash('sha256').update(chave).digest();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(dados, 'utf8')), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decifrar(dadosCifrados: string, chave: string): string {
    const [ivHex, encryptedHex] = dadosCifrados.split(':');
    const key = createHash('sha256').update(chave).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  gerarChave(): string {
    return randomBytes(32).toString('hex');
  }
}
