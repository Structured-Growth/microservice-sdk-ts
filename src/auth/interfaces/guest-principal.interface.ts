import { PrincipalTypeEnum } from "./principal-type.enum";

export interface GuestPrincipalInterface {
	type: PrincipalTypeEnum.GUEST;
	arn: string;
}
