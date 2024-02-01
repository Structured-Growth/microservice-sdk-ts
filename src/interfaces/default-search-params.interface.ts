export interface DefaultSearchParamsInterface {
	orgId: number;
	accountId: number;
	id?: number[];
	/**
	 * Wildcards are allowed:
	 *
	 * `arn: ["*:us:*:*:entity-name/*"]`
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
	 * `sort: ["createdAt:asc", "id:desc"]`
	 *
	 * @default "createdAt:desc"
	 */
	sort?: string[];
}
