const Utils = require('../src/utils.js');


describe('Utils Tests', () => {
	test('Test compareVersion', () => {
		expect(Utils.compareVersion("0.3.x", "0.3")).toBe(0);
		expect(Utils.compareVersion("0.3.x", "0.4")).toBe(-1);
		expect(Utils.compareVersion("0.3.0", "0.3")).toBe(0);
		expect(Utils.compareVersion("0.3.x", "0.3.1")).toBe(0);
		expect(Utils.compareVersion("0.3.1", "0.3")).toBe(1);
		expect(Utils.compareVersion("0.3", "")).toBeNull();
		expect(Utils.compareVersion("0.3", null)).toBeNull();
	});
});