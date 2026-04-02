import { RegionEnum } from "../../interfaces";
import { PrincipalTypeEnum } from "./principal-type.enum";

export interface GuestPrincipalInterface {
	id: number | string;
	orgId: number;
	parentOrgIds: number[];
	region: RegionEnum;
	type: PrincipalTypeEnum.GUEST;
	arn: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	image?: string | null;
}
