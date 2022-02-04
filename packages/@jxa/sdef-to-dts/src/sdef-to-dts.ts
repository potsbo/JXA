const parseXml = require('@rgrove/parse-xml');
const camelCaseLib = require('camelcase');
const isVarName = require("is-var-name");
const indentString = require('indent-string');

import { compile, JSONSchema } from 'json-schema-to-typescript'

const camelCase = (text: string) => {
    const camelCased = camelCaseLib(text);
    const UPPER_CASE = /([A-Z]{2,})/;
    const match = text.match(UPPER_CASE);
    if (match && match[1]) {
        return camelCased.replace(new RegExp(match[1], "i"), match[1]);
    }
    return camelCased;
};

const pascalCase = (text: string) => {
    const camelCased = camelCaseLib(text, { pascalCase: true });
    const UPPER_CASE = /([A-Z]{2,})/;
    const match = text.match(UPPER_CASE);
    if (match && match[1]) {
        return camelCased.replace(new RegExp(match[1], "i"), match[1]);
    }
    return camelCased;
};

interface Node {
    type: string;

    [index: string]: any;
}

interface RootNode extends Node {
    attributes: any;
    children: {
        type: string,
        children: RootNode;
        [index: string]: any
    }[];
}

const isCommand = (node: Node): node is Command => {
    return node.name === "command";
};
const isRecord = (node: Node): node is Record => {
    return node.name === "record-type";
};
const isClass = (node: Node): node is Class => {
    return node.name === "class";
};
const isClassExtension = (node: Node): node is ClassExtension => {
    return node.name === "class-extension";
};
const isEnumerationExtension = (node: Node): node is Enumeration => {
    return node.name === "enumeration";
};


interface Command extends RootNode {
    name: "command";
}

interface Record extends RootNode {
    name: "record";
}

interface ClassExtension extends RootNode {
    name: "class-extension";
}

interface Class extends RootNode {
    name: "class";
}

interface Enumeration extends RootNode {
    name: "enumeration";
}

const convertJSONSchemaType = (type: string, typeDefs: any): { type: string, enum?: string[] } | { tsType: string } => {
    if (typeDefs[type]) {
        return { type: "string", enum: typeDefs[type].enums };
    }
    switch (type) {
        case "type":
        case "text":
            return { type: "string" };
        case "real":
            return { type: "number" };
        case "number":
        case "integer":
            return { type: "integer" };
        case "boolean":
            return { type: "boolean" };
        case "rectangle":
        case "Any":
        case "any":
        case "record":
        case "alias":
        case "bounding rectangle":
        case "RGB color":
        case "RGBColor":
        case "type class":
            return { type: "any" };
    }
    if (typeof type !== "string") {
        return { type: "any" };
    }
    return { tsType: pascalCase(type) };
};
const convertType = (type: string, namespace: string, definedJSONSchemaList: JSONSchema[]): "number" | "string" | "boolean" | string => {
    switch (type) {
        case "text":
            return "string";
        case "number":
        case "integer":
            return "number";
        case "boolean":
            return "boolean";
        case "Any":
        case "RGB color":
        case "type class":
            return "any";
    }
    const otherType = pascalCase(type);
    // avoid to use undefined type
    const isTypeDefinedAsRecord = definedJSONSchemaList.some((schema) => {
        return schema.title === otherType;
    });
    return isTypeDefinedAsRecord ? `${namespace}.${otherType}` : "any";
};

const createOptionalParameter = (name: string, parameters: Node[], typeDefs: { [key: string]: { enums: string[] } }): Promise<string | null> => {
    if (parameters.length === 0) {
        return Promise.resolve(null);
    }
    const propertyMap = parameters.map(param => {
        return {
            name: camelCase(param.attributes.name),
            description: param.attributes.description,
            typeInfo: convertJSONSchemaType(param.attributes.type, typeDefs)
        }
    });
    const properties: { [index: string]: any } = {};
    propertyMap.forEach(prop => {
        properties[prop.name] = {
            ...prop.typeInfo,
            description: prop.description
        }
    });
    const required = parameters.filter(param => {
        return param.attributes.optional !== "yes"
    }).map(param => {
        return camelCase(param.attributes.name);
    });
    return compile({
        "title": name,
        "type": "object",
        "properties": properties,
        "additionalProperties": false,
        "required": required
    }, name)
};


const recordToJSONSchema = (command: Record | Class | ClassExtension, typeDefs: { [key: string]: { enums: string[] } }): JSONSchema => {
    // https://www.npmjs.com/package/json-schema-to-typescript
    const pascalCaseName = isClassExtension(command) ? pascalCase(command.attributes.extends) : pascalCase(command.attributes.name);
    const description = command.attributes.description;
    const propertiesList = command.children.filter(node => {
        return node.type === "element" && node.name === "property" && typeof node.attributes === "object";
    });
    const propertyMap = propertiesList.map(param => {
        return {
            name: camelCase(param.attributes.name),
            description: param.attributes.description,
            typeInfo: convertJSONSchemaType(param.attributes.type, typeDefs),
            enum: typeDefs[param.attributes.type]?.enums,
        }
    });

    const properties: { [index: string]: any } = {};
    propertyMap.forEach(prop => {
        properties[prop.name] = {
            ...prop.typeInfo,
            description: prop.description,
        }

        if (prop.enum) {
            properties[prop.name].enum = prop.enum;
        }
    });
    const required = propertiesList.filter(param => {
        return param.attributes.optional !== "yes"
    }).map(param => {
        return camelCase(param.attributes.name);
    });
    return {
        "title": pascalCaseName,
        "description": description,
        "type": "object",
        "properties": properties,
        "additionalProperties": false,
        "required": required
    }
};

const commandToDeclare = async (namespace: string, command: Command, recordSchema: JSONSchema[], optionalMap: Map<string, number>, typeDefs: any): Promise<{
    header: string;
    body: string;
}> => {
    // https://www.npmjs.com/package/json-schema-to-typescript
    const name = camelCase(command.attributes.name);
    const pascalCaseName = camelCaseLib(command.attributes.name, { pascalCase: true });
    const description = command.attributes.description;
    const directParameters = command.children.filter(node => {
        return node.type === "element" && node.name === "direct-parameter" && typeof node.attributes === "object";
    });
    const directParametersArgs = directParameters.map(param => {
        const optionalMark = param.attributes.optional === "yes" ? "?" : "";
        // TODO: support direct parameters as object
        if (param.attributes.type === undefined) {
            return `${camelCase(param.name)}${optionalMark}: {}`
        }
        const argType = convertType(param.attributes.type, namespace, recordSchema);
        return `${camelCase(param.name)}${optionalMark}: ${argType}`;
    });
    const directParametersDocs = directParameters.map(param => {
        return `  * @param ${camelCase(param.name)} ${param.attributes.description}`
    });
    const parameters = command.children.filter(node => {
        return node.type === "element" && node.name === "parameter" && typeof node.attributes === "object";
    });
    let optionalParameterTypeName = `${pascalCaseName}OptionalParameter`;
    const optionalParameterTypeNameCount = optionalMap.get(optionalParameterTypeName) || 0;
    if (optionalParameterTypeNameCount > 0) {
        optionalParameterTypeName += String(optionalParameterTypeNameCount);
    }
    optionalMap.set(optionalParameterTypeName, optionalParameterTypeNameCount + 1);
    const optionalParameterType = await createOptionalParameter(optionalParameterTypeName, parameters, typeDefs);
    const optionalParameters = optionalParameterType ? `option?: ${namespace}.${optionalParameterTypeName}` : "";
    const optionalParameterDoc = optionalParameterType ? `* @param option` : "";
    const result = command.children.filter(node => {
        return node.type === "element" && node.name === "result";
    });
    const resultDescription = result.length === 0 ? "" : `@return ${result[0].attributes.description}`;
    const createReturnType = (result: Node[]) => {
        if (result.length === 0 || !result[0].attributes.type) {
            return "void";
        }
        return convertType(result[0].attributes.type, namespace, recordSchema);
    };
    const returnType = createReturnType(result);
    return {
        header: optionalParameterType ? optionalParameterType : "",
        body: `
 /**
  * ${description}
${directParametersDocs.join("\n")}${
            optionalParameterDoc ? "\n  " + optionalParameterDoc : ""
            }
  * ${resultDescription}
  */
 ${name}(${directParametersArgs.join(", ")}${directParametersArgs.length > 0 ? ", " : ""}${optionalParameters}): ${returnType};`

    }
};


const schemaToInterfaces = async (schemas: JSONSchema[]): Promise<string> => {
    const results = await Promise.all(schemas.map(schema => {
        const title = schema.title!;
        return compile(schema, title).then(definition => {
            // TODO: prevent UIElement -> UiElement
            // https://github.com/bcherny/json-schema-to-typescript/blob/fadb879a5373f20fd9d1f441168494003e825239/src/utils.ts#L56
            return definition
                .replace(new RegExp(`interface ${title}`, "i"), `interface ${title}`)
                // Fix property to method: name -> name()
                .replace(/(\w+):(.*;)/g, "$1():$2");
        });
    }));
    return results.join("\n");
};
export const transform = async (namespace: string, sdefContent: string) => {
    if (!isVarName(namespace)) {
        throw new Error(`${namespace} can not to be used for namespace, because it includes invalid string.`);
    }
    const JSON = parseXml(sdefContent);
    const dictionary: RootNode = JSON.children[0];
    const suites = dictionary.children.filter(node => node.name === "suite");
    const commands: Command[] = [];
    const records: Record[] = [];
    const classes: Class[] = [];
    const classExtensions: ClassExtension[] = [];
    const enumerations: Enumeration[] = [];
    // TODO: support enum
    suites.forEach(suite => {
        suite.children.forEach((node: Node) => {
            if (isCommand(node)) {
                commands.push(node);
            } else if (isRecord(node)) {
                records.push(node);
            } else if (isClass(node)) {
                classes.push(node)
            } else if (isClassExtension(node)) {
                classExtensions.push(node);
            } else if (isEnumerationExtension(node)) {
                enumerations.push(node)
            }
        })
    });

    const typeDefs: { [key: string]: { enums: string[]} } = {};
    enumerations.forEach(e => {
        typeDefs[e.attributes.name] = {
            enums: e.children.filter(c => c.type === "element").map(c => c.attributes.name)
        };
    });
    const recordSchemaList = records.map(record => {
        return recordToJSONSchema(record, typeDefs);
    });
    const classSchemaList = classes.map(node => {
        return recordToJSONSchema(node, typeDefs);
    });
    const classExtendSchemaList = classExtensions.map(node => {
        return recordToJSONSchema(node, typeDefs);
    });
    const recordDefinitions = await schemaToInterfaces(recordSchemaList);
    const classDefinitions = await schemaToInterfaces(classSchemaList);
    const classExtensionDefinitions = await schemaToInterfaces(classExtendSchemaList);
    const optionalBindingMap = new Map<string, number>();
    const functionDefinitions = await Promise.all(commands.map(command => {
        return commandToDeclare(namespace, command, recordSchemaList.concat(classSchemaList, classExtendSchemaList), optionalBindingMap, typeDefs);
    }));
    const functionDefinitionHeaders = functionDefinitions.map(def => def.header);
    const functionDefinitionBodies = functionDefinitions.map(def => def.body);
    return `
export namespace ${namespace} {
    // Default Application
${indentString(`export interface Application {}`)}
    // Class
${indentString(classDefinitions)}    
    // CLass Extension
${indentString(classExtensionDefinitions)}    
    // Records
${indentString(recordDefinitions)}
    // Function options
${indentString(functionDefinitionHeaders.join("\n"), 4)}
}
export interface ${namespace} extends ${namespace}.Application {
    // Functions
${indentString(functionDefinitionBodies.join("\n"), 4)}
}
`;
};
