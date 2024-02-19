export interface EmailTransportInterface {
	send(params: { toEmail: string; fromEmail: string; subject: string; html: string; text?: string }): Promise<boolean>;
}
