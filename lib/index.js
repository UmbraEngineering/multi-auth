
var utils = require('./utils');

var MemoryStore  = require('key-stores/memory');
var RedisStore   = require('key-stores/redis');
var MongoStore   = require('key-stores/mongo');

// "Constants" representing the different reasons for sending emails
var EMAIL = {
	EMAIL_AUTH: 'emailAuth',
	TWO_STEP_AUTH: 'twoStepAuth',
	PASSWORD_RESET: 'passwordReset',
	EMAIL_CONFIRM: 'emailConfirm'
};

// 
// Authentication class
// 
var Auth = exports = module.exports = function(opts) {
	// The keystore to use for email/two step auth
	this.keyStore = opts.keyStore || new MemoryStore();

	// List of the allowed auth methods
	this.authMethods = opts.authMethods || [ 'password', 'email', 'two step' ];

	// Map of user-defined actions
	this.actions = [
		// 
		// Send an email to a user
		// 
		// @param {user} a user object containing properties {id,name,email,authMethod}
		// @param {template} the type of email to send (will be one of "emailAuth", "twoStepAuth", "passwordReset", "emailConfirm")
		// @param {data} data relavent to the message, eg. {user,token}
		// @param {promise} a promise to resolve/reject
		// @result void
		// 
		'sendEmail',

		// 
		// Fetch an object with user data by the user's ID
		// 
		// @param {userId} the user's ID
		// @param {promise} a promise to resolve/reject
		// @result {id,name,email,authMethod}
		// 
		'fetchUserById',

		// 
		// Fetch an object with user data by a name value (username or email)
		// 
		// @param {name} the user name value
		// @param {promise} a promise to resolve/reject
		// @result {id,name,email,authMethod}
		// 
		'fetchUserByName',

		// 
		// Check if the given password is valid for the given user
		// 
		// @param {userId} a user ID value
		// @param {password} the password value to check
		// @param {promise} a promise to resolve/reject
		// @result boolean
		// 
		'checkPassword',

		// 
		// Mark a user's email address as valid and confirmed
		// 
		// @param {userId} a user ID value
		// @param {promise} a promise to resolve/reject
		// @result void
		// 
		'confirmEmail'
	]
		.reduce(function(mem, key) {
			mem[key] = opts[key] || function() { };
			return mem;
		}, { });
	};
};



// -------------------------------------------------------------



// 
// Defines an action
// 
// @param {action} the name of the action
// @param {func} the function to define
// @return this
// 
Auth.prototype.define = function(action, func) {
	// Allow passing in an object with multiple actions defined
	if (typeof action === 'object' && action) {
		Object.keys(action).forEach(function(key) {
			this.define(key, action[key]);
		}.bind(this));
	}

	this.actions[action] = func;
	return this;
};

// 
// Take a user defined action
// 
// @param {action} the name of the function to call
// @param {...} arguments to pass to the function
// @return promise
// 
Auth.prototype.action = function(action) {
	var deferred = utils.defer();
	var args = Array.prototype.slice.call(arguments, 1);

	args.push(deferred);
	this.actions[action].apply(this, args);

	return deferred.promise;
};



// -------------------------------------------------------------



// 
// Sends a confirmation email to a user
// 
// @param {userId} the user ID of the user to confirm
// @return promise
// 
Auth.prototype.confirmEmailStepOne = function(userId) {
	var self = this;
	var user, key;

	return Promise.all([ this.action('fetchUserById', userId), this.keyStore.generateKey() ])
		.then(function(results) {
			user = results[0];
			key = results[1];

			return self.registerKey(key, user.id, EMAIL.EMAIL_CONFIRM);
		})
		.then(function() {
			return self.action('sendEmail', user, EMAIL.EMAIL_CONFIRM, {
				user: user,
				token: key
			});
		});
};

// 
// Checks that a confirmation token is valid, and marks the user's email as confirmed
// 
// @param {key} the confirmation key
// @return promise
// 
Auth.prototype.confirmEmailStepTwo = function(key) {
	var self = this;

	return this.keyStore.find(key)
		.then(function(found) {
			if (! found || found.type !== EMAIL.EMAIL_CONFIRM) {
				return Promise.reject('Invalid email confirmation token');
			}

			return self.action('confirmEmail', found.userId)
		})
		.then(function() {
			return self.keyStore.removeKey(key);
		});
};



// -------------------------------------------------------------



// 
// 
// 
Auth.prototype.

