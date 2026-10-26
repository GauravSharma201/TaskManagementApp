export enum MailErrorCategory {
  AUTH_FATAL = 'AUTH_FATAL',
  PROVIDER_FATAL = 'PROVIDER_FATAL',
  PROVIDER_TEMPORARY = 'PROVIDER_TEMPORARY',
  REQUEST_RETRIABLE = 'REQUEST_RETRIABLE',
  REQUEST_NON_RETRIABLE = 'REQUEST_NON_RETRIABLE',
  UNKNOWN = 'UNKNOWN'
}

export type MailErrorScope = 'GLOBAL' | 'REQUEST' | 'DAILY_LIMIT_REACHED';

export type MailSendOutcome =
  | { status: 'SUCCESS' }
  | {
      status: 'FAILED';
      category: MailErrorCategory;
      scope: MailErrorScope;
      retryable: boolean;
      reason: string;
      raw: unknown;
    }
  | {
      status: 'PARTIAL_FAILURE';
      accepted: string[];
      rejected: string[];
      rejectedErrors?: unknown[];
    };
