
module.exports = function model(actions, store) {
	return actions.scan(function(store, action) {
		return store.map(action);
	}, store);
};
