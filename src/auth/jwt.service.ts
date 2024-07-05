import { sign, verify, decode } from "jsonwebtoken";

export class JwtService {
	constructor(private jwtSecret: string) {}

	public sing(payload: object) {
		return sign(payload, this.jwtSecret);
	}

	public verify(token: string): object {
		return verify(token, this.jwtSecret);
	}

	public decode(token: string): object {
		return decode(token);
	}
}
