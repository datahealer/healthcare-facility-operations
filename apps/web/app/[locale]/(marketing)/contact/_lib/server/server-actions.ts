'use server';

import * as z from 'zod';

import { getMailer } from '@kit/mailers';
import { publicActionClient } from '@kit/next/safe-action';

import { ContactEmailSchema } from '../contact-email.schema';

const contactEmail = z
  .string({
    error:
      'Contact email is required. Please use the environment variable CONTACT_EMAIL.',
  })
  .parse(process.env.CONTACT_EMAIL);

const emailFrom = z
  .string({
    error:
      'Sender email is required. Please use the environment variable EMAIL_SENDER.',
  })
  .parse(process.env.EMAIL_SENDER);

export const sendContactEmail = publicActionClient
  .schema(ContactEmailSchema)
  .action(async ({ parsedInput: data }) => {
    const mailer = await getMailer();

    await mailer.sendEmail({
      to: contactEmail,
      from: emailFrom,
      subject: 'Contact Form Submission',
      html: `
        <p>
          You have received a new contact form submission.
        </p>

        <p>Name: ${data.name}</p>
        <p>Email: ${data.email}</p>
        <p>Message: ${data.message}</p>
      `,
    });

    return {};
  });
