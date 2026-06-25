import * as ts from "typescript";

const TYPE_FORMAT_FLAGS =
	ts.TypeFormatFlags.NoTruncation |
	ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
	ts.TypeFormatFlags.UseFullyQualifiedType;

interface RenderContext {
	seenTypeIds: Set<number>;
}

export function renderPayloadSchema(typeNode: ts.TypeNode, checker: ts.TypeChecker): string {
	const type = checker.getTypeFromTypeNode(typeNode);

	return renderType(type, typeNode, checker, 0, { seenTypeIds: new Set() });
}

function renderType(
	type: ts.Type,
	location: ts.Node,
	checker: ts.TypeChecker,
	indentLevel: number,
	context: RenderContext,
	omitUndefined = false
): string {
	const normalizedType = omitUndefined ? removeUndefinedType(type) : type;
	const renderedType = checker.typeToString(normalizedType, location, TYPE_FORMAT_FLAGS);

	if (renderedType === "boolean") {
		return renderedType;
	}

	if (checker.isArrayType(normalizedType)) {
		const [elementType] = checker.getTypeArguments(normalizedType as ts.TypeReference);
		return elementType ? `${renderType(elementType, location, checker, indentLevel, context)}[]` : renderedType;
	}

	if (checker.isTupleType(normalizedType)) {
		return renderedType;
	}

	if (normalizedType.isUnion()) {
		return normalizedType.types.map((item) => renderType(item, location, checker, indentLevel, context)).join(" | ");
	}

	if (shouldRenderObjectShape(normalizedType, checker)) {
		const typeId = getTypeId(normalizedType);
		if (typeId && context.seenTypeIds.has(typeId)) {
			return checker.typeToString(normalizedType, location, TYPE_FORMAT_FLAGS);
		}

		if (typeId) {
			context.seenTypeIds.add(typeId);
		}

		const rendered = renderObjectShape(normalizedType, location, checker, indentLevel, context);

		if (typeId) {
			context.seenTypeIds.delete(typeId);
		}

		return rendered;
	}

	return renderedType;
}

function renderObjectShape(
	type: ts.Type,
	location: ts.Node,
	checker: ts.TypeChecker,
	indentLevel: number,
	context: RenderContext
): string {
	const lines = checker.getPropertiesOfType(type).map((property) => {
		const declaration = property.valueDeclaration || property.declarations?.[0] || location;
		const optional = isOptionalProperty(property);
		const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);

		return `${indent(indentLevel + 1)}${property.getName()}${optional ? "?" : ""}: ${renderType(
			propertyType,
			declaration,
			checker,
			indentLevel + 1,
			context,
			optional
		)};`;
	});

	return `{\n${lines.join("\n")}\n${indent(indentLevel)}}`;
}

function removeUndefinedType(type: ts.Type): ts.Type {
	if (!type.isUnion()) {
		return type;
	}

	const definedTypes = type.types.filter((item) => (item.flags & ts.TypeFlags.Undefined) === 0);

	return definedTypes.length === 1 ? definedTypes[0] : type;
}

function shouldRenderObjectShape(type: ts.Type, checker: ts.TypeChecker): boolean {
	if (!checker.getPropertiesOfType(type).length) {
		return false;
	}

	const declarations = [...(type.aliasSymbol?.declarations || []), ...(type.getSymbol()?.declarations || [])];

	return declarations.some(
		(declaration) =>
			!declaration.getSourceFile().isDeclarationFile &&
			(ts.isInterfaceDeclaration(declaration) ||
				ts.isTypeLiteralNode(declaration) ||
				ts.isTypeAliasDeclaration(declaration))
	);
}

function isOptionalProperty(property: ts.Symbol): boolean {
	return (property.flags & ts.SymbolFlags.Optional) !== 0;
}

function getTypeId(type: ts.Type): number | undefined {
	return (type as ts.Type & { id?: number }).id;
}

function indent(level: number): string {
	return "  ".repeat(level);
}
