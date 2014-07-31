
var Promise = require('promise-es6').Promise;

// 
// Returns a deferred
// 
exports.defer = function() {
	var resolve, reject;
	var promise = new Promise(function(res, rej) {
		resolve = res;
		reject = rej;
	});

	return {
		promise: promise,
		resolve: resolve,
		reject: reject
	};
};
