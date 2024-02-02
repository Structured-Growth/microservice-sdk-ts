import { SearchResultInterface } from "./search-result.interface";

export interface RepositoryInterface<TModel, TSearchParams, TCreateParams> {
	search(params: TSearchParams): Promise<SearchResultInterface<TModel>>;

	create(params: TCreateParams): Promise<TModel>;

	read(id: number): Promise<TModel>;

	update(id: number, params: Partial<TCreateParams>): Promise<TModel>;

	delete(id: number): Promise<void>;
}
