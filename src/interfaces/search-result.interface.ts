export interface SearchResultInterface<T> {
	data: T[];
	page: number;
	limit: number;
	total?: number;
}
