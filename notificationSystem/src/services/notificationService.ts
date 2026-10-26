import { DomainEvent } from '../domain/events/domainEvents';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import eventBus from '../infrastructure/eventBus';
import { RoutingKeys } from '../infrastructure/rabbitMQ/routingKeys';
import logger from '../utils/logger';
import {
  NonRetriableNotificationError,
  RetriableNotificationError
} from '../errors/notificationError';

class NotificationService {
  private static templateCache = new Map();

  private static async fetchEmailTemplate(filename: string) {
    if (this.templateCache.has(filename))
      return this.templateCache.get(filename);
    const filePath = path.join(__dirname, `../templates/${filename}`);
    try {
      const source = await fs.promises.readFile(filePath, 'utf8');
      const template = handlebars.compile(source);
      this.templateCache.set(filename, template);
      return template;
    } catch (error) {
      const err = error instanceof Error ? error.message : error;
      logger.error('error reading email template file.', err);
      throw new NonRetriableNotificationError(
        `error reading email template file: ${err}`
      );
    }
  }

  static async userCreated(parsedMessage: DomainEvent) {
    // select template for user created.
    // push to the email notification.
    logger.info('fetching email template, for user creation ==>');
    const template = await this.fetchEmailTemplate(
      'user.account.creation.templates.hbs'
    );

    const { name, email, verificationLink } = parsedMessage?.payload?.data;
    if (!email || !verificationLink) {
      logger.error(
        'invalid payload, missing details like: email or verification link'
      );
      throw new NonRetriableNotificationError(
        'Invalid DomainEvent payload: missing email'
      );
    }
    const replacements = {
      firstName: name || 'User',
      appName: process.env['APP_NAME'] || 'Taskify',
      verificationLink: verificationLink,
      year: new Date().getFullYear()
    };

    logger.info('filling data in the email template');
    const html = template(replacements);

    const mailOptions = {
      to: email,
      subject: 'Welcome to MyApp – Verify Your Email',
      html: html
    };

    try {
      logger.info('publishing the email template to delivery exchange');
      await eventBus.notificationDeliveryPub.publish({
        type: 'email',
        payload: mailOptions,
        routingKey: RoutingKeys.emailNotifDeliveryRoute,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('error publishing user.created event: ', error);
      throw new RetriableNotificationError(
        'Error publishing the mesasge for delivery'
      );
    }
  }
}

export default NotificationService;
