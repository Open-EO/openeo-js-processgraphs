const Utils = require('../src/utils');


describe('Utils Tests', () => {
	test('isObject', () => {
		class Test {}
		expect(Utils.isObject(null)).toBe(false); // null
		expect(Utils.isObject([])).toBe(false); // array
		expect(Utils.isObject(123)).toBe(false); // number
		expect(Utils.isObject(Math.min)).toBe(false); // function
		expect(Utils.isObject({})).toBe(true); // plain object
		expect(Utils.isObject(new Test())).toBe(true); // object instance
	});
	test('size', () => {
		expect(Utils.size(null)).toBe(0);
		expect(Utils.size({})).toBe(0);
		expect(Utils.size({a: 1, b: 2})).toBe(2);
		expect(Utils.size({a: 1, b: () => {}})).toBe(2);
		expect(Utils.size([])).toBe(0);
		expect(Utils.size([1,2,3])).toBe(3);
		expect(Utils.size(123)).toBe(0);
	});
	test('replacePlaceholders', () => {
		expect(Utils.replacePlaceholders(null)).toBe(null);
		expect(Utils.replacePlaceholders("Simpler Test")).toBe("Simpler Test");
		expect(Utils.replacePlaceholders("Eine Variable: {x}", {x: 123})).toBe("Eine Variable: 123");
		expect(Utils.replacePlaceholders("{multiple} {vars}: {undefined}", {multiple: "Multiple", vars: "Variables", more: "Unused"})).toBe("Multiple Variables: {undefined}");
	});
});