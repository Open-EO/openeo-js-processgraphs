const ErrorList = require('../src/errorlist');
const ProcessGraphError = require('../src/error');

describe('ErrorList test', () => {
  var el;
  test('Init', () => {
    el = new ErrorList();
    expect(el instanceof ErrorList).toBe(true);
    expect(el.first()).toBeNull();
    expect(el.last()).toBeNull();
    expect(el.count()).toBe(0);
    expect(el.toJSON()).toStrictEqual([]);
    expect(el.getMessage()).toBe("");
    expect(el.getAll()).toStrictEqual([]);
  });
  var msg1 = "Test";
  var e1 = new Error(msg1);
  test('Adding first error - native impl', () => {
    el.add(e1);
    expect(el.first()).toBe(e1);
    expect(el.last()).toBe(e1);
    expect(el.count()).toBe(1);
    expect(el.toJSON()).toStrictEqual([{
      code: 'InternalError',
      message: msg1
    }]);
    expect(el.getMessage()).toBe("1. Test");
    expect(el.getAll()).toStrictEqual([e1]);
  });
  var e2 = new ProcessGraphError("MultipleResultNodes");
  var msg2 = "Multiple result nodes specified for the process.";
  test('Adding second error - custom impl.', () => {
    el.add(e2);
    expect(el.first()).toBe(e1);
    expect(el.last()).toBe(e2);
    expect(el.count()).toBe(2);
    expect(el.toJSON()).toStrictEqual([
      {
        code: 'InternalError',
        message: msg1
      },
      {
        code: 'MultipleResultNodes',
        message: msg2
      }
    ]);
    expect(el.getMessage()).toBe("1. "+msg1+"\r\n2. "+msg2);
    expect(el.getAll()).toStrictEqual([e1, e2]);
  });
  test('Merge', () => {
    var msg3 = "1. App hat sich aufgehängt!";
    var e3 = new ProcessGraphError(msg3);
    var el2 = new ErrorList();
    el2.add(e3);

    el.merge(el2);
    expect(el.first()).toBe(e1);
    expect(el.last()).toBe(e3);
    expect(el.count()).toBe(3);
    expect(el.getMessage()).toBe("1. "+msg1+"\r\n2. "+msg2+"\r\n3. "+msg3);
    expect(el.toJSON()).toStrictEqual([
      {
        code: 'InternalError',
        message: msg1
      },
      {
        code: 'MultipleResultNodes',
        message: msg2
      },
      {
        code: '1Apphatsichaufgehngt',
        message: msg3
      }
    ]);
    expect(el.getAll()).toStrictEqual([e1, e2, e3]);
  });
});