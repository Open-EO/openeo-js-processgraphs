const Utils = require('../src/utils');

describe('Utils Tests', () => {

	let param1 = {from_parameter: "123"};
	let result1 = {from_node: "123"};

	test('getType', () => {
		expect(Utils.getType(null)).toBe('null');
		expect(Utils.getType(123)).toBe('number');
		expect(Utils.getType(123.45)).toBe('number');
		class X {}
		expect(Utils.getType(new X())).toBe('object');
		expect(Utils.getType({})).toBe('object');
		expect(Utils.getType(param1)).toBe('parameter');
		expect(Utils.getType(result1)).toBe('result');
		expect(Utils.getType({process_graph: {}})).toBe('callback');
		expect(Utils.getType([])).toBe('array');
		expect(Utils.getType(true)).toBe('boolean');
		expect(Utils.getType("123")).toBe('string');
		expect(Utils.getType(() => {})).toBe('function');
		expect(Utils.getType(Utils)).toBe('function');
		expect(Utils.getType(undefined)).toBe('undefined');
	});

	let paramDeep1 = [{deep: param1}, param1, {deep: {deeper: param1 }}];
	let noRef = [{foo: "bar"}, {hello: 123}];
	let from_x = {from_parameter: "x"};
	let subProcess = {
		process_graph: {
			absolute: {
				process_id: "absolute",
				arguments: {
					x: from_x
				},
				result: true
			}
		}
	};
	let pg = {
		process_graph: {
			example: {
				process_id: "apply",
				arguments: {
					data: {},
					process: subProcess,
					context: result1
				},
				result: true
			}
		}
	};
	let pg2 = {
		process_graph: {
			example: {
				process_id: "apply",
				arguments: {
					data: {},
					process: subProcess
				},
				result: true
			}
		}
	};
	let deepRefs = [result1, from_x];
	let shallowRefs = [result1];
	test('getRefs', () => {
		compareRefs(Utils.getRefs(param1), [param1]);
		compareRefs(Utils.getRefs(paramDeep1), [param1]);
		compareRefs(Utils.getRefs(result1), [result1]);
		compareRefs(Utils.getRefs(noRef), []);
		compareRefs(Utils.getRefs(null), []);
		compareRefs(Utils.getRefs("from_parameter"), []);
		compareRefs(Utils.getRefs(pg, false), shallowRefs);
		compareRefs(Utils.getRefs(pg, true), deepRefs);
		compareRefs(Utils.getRefs(pg2, false), []);
	});

	test('containsRef', () => {
		expect(Utils.containsRef(param1)).toEqual(true);
		expect(Utils.containsRef(paramDeep1)).toEqual(true);
		expect(Utils.containsRef(result1)).toEqual(true);
		expect(Utils.containsRef(noRef)).toEqual(false);
		expect(Utils.containsRef(null)).toEqual(false);
		expect(Utils.containsRef("from_parameter")).toEqual(false);
		expect(Utils.containsRef(pg, false)).toEqual(true);
		expect(Utils.containsRef(pg, true)).toEqual(true);
		expect(Utils.containsRef(pg2, false)).toEqual(false);
		expect(Utils.containsRef(pg2, true)).toEqual(true);
	});

});

function sortRefs(arr) {
	if (!Array.isArray(arr)) {
		return arr;
	}
	return arr.map(e => {
		let key = Object.keys(e)[0];
		return key + ":" + e[key];
	}).sort();
}

function compareRefs(arr1, arr2) {
	expect(sortRefs(arr1)).toEqual(sortRefs(arr2));
}