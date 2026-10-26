import nodemailer, { Transporter } from 'nodemailer';
import EmailErrorClassifier from './mailServiceErrorClassifier';
import { MailSendOutcome } from '../../types/mail/index';

interface sendMailPayload {
  to: string | string[];
  subject: string;
  html: any;
  text?: string;
}

class GmailProvider {
  public readonly name = 'gmail';

  private transporter: Transporter;
  private fromEmail: string;
  private errorClassifier: EmailErrorClassifier;

  constructor() {
    this.fromEmail = process.env['GMAIL_USER_MAIL_ID'] as string;

    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Shortcut for Gmail's SMTP settings - see Well-Known Services
      auth: {
        type: 'OAuth2',
        user: process.env['GMAIL_USER_MAIL_ID'],
        clientId: process.env['GMAIL_CLIENT_ID'],
        clientSecret: process.env['GMAIL_CLIENT_SECRET'],
        refreshToken: process.env['GMAIL_REFERSH_TOKEN']
      }
    });

    this.errorClassifier = new EmailErrorClassifier();
  }

  async send(payload: sendMailPayload): Promise<MailSendOutcome> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        ...(payload?.text ? { text: payload.text } : {})
      });

      // Partial failures
      if (info.rejected?.length) {
        return {
          status: 'PARTIAL_FAILURE',
          accepted: info.accepted,
          rejected: info.rejected,
          rejectedErrors: info.rejectedErrors
        };
      }

      return { status: 'SUCCESS' };
    } catch (error) {
      const classification = this.errorClassifier.classifyError(error);

      return {
        status: 'FAILED',
        ...classification,
        raw: error
      };
    }
  }

  async healthCheck() {
    try {
      await this.transporter.verify();
      console.log('SMTP connection is healthy');
      return { status: 'healthy' };
    } catch (error) {
      console.error('SMTP connection failed:', error);
      const err = error instanceof Error ? error.message : error;
      return { status: 'unhealthy', error: err };
    }
    // need to check whether the email service provider is available...
  }
}

export default GmailProvider;
