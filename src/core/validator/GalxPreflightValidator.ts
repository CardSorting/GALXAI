import type { ProviderType } from '../contracts/GalxContracts';

export interface PreflightValidationResult {
  isValid: boolean;
  error?: string;
  detectedProvider?: ProviderType;
}

export class GalxPreflightValidator {
  /**
   * Validates raw API key format before encryption and storage.
   */
  public static validateKeyFormat(apiKey: string, expectedProvider?: ProviderType): PreflightValidationResult {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, error: 'API key is empty or not a string' };
    }

    const trimmed = apiKey.trim();
    if (trimmed.length < 12) {
      return { isValid: false, error: 'API key is too short to be valid' };
    }

    if (trimmed.startsWith('sk-')) {
      if (expectedProvider && expectedProvider !== 'openai') {
        return {
          isValid: false,
          error: `Key format matches OpenAI ('sk-...') but expected '${expectedProvider}'`,
          detectedProvider: 'openai'
        };
      }
      return { isValid: true, detectedProvider: 'openai' };
    }

    if (trimmed.startsWith('xai-')) {
      if (expectedProvider && expectedProvider !== 'xai-grok') {
        return {
          isValid: false,
          error: `Key format matches xAI Grok ('xai-...') but expected '${expectedProvider}'`,
          detectedProvider: 'xai-grok'
        };
      }
      return { isValid: true, detectedProvider: 'xai-grok' };
    }

    return {
      isValid: false,
      error: 'Unrecognized key format. Expected OpenAI key starting with "sk-" or xAI key starting with "xai-".'
    };
  }
}
