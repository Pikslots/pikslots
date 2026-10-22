import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { err, ok, Result } from '@pikslots/domain';
import type { EmailSendingFailedError } from './errors';

export type EmailTemplateContextMap = {
  welcome: {
    firstName: string;
    email: string;
    role: string;
    acceptUrl: string;
  };
  'user-invite': {
    firstName: string;
    businessName: string;
    acceptUrl: string;
  };
  otp: {
    firstName: string;
    otp: string;
    otpExpiryInMins: number;
  };
  'booking-confirmation': {
    firstName: string;
    guestFullName: string;
    businessName: string;
    serviceName: string;
    bookingRef: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    teamMemberName: string;
    price: number;
    currency: string;
  };
};

export type SupportedEmailTemplates = keyof EmailTemplateContextMap;

export interface SendEmailOptions<T extends SupportedEmailTemplates> {
  to: string;
  subject: string;
  template: T;
  context: EmailTemplateContextMap[T];
}

@Injectable()
export class PikslotEmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail<T extends SupportedEmailTemplates>(
    options: SendEmailOptions<T>,
  ): Promise<Result<void, EmailSendingFailedError>> {
    try {
      await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context,
      });
      return ok(undefined);
    } catch (cause) {
      return err<EmailSendingFailedError>({
        kind: 'email_sending_failed',
        to: options.to,
        template: options.template,
        message: `Failed to send '${options.template}' email to ${options.to}`,
        timestamp: new Date(),
        cause,
      });
    }
  }
}
