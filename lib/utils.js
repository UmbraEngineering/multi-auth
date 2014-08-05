
var Promise = require('promise-es6').Promise;

// 
// Returns a deferred
// 
// @return object
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

// 
// Repeat an async function until the returned promise resolves with a truthy value
// 
// @param {func} the function to repeat
// @return promise
// 
exports.until = function(func) {
	var deferred = exports.defer();

	var repeater = function() {
		func().then(
			function(value) {
				if (! value) {
					return repeater();
				}

				deferred.resolve(value);
			},
			function(err) {
				deferred.reject(err);
			}
		);
	};

	return deferred.promise;
};
