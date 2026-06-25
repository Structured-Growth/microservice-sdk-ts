import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";
import { EmitsManifestEntryInterface } from "./emits-manifest.interface";
import { EMITS_MANIFEST_PATH } from "./read-emits-manifest";
import { renderPayloadSchema } from "./render-payload-schema";
import { container } from "tsyringe";
import { getRegisteredEmits } from "./emits.registry";

const DECORATOR_NAMES = new Set(["Emits"]);

interface TsConfigLoadResult extends ts.ParsedCommandLine {
	configPath: string;
}

export function generateEmitsManifest(): EmitsManifestEntryInterface[] {
	const { options, fileNames, errors } = loadTsConfig();
	if (errors.length > 0) {
		throw new Error(formatDiagnostics(errors));
	}

	const program = ts.createProgram(fileNames, options);
	const checker = program.getTypeChecker();
	const entries: EmitsManifestEntryInterface[] = [];

	for (const sourceFile of program.getSourceFiles()) {
		if (!shouldScanSourceFile(sourceFile.fileName)) {
			continue;
		}

		ts.forEachChild(sourceFile, (node) => visitNode(node, sourceFile, checker, entries));
	}

	fs.mkdirSync(path.dirname(EMITS_MANIFEST_PATH), { recursive: true });
	fs.writeFileSync(EMITS_MANIFEST_PATH, JSON.stringify(entries, null, 2));

	return entries;
}

function loadTsConfig(): TsConfigLoadResult {
	const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
	if (!configPath) {
		throw new Error("tsconfig.json not found");
	}

	const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
	if (readResult.error) {
		throw new Error(formatDiagnostics([readResult.error]));
	}

	return {
		...ts.parseJsonConfigFileContent(readResult.config, ts.sys, path.dirname(configPath)),
		configPath,
	};
}

function visitNode(
	node: ts.Node,
	sourceFile: ts.SourceFile,
	checker: ts.TypeChecker,
	entries: EmitsManifestEntryInterface[]
): void {
	if (!ts.isClassDeclaration(node) || !node.name) {
		ts.forEachChild(node, (child) => visitNode(child, sourceFile, checker, entries));
		return;
	}

	const className = node.name.text;

	for (const member of node.members) {
		if (!ts.isMethodDeclaration(member) || !member.name || !ts.isIdentifier(member.name)) {
			continue;
		}

		const decorators = ts.canHaveDecorators(member) ? ts.getDecorators(member) || [] : [];
		for (const decorator of decorators) {
			const entry = extractEmitEntry(decorator, className, member.name.text, checker);
			if (entry) {
				entries.push(entry);
			}
		}
	}
}

function extractEmitEntry(
	decorator: ts.Decorator,
	className: string,
	targetName: string,
	checker: ts.TypeChecker
): EmitsManifestEntryInterface | null {
	const appPrefix = container.resolve<string>("appPrefix");

	if (!ts.isCallExpression(decorator.expression)) {
		return null;
	}

	const { expression, arguments: args, typeArguments } = decorator.expression;
	if (!ts.isIdentifier(expression) || !DECORATOR_NAMES.has(expression.text)) {
		return null;
	}

	const [eventArg] = args;
	if (!eventArg || !ts.isStringLiteralLike(eventArg)) {
		return null;
	}
	const event = `${appPrefix}:${eventArg.text}`;
	const registeredEmits = getRegisteredEmits();
	const registeredEmit = registeredEmits.find((i) => i.event === event);
	console.log(registeredEmits);
	const payloadTypeNode = typeArguments?.[0];

	return {
		event,
		resources: registeredEmit?.resources.map((model) => ({
			resource: model.name,
			arnPattern: model["arnPattern"] || "external resource",
		})),
		payloadSchema: payloadTypeNode ? renderPayloadSchema(payloadTypeNode, checker) : undefined,
		className,
		targetName,
	};
}

function shouldScanSourceFile(fileName: string): boolean {
	const normalizedFileName = path.normalize(fileName);
	const srcRoot = `${path.normalize(path.resolve(process.cwd(), "src"))}${path.sep}`;

	return normalizedFileName.startsWith(srcRoot) && !normalizedFileName.endsWith(".d.ts");
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
	return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
		getCanonicalFileName: (fileName) => fileName,
		getCurrentDirectory: () => process.cwd(),
		getNewLine: () => "\n",
	});
}
