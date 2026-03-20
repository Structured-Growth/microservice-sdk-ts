export interface AccountApiCustomFieldValidateBody {
	entity: string;
	data: Record<string, unknown>;
	orgId?: number;
}
