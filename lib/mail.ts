// /lib/mail.ts
import { sendMail as coreSendMail, type SendMailOptions } from "./mailer";

// 呼び出しシグネチャ（型オーバーロード）
export function sendMail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<unknown>;
export function sendMail(opts: SendMailOptions): Promise<unknown>;
export async function sendMail(...args: any[]) {
  // 旧式: sendMail(to, subject, html, text?)
  if (typeof args[0] === "string") {
    const [to, subject, html, text] = args as [string, string, string, string?];
    return coreSendMail({ to, subject, html, text });
  }
  // 新式: sendMail({ to, subject, html, ... })
  const opts = args[0] as SendMailOptions;
  return coreSendMail(opts);
}

export default sendMail;
