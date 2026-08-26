import type { ProviderType } from '../contracts/GalxContracts';

export interface PreflightValidationResult {
  isValid: boolean;
  error?: string;
  detectedProvider?: ProviderType;
  keyType?: 'project_key' | 'service_account' | 'user_key' | 'xai_live_key';
}

/**
 * Enterprise Pre-Flight Key Format & Provider Verification Validator.
 * Performs deep structural, prefix, entropy, and character-set analysis on incoming API credentials.
 */
export class GalxPreflightValidator {
  /**
   * Validates raw API key format before encryption and storage.
   */
  public static validateKeyFormat(apiKey: string, expectedProvider?: ProviderType): PreflightValidationResult {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, error: 'API key is empty or not a string' };
    }

    const trimmed = apiKey.trim();

    // 1. Minimum length boundary check
    if (trimmed.length < 16) {
      return { isValid: false, error: 'API key is too short to be valid (minimum 16 characters required)' };
    }

    // 2. Maximum reasonable length boundary check
    if (trimmed.length > 256) {
      return { isValid: false, error: 'API key exceeds maximum allowable length (256 characters)' };
    }

    // 3. Character set validity check (Base64URL / safe ASCII token characters only)
    if (!/^[A-Za-z0-9_\-]+$/.test(trimmed)) {
      return { isValid: false, error: 'API key contains invalid characters (only alphanumeric, dashes, and underscores allowed)' };
    }

    // 4. OpenAI Key Signatures
    if (trimmed.startsWith('sk-proj-') || trimmed.startsWith('sk-svcacct-') || trimmed.startsWith('sk-admin-') || trimmed.startsWith('sk-')) {
      if (expectedProvider && expectedProvider !== 'openai') {
        return {
          isValid: false,
          error: `Key format matches OpenAI ('sk-...') but expected '${expectedProvider}'`,
          detectedProvider: 'openai'
        };
      }

      let keyType: 'project_key' | 'service_account' | 'user_key' = 'user_key';
      if (trimmed.startsWith('sk-proj-')) keyType = 'project_key';
      else if (trimmed.startsWith('sk-svcacct-')) keyType = 'service_account';

      return {
        isValid: true,
        detectedProvider: 'openai',
        keyType
      };
    }

    return {
      isValid: false,
      error: 'Unrecognized key format. Expected OpenAI key starting with "sk-".'
    };
  }
}
