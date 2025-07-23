import crypto from 'crypto';

/**
 * Simple encryption utility for securing sensitive data
 * Uses AES-256-CBC with proper IV handling
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly IV_LENGTH = 16;
  
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    return Buffer.from(key, 'utf8');
  }

  /**
   * Encrypt sensitive data
   * Format: IV:EncryptedData
   */
  static encrypt(text: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * Expects format: IV:EncryptedData
   */
  static decrypt(encryptedText: string): string {
    try {
      console.log('🔓 DEBUG - Starting decryption process...');
      console.log('- Input encrypted text length:', encryptedText.length);
      console.log('- Input preview:', encryptedText.substring(0, 100) + '...');
      
      const key = this.getEncryptionKey();
      console.log('- Encryption key length:', key.length);
      console.log('- Encryption key preview:', key.toString('hex').substring(0, 16) + '...');
      
      const parts = encryptedText.split(':');
      console.log('- Split parts count:', parts.length);
      
      if (parts.length !== 2) {
        console.error('❌ DEBUG - Invalid format, expected IV:EncryptedData but got', parts.length, 'parts');
        throw new Error('Invalid encrypted data format - expected IV:EncryptedData');
      }
      
      console.log('- IV part (hex):', parts[0]);
      console.log('- Encrypted data part length:', parts[1].length);
      console.log('- Encrypted data preview:', parts[1].substring(0, 50) + '...');
      
      const iv = Buffer.from(parts[0], 'hex');
      console.log('- IV buffer length:', iv.length);
      console.log('- IV buffer:', iv.toString('hex'));
      
      const encryptedData = parts[1];
      
      console.log('- Creating decipher with algorithm:', this.ALGORITHM);
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      
      console.log('- Updating decipher...');
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      console.log('- First update result length:', decrypted.length);
      
      console.log('- Finalizing decipher...');
      decrypted += decipher.final('utf8');
      console.log('- Final decrypted length:', decrypted.length);
      console.log('- Decrypted preview:', decrypted.substring(0, 100) + '...');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error details:', error);
      console.error('- Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('- Error message:', error instanceof Error ? error.message : String(error));
      console.error('- Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Test if encrypted data can be decrypted with current key
   */
  static testDecryption(encryptedText: string): boolean {
    try {
      this.decrypt(encryptedText);
      return true;
    } catch (error) {
      return false;
    }
  }
}