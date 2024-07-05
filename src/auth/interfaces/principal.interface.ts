import { RegionEnum } from "../../interfaces";
import { PrincipalTypeEnum } from "./principal-type.enum";

export interface PrincipalInterface {
	id: number | string;
	orgId: number;
	region: RegionEnum;
	type: PrincipalTypeEnum;
	arn: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	image?: string | null;
}
