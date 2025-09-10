// /lib/mail.ts
import baseSendMail, { sendMail as sendMailObj, type SendMailOptions } from './mailer';

/** レガシー互換: 4引数 or オブジェクトの両対応 */
async function sendMail(...args: any[]) {
  if (typeof args[0] === 'string') {
    const [to, subject, html, text] = args as [string, string, string, string?];
    return sendMailObj({ to, subject, html, text });
  }
  const opts = args[0] as SendMailOptions;
  return sendMailObj(opts);
}

export { sendMail };
export default sendMail;
