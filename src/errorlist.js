module.exports = class ErrorList {

	constructor() {
		this.errors = [];
	}

	first() {
		return this.errors[0];
	}

	merge(errorList) {
		this.errors.concat(errorList.getAll());
	}
	
	add(error) {
		this.errors.push(error);
	}

	count() {
		return this.errors.length;
	}

	toJSON() {
		return this.errors.map(e => {
			if (typeof e.toJSON === 'function') {
				return e.toJSON();
			}
			else {
				return {
					code: 'InternalError',
					message: e.message
				};
			}
		});
	}

	getMessage() {
		var msg = '';
		for (var i in this.errors) {
			msg += (parseInt(i, 10)+1) + ". " + this.errors[i].message + "\r\n";
		}
		return msg.trim();
	}

	getAll() {
		return this.errors;
	}

};