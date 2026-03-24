export interface CustomFieldValidateBody {
	entity: string;
	data: Record<string, unknown>;
	orgId?: number;
}
