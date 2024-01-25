import { RegionEnum } from "./region.enum";

export interface DefaultSearchParamsInterface {
	orgId: number;
	accountId: number;
	region?: RegionEnum;
	id?: number[];
	arn?: number[];
	/**
	 * @default 1
	 */
	page?: number;
	/**
	 * @default 20
	 */
	limit?: number;
	/**
	 * @default "createdAt"
	 */
	sort?: "createdAt" | "updatedAt";
	/**
	 * @default "desc"
	 */
	order?: "asc" | "desc";
}
