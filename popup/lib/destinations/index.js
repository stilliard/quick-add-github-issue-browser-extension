
const { getDestinationKeyFromStore, normalizeDestinationKey } = require('./registry-core');
const github = require('./github');
const gitea = require('./gitea');

/**
 * @typedef {Object} DestinationProvider
 * @property {string} key
 * @property {(args: { $screen: any, store: Object }) => void} onShowReportIssue
 */

const DESTINATION_KEYS = {
    GITHUB: 'github',
    GITEA: 'gitea'
};

function getDestinationProviderByKey(destinationKey) {
    const normalized = normalizeDestinationKey(destinationKey);

    if (normalized === DESTINATION_KEYS.GITEA) return gitea;
    return github;
}

function getDestinationProvider(store) {
    return getDestinationProviderByKey(getDestinationKeyFromStore(store));
}

module.exports = {
    DESTINATION_KEYS,
    getDestinationProvider,
    getDestinationProviderByKey,
    // exported for unit tests / future UI wiring
    getDestinationKeyFromStore,
    normalizeDestinationKey
};
