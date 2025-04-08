import { render } from "@react-email/render";
import { resend } from "@/lib/clients/resend";
import type { JSX } from "react";
import type { CreateEmailOptions } from "resend";

type SendEmailOptions = Pick<CreateEmailOptions, "to" | "subject"> & {
  template: JSX.Element;
};

export async function sendEmail({ to, subject, template }: SendEmailOptions) {
  return resend.emails.send({
    // TODO: Setup myevent.now domain
    from: process.env.NOREPLY_EMAIL_SENDER!,
    to,
    subject,
    html: await render(template),
  });
}
