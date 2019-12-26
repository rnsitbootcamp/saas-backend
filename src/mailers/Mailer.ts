import * as ejs from "ejs";
import * as fs from "fs";

import MailTemplate from "../models/MailTemplate";

import logger from "../services/LoggerService";
import Queue from "../services/Queue";

const S = "[Mailer]";

export default class Mailer {

    public toEmail: string;
    public fromEmail: string;
    public subject: string;
    public html: string;
    public attachments: Array<{ filename?: string, content?: string }>;
    public constructor(email: string) {
        if (!email) { throw new Error("Email is required."); }
        this.toEmail = email;
        this.fromEmail = process.env.FROM_EMAIL || "POP Probe<no-reply@popprobe.com>";
    }

    public send() {
        const M = `${S}[send]`;
        Queue.create("email", {
            subject: this.subject,
            to: this.toEmail,
            from: this.fromEmail,
            html: this.html,
            attachments: this.attachments
        }).priority("high").attempts(5).removeOnComplete(true).save((error) => {
            if (error) {
                logger.error(M, error);
            }
        });
    }

    public getTemplate(key: string, variables, defaultSubject) {
        const M = `${S}[getTemplate]`;
        return new Promise(async (resolve, reject) => {
            const template: any = await MailTemplate.findOne({ key });
            // No template in database
            if (!template) {
                logger.error(M, `Tried to send mail to user ${this.toEmail}, but the template ${key} was not found`);
                throw new Error(`Email template ${key} not found.`);
            }
            fs.readFile(template.path, (error, html) => {
                if (error) {
                    return reject(error);
                }
                this.html = ejs.render(html.toString(), variables);
                this.subject = template.subject || defaultSubject;
                return resolve(template);
            });
        });
    }
}
