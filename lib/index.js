
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

// "Constants" representing the different reasons for sending SMS messages
var SMS = {
	TWO_STEP_AUTH: 'twoStepAuth'
};

// 
// Authentication class
// 
var Auth = exports = module.exports = function(opts) {
	// The keystore to use for email/two step auth
	this.keyStore = opts.keyStore || new MemoryStore();

	// List of the allowed auth methods
	this.authMethods = opts.authMethods || [ 'password', 'email', 'twostep-email', 'twostep-sms' ];

	// Map of user-defined actions
	this.actions = [
		// 
		// Send an email to a user
		// 
		// @param {user} a user object {id,authMethod,[email],[password],[phone]}
		// @param {template} the type of email to send (will be one of "emailAuth", "twoStepAuth", "passwordReset", "emailConfirm")
		// @param {data} data relavent to the message, eg. {user,token}
		// @param {promise} a promise to resolve/reject
		// @result void
		// 
		'sendEmail',

		// 
		// Semd am SMS message to a user
		// 
		// @param {user} a user object containing auth-related properties
		// @param {template} the type of message to send (will be one of "twoStepAuth")
		// @param {data} data relavent to the message, eg. {user,token}
		// @param {promise} a promise to resolve/reject
		// @result void
		// 
		'sendSMS',

		// 
		// Fetch an object with user data by the user's ID
		// 
		// @param {userId} the user's ID
		// @param {promise} a promise to resolve/reject
		// @result {id,authMethod,[email],[password],[phone]}
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
		// @param {user} a user object {id,authMethod,[email],[password],[phone]}
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
		'confirmEmail',

		// 
		// Update a user's password to the given value
		// 
		// @param {userId} a user ID value
		// @param {password} the new password to use
		// @param {promise}
		// @result void
		// 
		'updatePassword'
	]
		.reduce(function(mem, key) {
			mem[key] = opts[key] || function() { };
			return mem;
		}, { });
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
// Express middleware to simplify setup
// 
// @param {opts} middleware options
// @return void
// 
Auth.prototype.express = function(opts) {
	var auth = this;
	var route = opts.route || '/auth';
	var afterAuth = opts.afterAuth || function() { };
	var opening = new RegExp('^' + route);

	return function(req, res, next) {
		// Normalize the pathname for easier matching
		var pathname = req.pathname.replace(opening, '/auth');

		// Combine the method and path together and match as a single unit
		switch (req.method.toUpperCase() + ' ' + pathname) {
			// 
			// Step One:
			//   Fetches user info based on a username/email, check the selected
			//   auth method, and start authenticating
			// 
			case 'POST /auth':
				return auth.startAuthentication(req.body.userName)
					.then(function(user) {
						// Authentication complete, let the afterAuth method handle it
						if (user && typeof user === 'object') {
							return afterAuth(user, req, res, next);
						}

						// Authentication is still in progress (eg. two step auth)
						if (user) {
							return res.send(202, {
								message: 'Authentication message sent'
							});
						}

						// Authentication has failed
						res.send(401, {
							message: 'Authentication failed'
						})
					})
					.catch(function(err) {
						res.send(500, err);
					});
			break;

			// 
			// Any non-matching request should simply pass through
			// 
			default:
				next();
			break;
		}
	};
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

			return self.keyStore.registerKey(key, user.id, EMAIL.EMAIL_CONFIRM);
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
// Starts the authentication process for a user by looking up the user data
// and selecting the correct authentication method
// 
// @param {data} a data object containing auth credentials {userName,[password]}
// @return promise
// 
Auth.prototype.startAuthentication = function(data) {
	var self = this;
	var key;

	return this.action('fetchUserByName', data.userName)
		.then(function(user) {
			if (! user) {
				throw new Error('User not found');
			}

			switch (user.authMethod) {
				// 
				// Password-only auth
				// 
				case 'password':
					if (! data.password) {
						throw new Error('Selected authentication method is "password", but no password was given');
					}

					return self.action('checkPassword', user, data.password)
						.then(function(result) {
							if (result) {
								return user;
							}

							return false;
						});
				break;

				// 
				// Email-only auth
				// 
				case 'email':
					return self.keyStore.generateKey()
						.then(function(_key) { key = _key; })
						.then(function() {
							self.keyStore.registerKey(key, user.id, EMAIL.EMAIL_AUTH)
						})
						.then(function() {
							return self.action('sendEmail', user, EMAIL.EMAIL_AUTH, {
								key: key,
								user: user
							});
						});
				break;

				// 
				// Two-step password/email auth
				// 
				case 'twostep-email':
					if (! data.password) {
						throw new Error('Selected authentication method is "twostep-email", but no password was given');
					}

					return self.action('checkPassword', user, data.password)
						.then(function(result) {
							if (result) {
								return self.keyStore.generateKey()
									.then(function(_key) { key = _key; })
									.then(function() {
										return self.keyStore.registerKey(key, user.id, EMAIL.TWO_STEP_AUTH);
									})
									.then(function() {
										return self.action('sendEmail', user, EMAIL.TWO_STEP_AUTH, {
											key: key,
											user: user
										});
									});
							}

							return false;
						});
				break;

				// 
				// Two-step password/sms auth
				// 
				case 'twostep-sms':
					if (! data.password) {
						throw new Error('Selected authentication method is "twostep-sms", but no password was given');
					}

					return self.action('checkPassword', user, data.password)
						.then(function(result) {
							if (result) {
								return user;
							}

							return false;
						});
				break;

				// 
				// Invalid auth method
				// 
				default:
					throw new Error('Invalid authentication method selected');
				break;
			}
		});
};



// -------------------------------------------------------------



// 
// Starts the two-step authentication process
// 
// @param {userName} the user to authenticate for
// @param {password} the password to attempt to log in with
// @return promise
// 
Auth.prototype.passwordAuth = function(userName, password) {
	var self = this;
	var user;

	return this.action('fetchUserByName', userName)
		.then(function(_user) { user = _user; })
		.then(function() {
			return self.action('checkPassword', user.id, password);
		})
		.then(function(result) {
			if (result) {
				return user;
			}

			return false;
		});
};

