import { RegionEnum } from "../../interfaces";

export interface AuthenticatedAccountInterface {
	id: number;
	orgId: number;
	region: RegionEnum;
	firstName: string;
	lastName: string;
	email: string;
	image: string | null;
	tags: string[];
	arn: string;
}
