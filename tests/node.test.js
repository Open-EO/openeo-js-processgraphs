const Node = require('../src/node');
const ProcessGraph = require('../src/processgraph');

var from_foo = { from_parameter: "foo" };
var fooDefault = "foobar";
var from_bar = { from_node: "bar" };
var from_x = { from_parameter: "x" };

var subProcess = {
	process_graph: {
		absolute: {
			process_id: "absolute",
			namespace: null,
			arguments: {
				x: from_x
			},
			result: true
		}
	}
};

var contextRefs = [from_foo,from_bar];
var contextAdditionals = [1, 2];
var contextObj = contextRefs.concat(contextAdditionals);
var contextResult = [fooDefault, undefined].concat(contextAdditionals);

var nodeObj = {
	process_id: "apply",
	namespace: null,
	arguments: {
		process: subProcess,
		context: contextObj,
		parameter: from_foo,
		result: from_bar,
		number: 123
	},
	description: "Test",
	result: true
};

var barNodeObj = {
	process_id: "bar",
	arguments: {}
};

var process = {
	parameters: [
		{
			name: "foo",
			default: fooDefault,
			optional: true
		}
	],
	process_graph: {
		"bar": barNodeObj,
		"example": nodeObj
	}
};

describe('Node tests', () => {
	test('Errors', () => {
		expect(() => new Node(null, 123)).toThrow();
		expect(() => new Node(null, "123")).toThrow();
		expect(() => new Node({}, "123")).toThrow();
	});

	var node;
	var pg;
	test('Parse', () => {
		pg = new ProcessGraph(process);
		expect(() => pg.parse()).not.toThrow();
		node = pg.getNode("example");
	});

	test('Basics', () => {
		expect(node instanceof Node).toBe(true);
		expect(node.process_id).toBe("apply");
		expect(node.description).toBe("Test");
		expect(node.isResultNode).toBeTruthy();
		expect(node.getProcessGraph()).toBe(pg);
		expect(node.getParent()).toBeNull();
		expect(node.isStartNode()).toBeFalsy();
		expect(node.isResultNode).toBeTruthy();
		expect(node.getPreviousNodes()).toEqual([pg.getNode("bar")]);
		expect(node.getNextNodes()).toEqual([]);
		expect(node.toJSON()).toEqual(nodeObj);
	});

	test('Argument handling', () => {
		expect(node.getArgumentNames()).toEqual(["process", "context", "parameter", "result", "number"]);

		expect(node.hasArgument("process")).toBeTruthy();
		expect(node.hasArgument("context")).toBeTruthy();
		expect(node.hasArgument("parameter")).toBeTruthy();
		expect(node.hasArgument("result")).toBeTruthy();
		expect(node.hasArgument("number")).toBeTruthy();
		expect(node.hasArgument("data")).toBeFalsy();

		expect(node.getArgumentType("process")).toEqual("callback");
		expect(node.getArgumentType("context")).toEqual("array");
		expect(node.getArgumentType("parameter")).toEqual("parameter");
		expect(node.getArgumentType("result")).toEqual("result");
		expect(node.getArgumentType("number")).toEqual("number");
		expect(node.getArgumentType("data")).toEqual("undefined");

		expect(node.getParsedArgument("process") instanceof ProcessGraph).toBeTruthy();
		expect(node.getParsedArgument("context")).toEqual(contextObj);
		expect(node.getParsedArgument("parameter")).toEqual(from_foo);
		expect(node.getParsedArgument("result")).toEqual(from_bar);
		expect(node.getParsedArgument("number")).toEqual(123);
		expect(node.getParsedArgument("data")).toBeUndefined();

		expect(node.getArgument("process") instanceof ProcessGraph).toBeTruthy();
		expect(node.getArgument("context")).toEqual(contextResult);
		expect(node.getArgument("parameter")).toEqual(fooDefault);
		expect(node.getArgument("result")).toBeUndefined();
		expect(node.getArgument("number")).toEqual(123);
		expect(node.getArgument("data")).toBeUndefined();
	});

	test('Raw Argument handling', () => {
		expect(node.getRawArgument("process")).toEqual(subProcess);
		expect(node.getRawArgument("context")).toEqual(contextObj);
		expect(node.getRawArgument("parameter")).toEqual(from_foo);
		expect(node.getRawArgument("result")).toEqual(from_bar);
		expect(node.getRawArgument("number")).toEqual(123);
		expect(node.getRawArgument("data")).toBeUndefined();
	});

	test('Refs', () => {
		expect(node.getArgumentRefs("process")).toEqual([]);
		expect(node.getArgumentRefs("context")).toEqual(contextRefs);
		expect(node.getRefs()).toEqual(contextRefs);
	});

	test('Description', () => {
		node.setDescription("");
		expect(node.getDescription()).toEqual("");
		node.setDescription("Foo Bar");
		expect(node.getDescription()).toEqual("Foo Bar");
		node.setDescription("");
		node.setDescription({});
		expect(node.getDescription()).toBeNull();
		node.setDescription("");
		node.setDescription(123);
		expect(node.getDescription()).toBeNull();
		node.setDescription("");
		node.setDescription(null);
		expect(node.getDescription()).toBeNull();
	});
});