const Utils = require('../utils.js');

var MigrateProcesses = {

    // Always returns a copy of the input process object
    convertProcessToLatestSpec(originalProcess, version) {
        if (!version || typeof version !== 'string') {
            throw new Error("No version specified");
        }

        // Make sure we don't alter the original object
        var process = Object.assign({}, originalProcess);

        let isVersion03 = Utils.compareVersion(version, "0.3.x") === 0;
        // name => id
        if (isVersion03) {
            process.id = process.name;
            delete process.name;
        }

        // If process has no id => seems to be an invalid process, abort
        if (typeof process.id !== 'string' || process.id.length === 0) {
            return {};
        }

        // Set required field description if not a string
        if (typeof process.description !== 'string') {
            process.description = "";
        }

        // Parameters
        if (Utils.isObject(process.parameters)) {
            for(var key in process.parameters) {
                process.parameters[key] = upgradeParamAndReturn(process.parameters[key], version);
            }
        }
        else {
            process.parameters = {};
        }

        // Return value
        process.returns = upgradeParamAndReturn(process.returns, version);

        if (isVersion03) {
            // exception object
            if (Utils.isObject(process.exceptions)) {
                for(let key in process.exceptions) {
                    var e = process.exceptions[key];
                    if (typeof e.message === 'undefined') {
                        process.exceptions[key] = Object.assign({}, e, {
                            message: e.description
                        });
                    }
                }
            }
            // examples object
            if (Utils.isObject(process.examples)) {
                var examples = [];
                for(let key in process.examples) {
                    var old = process.examples[key];
                    var example = {
                        title: old.summary || key,
                        description: old.description
                    };
                    if (old.process_graph) {
                        example.process_graph = old.process_graph;
                    }
                    examples.push(example);
                }
                process.examples = examples;
            }

            // Fill parameter order
            if (typeof process.parameters === 'object' && !Array.isArray(process.parameter_order)) {
                var parameter_order = Object.keys(process.parameters);
                if (parameter_order.length > 1) {
                    process.parameter_order = parameter_order;
                }
            }
        }

        return process;
    }

};
    
function upgradeParamAndReturn(obj, version) {
    // Not an object => return minimum required fields
    if (!Utils.isObject(obj)) {
        return {
            description: "",
            schema: {}
        };
    }

    var param = Object.assign({}, obj);

    // v0.3 => v0.4: mime_type => media_type
    if (Utils.compareVersion(version, "0.3.x") === 0 && typeof param.mime_type !== 'undefined') {
        param.media_type = param.mime_type;
        delete param.mime_type;
    }

    // Set required fields if not valid yet
    if (typeof param.description !== 'string') {
        param.description = "";
    }
    if (typeof param.schema !== 'object' || !param.schema) {
        param.schema = {};
    }

    if (Utils.compareVersion(version, "0.4.x") <= 0) {
        // Remove anyOf/oneOf wrapper
        for(var type in {anyOf: null, oneOf: null}) {
            if (Array.isArray(param.schema[type])) {
                if (typeof param.schema.default !== 'undefined') {
                    param.default = param.schema.default;
                }
                param.schema = param.schema[type];
                break;
            }
        }

        // Remove default value from schema, add on parameter-level instead
        var moveMediaType = (Utils.compareVersion(version, "0.4.x") <= 0 && typeof param.media_type !== 'undefined');
        var schemas = Array.isArray(param.schema) ? param.schema : [param.schema];
        for(var i in schemas) {
            if (typeof schemas[i].default !== 'undefined') {
                param.default = schemas[i].default;
                delete schemas[i].default;
            }
            // v0.3 => v0.4: mime_type => media_type
            if (moveMediaType) {
                schemas[i].contentMediaType = param.media_type;
            }
            renameFormat(schemas[i]);
        }
        // Remove the media type, has been moved to JSON Schema above.
        if (moveMediaType) {
            delete param.media_type;
        }
    }

    return param;
}

function renameFormat(schema) {
    for(var i in schema) {
        if (i === 'format') {
            schema.subtype = schema.format;
            if (!['date-time', 'time', 'date', 'uri'].includes(schema.format)) {
                delete schema.format;
            }
        }
        else if (schema[i] && typeof schema[i] === 'object') {
            renameFormat(schema[i]);
        }
    }
}

module.exports = MigrateProcesses;