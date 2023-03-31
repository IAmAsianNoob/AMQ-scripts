if (!document) return;

// I do not perform any validity checks, that's on yourself.
document.createElement = function(_super) {
	return function() {
		const element = _super.apply(this, arguments);
		const [, options] = arguments;
		if (options && typeof options === 'object') {
			for (const [field, value] of Object.entries(options)) {
				if (field === 'is') return;
				element.setAttribute(field, value);
			}
		}
		return element;
	}
}(document.createElement);