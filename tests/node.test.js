const Node = require('../src/node');

var contextObj = [
	{from_parameter: "foo"},
	{from_node: "bar"}
];

var nodeObj = {
	process_id: "apply",
	arguments: {
		process: {
			process_graph: {
				absolute: {
					process_id: "absolute",
					arguments: {
						x: {from_parameter: "x"}
					}
				}
			}
		},
		context: contextObj.concat([1,2])
	},
	description: "Test",
	result: true
};

describe('Node tests', () => {
  var node;
  test('Init', () => {
    node = new Node(nodeObj, "123", null);
    expect(node instanceof Node).toBe(true);
	expect(node.process_id).toBe("apply");
	expect(node.description).toBe("Test");
	expect(node.isResultNode).toBeTruthy();
    expect(node.getProcessGraph()).toBeNull();
	expect(node.getParent()).toBeNull();
	expect(node.isStartNode()).toBeTruthy();
	expect(node.getPreviousNodes()).toEqual([]);
	expect(node.getNextNodes()).toEqual([]);
  });
  test('Errors', () => {
    expect(() => new Node(null, 123)).toThrow();
    expect(() => new Node(null, "123")).toThrow();
    expect(() => new Node({}, "123")).toThrow();
  });
  test('General argument handling', () => {
    expect(node.getArgumentNames()).toEqual(["process", "context"]);
    expect(node.hasArgument("process")).toBeTruthy();
    expect(node.hasArgument("context")).toBeTruthy();
    expect(node.hasArgument("data")).toBeFalsy();
    expect(node.getArgumentType("process")).toBe("callback");
	expect(node.getArgumentType("context")).toBe("array");
	// getRawArgument(Value)
  });
  test('Refs', () => {
    expect(node.getArgumentRefs("process")).toEqual([]);
    expect(node.getArgumentRefs("context")).toEqual(contextObj);
    expect(node.getRefs()).toEqual(contextObj);
  });
});