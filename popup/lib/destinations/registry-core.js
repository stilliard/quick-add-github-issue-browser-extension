
function normalizeDestinationKey(value) {
    return String(value || '').trim().toLowerCase();
}

function getDestinationKeyFromStore(store) {
    const destination = store && store.destination;
    return normalizeDestinationKey(destination) || 'github';
}

module.exports = {
    getDestinationKeyFromStore,
    normalizeDestinationKey
};
