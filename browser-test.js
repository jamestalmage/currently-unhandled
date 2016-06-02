var assert = require('assert');
var delay = require('delay');
var fn = require('./');

it('works in a browser', function () {
	var currentlyUnhandled = fn();
	var messages = function () {
		return currentlyUnhandled().map(function (event) {
			return event.reason.message;
		});
	};
	var p1;
	var p2;

	p1 = Promise.reject(new Error('foo'));

	return delay(300).then(function () {
		assert.deepEqual(messages(), ['foo']);
		p2 = Promise.reject(new Error('bar'));
		return delay(300);
	}).then(function () {
		assert.deepEqual(messages(), ['foo', 'bar']);
		p1.catch(function () {});
		return delay(300);
	}).then(function () {
		assert.deepEqual(messages(), ['bar']);
		p2.catch(function () {});
		return delay(300);
	}).then(function () {
		assert.deepEqual(messages(), []);
	});
});
