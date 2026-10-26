import { MailErrorCategory } from '../../types/mail/index';

export interface ClassifiedMailError {
  category: MailErrorCategory;
  scope: 'GLOBAL' | 'REQUEST' | 'DAILY_LIMIT_REACHED';
  retryable: boolean;
  reason: string;
}

class EmailErrorClassifier {
  classifyError(error: any): ClassifiedMailError {
    const responseCode = error?.responseCode;
    const code = error?.code;
    const response = error?.response || '';

    /**
     * 1️⃣ AUTH / OAUTH — FATAL (GLOBAL)
     * Covers:
     * - Invalid / expired access token
     * - Revoked refresh token
     * - OAuth misconfiguration
     */
    if (
      code === 'EAUTH' ||
      responseCode === 535 ||
      responseCode === 401 ||
      responseCode === 403 ||
      response.includes('Invalid authentication') ||
      response.includes('No access token')
    ) {
      return {
        category: MailErrorCategory.AUTH_FATAL,
        scope: 'GLOBAL',
        retryable: false,
        reason: 'Gmail OAuth authentication failure'
      };
    }

    /**
     * 2️⃣ GMAIL QUOTA EXCEEDED — FATAL UNTIL RESET (GLOBAL)
     */
    if (responseCode === 454 && response.includes('Too many recipients')) {
      return {
        category: MailErrorCategory.PROVIDER_FATAL,
        scope: 'DAILY_LIMIT_REACHED',
        retryable: false,
        reason: 'Gmail daily sending quota exceeded'
      };
    }

    /**
     * 3️⃣ PROVIDER TEMPORARY FAILURE (GLOBAL)
     * Network / infra issues
     */
    if (
      code === 'ECONNECTION' ||
      code === 'ETIMEDOUT' ||
      code === 'EDNS' ||
      responseCode === 421
    ) {
      return {
        category: MailErrorCategory.PROVIDER_TEMPORARY,
        scope: 'GLOBAL',
        retryable: true,
        reason: 'Gmail service temporarily unavailable'
      };
    }

    /**
     * 4️⃣ INVALID ENVELOPE / RECIPIENTS — NON-RETRIABLE (REQUEST)
     * IMPORTANT: must be checked BEFORE generic 4xx handling
     */
    if (code === 'EENVELOPE') {
      return {
        category: MailErrorCategory.REQUEST_NON_RETRIABLE,
        scope: 'REQUEST',
        retryable: false,
        reason: 'Invalid or rejected recipient addresses'
      };
    }

    /**
     * 5️⃣ REQUEST-LEVEL RETRIABLE ERRORS
     * Temporary SMTP failures
     */
    if (responseCode && responseCode >= 400 && responseCode < 500) {
      return {
        category: MailErrorCategory.REQUEST_RETRIABLE,
        scope: 'REQUEST',
        retryable: true,
        reason: 'Temporary SMTP failure'
      };
    }

    /**
     * 6️⃣ PERMANENT REQUEST FAILURE (DEFAULT)
     */
    return {
      category: MailErrorCategory.REQUEST_NON_RETRIABLE,
      scope: 'REQUEST',
      retryable: false,
      reason: 'Permanent SMTP failure'
    };
  }
}

export default EmailErrorClassifier;
