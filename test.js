import fs from 'fs';
import path from 'path';
import {EventEmitter} from 'events';
import test from 'ava';
import delay from 'delay';
import isCi from 'is-ci';
import {Server as KarmaServer} from 'karma';
import browser from './browser';
import node from './';

const implementations = {browser, node};

fs.writeFileSync(
	path.join(__dirname, 'browser-bluebird-test.js'),

	'var Promise = require("bluebird");\n' +
	fs.readFileSync(
		path.join(__dirname, 'browser-test.js'),
		'utf8'
	)
);

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

function messagesHelper(currentlyUnhandled) {
	return () => currentlyUnhandled().map(obj => obj.reason.message);
}

function generateTests(type) {
	function setup() {
		const mock = mocks[type]();
		const currentlyUnhandled = implementations[type](mock.mock);

		const messages = messagesHelper(currentlyUnhandled);

		return {mock, currentlyUnhandled, messages};
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

test.serial('node: works as advertised', async t => {
	var currentlyUnhandled = node();
	var messages = messagesHelper(currentlyUnhandled);

	var p1 = Promise.reject(new Error('foo'));
	await delay(10);
	t.deepEqual(messages(), ['foo']);

	var p2 = Promise.reject(new Error('bar'));
	await delay(10);
	t.deepEqual(messages(), ['foo', 'bar']);

	p1.catch(() => {});
	await delay(10);
	t.deepEqual(messages(), ['bar']);

	p2.catch(() => {});
	await delay(10);
	t.deepEqual(messages(), []);
});

function browserMacro(t, file, browsers) {
	new KarmaServer({
		frameworks: ['browserify', 'mocha'],
		files: [file],
		browsers,

		preprocessors: {
			[file]: ['browserify']
		},

		browserify: {
			debug: true
		},

		singleRun: true,
		autoWatch: false
	}, exitCode => {
		if (exitCode) {
			t.fail(`karma exited with: ${exitCode}`);
		}
		t.end();
	}).start();
}

if (!isCi) {
	test.serial.cb('actual browser (native promise)', browserMacro, 'browser-test.js', ['Chrome']); // eslint-disable-line ava/test-ended
}

test.serial.cb('actual browser (bluebird)', browserMacro, 'browser-bluebird-test.js', isCi ? ['Firefox'] : ['Firefox', 'Chrome']); // eslint-disable-line ava/test-ended

test.todo('add Firefox as tested browser when it supports the feature');
test.todo('add Safari as tested browser when it supports the feature');
test.todo('add IE as tested browser when it supports the feature');
