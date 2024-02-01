export interface DefaultSearchParamsInterface {
	orgId: number;
	accountId: number;
	id?: number[];
	/**
	 * Wildcards are allowed:
	 *
	 * `arn: ["*:us:*:*:users/*"]`
	 */
	arn?: string[];
	/**
	 * @default 1
	 */
	page?: number;
	/**
	 * @default 20
	 */
	limit?: number;
	/**
	 * Sort data by multiple fields.
	 *
	 * `sort: ["createdAt:desc", "firstName:asc", "lastName:asc"]`
	 *
	 * @default "createdAt:desc"
	 */
	sort?: string[];
}
