import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly encryptionKey: Buffer;

  constructor(config: ConfigService) {
    const keySource =
      config.get<string>('ENCRYPTION_KEY') ?? config.getOrThrow<string>('JWT_SECRET');
    // Derive a 32-byte key via SHA-256 for AES-256-GCM
    this.encryptionKey = createHash('sha256').update(keySource).digest();
  }

  /**
   * Encrypt plaintext using AES-256-GCM.
   * Returns a string in the format: `iv:authTag:ciphertext` (all hex-encoded).
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
  }

  /**
   * Decrypt a string previously encrypted with `encrypt()`.
   */
  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }
}
