import {EventEmitter} from 'events';
import test from 'ava';
import browser from './browser';
import node from './';

const implementations = {browser, node};

const mocks = {
	node() {
		const ee = new EventEmitter();

		return {
			mock: {
				on(name, handler) {
					ee.on(name, handler);
				}
			},
			unhandled({promise, reason}) {
				ee.emit('unhandledRejection', reason, promise);
			},
			handled({promise}) {
				ee.emit('rejectionHandled', promise);
			}
		};
	},
	browser() {
		const ee = new EventEmitter();

		return {
			mock: {
				addEventListener(name, handler) {
					ee.on(name, handler);
				}
			},
			unhandled({promise, reason}) {
				ee.emit('unhandledrejection', {promise, reason});
			},
			handled({promise, reason}) {
				ee.emit('rejectionhandled', {promise, reason});
			}
		};
	}
};

function event(reason) {
	return {
		promise: {},
		reason: reason
	};
}

function generateTests(type) {
	function setup() {
		const mock = mocks[type]();
		const currentlyUnhandled = implementations[type](mock.mock);

		const reasons = () => currentlyUnhandled().map(obj => obj.reason);
		const messages = () => currentlyUnhandled().map(obj => obj.reason.message);
		const promises = () => currentlyUnhandled().map(obj => obj.promise);

		return {mock, currentlyUnhandled, reasons, messages, promises};
	}

	test(`${type}: adds promises as they are rejected`, t => {
		const {mock, currentlyUnhandled, messages} = setup();

		const event1 = event(new Error('foo'));
		mock.unhandled(event1);

		let unhandled = currentlyUnhandled();

		t.is(unhandled.length, 1);
		t.is(unhandled[0].promise, event1.promise);
		t.is(unhandled[0].reason.message, 'foo');

		const event2 = event(new Error('bar'));
		mock.unhandled(event2);

		t.is(currentlyUnhandled().length, 2);
		t.deepEqual(messages(), ['foo', 'bar']);
	});

	function removalMacro(t, index, expected) {
		const {mock, messages} = setup();

		const events = [
			event(new Error('foo')),
			event(new Error('bar')),
			event(new Error('baz'))
		];

		events.forEach(mock.unhandled);

		t.deepEqual(messages(), ['foo', 'bar', 'baz']);

		mock.handled(events[index]);

		t.deepEqual(messages(), expected);
	}

	test(`${type}: removes promises as they are handled (from beginning)`, removalMacro, 0, ['bar', 'baz']);
	test(`${type}: removes promises as they are handled (from middle)`, removalMacro, 1, ['foo', 'baz']);
	test(`${type}: removes promises as they are handled (from middle)`, removalMacro, 2, ['foo', 'bar']);
}

generateTests('browser');
generateTests('node');

