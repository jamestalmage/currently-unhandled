'use strict';
var core = require('./core');

module.exports = function (w) {
	w = w || window;
	var c = core();

	w.addEventListener('unhandledrejection', function (event) {
		c.onUnhandledRejection(event.reason, event.promise);
	});

	w.addEventListener('rejectionhandled', function (event) {
		c.onRejectionHandled(event.promise);
	});

	return c.currentlyUnhandled;
};
