# currently-rejected [![Build Status](https://travis-ci.org/jamestalmage/currently-rejected.svg?branch=master)](https://travis-ci.org/jamestalmage/currently-rejected) [![Coverage Status](https://coveralls.io/repos/github/jamestalmage/currently-rejected/badge.svg?branch=master)](https://coveralls.io/github/jamestalmage/currently-rejected?branch=master)

> Track the list of currently rejected promises.


## Install

```
$ npm install --save currently-rejected
```


## Usage

```js
const currentlyRejected = require('currently-rejected')(); // <- note the invocation

var fooError = new Error('foo');
var p = Promise.reject(new Error('foo'));

// on the next tick - unhandled rejected promise is added to the list:
currentlyRejected();
//=> [{promise: p, reason: fooError}]'

p.catch(() => {});

// on the next tick - handled promise is now removed from the list:
currentlyRejected();
//=> [];
```

## API

### currentlyRejected()

Returns an array of objects with `promise` and `reason` properties. The list is updated as unhandledRejections are published, and later handled.

## License

MIT © [James Talmage](http://github.com/jamestalmage)
