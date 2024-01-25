export const schemas = {
	ErrorInterface: {
		dataType: "refObject",
		properties: [
			{
				name: "code",
				required: true,
				type: { dataType: "double" },
				validators: {},
				deprecated: false,
				extensions: [],
			},
			{
				name: "name",
				required: true,
				type: { dataType: "string" },
				validators: {},
				deprecated: false,
				extensions: [],
			},
			{
				name: "message",
				required: true,
				type: { dataType: "string" },
				validators: {},
				deprecated: false,
				extensions: [],
			},
			{
				name: "stack",
				required: false,
				type: { dataType: "string" },
				validators: {},
				deprecated: false,
				extensions: [],
			},
		],
		refName: "ErrorInterface",
		deprecated: false,
	},
	ValidationErrorInterface: {
		dataType: "refObject",
		properties: [
			{
				name: "code",
				required: true,
				type: { dataType: "double" },
				validators: {},
				deprecated: false,
				extensions: [],
			},
			{
				name: "name",
				required: true,
				type: { dataType: "string" },
				validators: {},
				deprecated: false,
				extensions: [],
			},
			{
				name: "message",
				required: true,
				type: { dataType: "string" },
				validators: {},
				deprecated: false,
				extensions: [],
			},
			{
				name: "stack",
				required: false,
				type: { dataType: "string" },
				validators: {},
				deprecated: false,
				extensions: [],
			},
			{
				name: "validation",
				required: true,
				type: {
					dataType: "nestedObjectLiteral",
					properties: [],
					additionalProperties: { dataType: "array", elementType: { dataType: "string" } },
				},
				validators: {},
				deprecated: false,
				extensions: [],
			},
		],
		refName: "ValidationErrorInterface",
		deprecated: false,
	},
};
