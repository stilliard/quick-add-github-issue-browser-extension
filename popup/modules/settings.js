
//
// Settings storage
// e.g. for access token (used for auth to github api) & other settings
//
// ref https://developer.chrome.com/extensions/storage
//

window.Settings = (function () {

    var cachedData = null,
        secret = '';

    function encrypt(data) {
        return window.CryptoJS.AES.encrypt(JSON.stringify(data), secret).toString();
    }
    function decrypt(str) {
        var data = window.CryptoJS.AES.decrypt(str.toString(), secret).toString(window.CryptoJS.enc.Utf8);
        if (! data) return {};

        try {
            return JSON.parse(data);
        } catch (e) {
            // corrupted or incompatible payload; treat as empty settings
            return {};
        }
    }

    function normalizeSettingsStore(settings) {
        if (!settings || typeof settings !== 'object') {
            return { settings: settings, didMigrate: false };
        }

        var didMigrate = false;
        var normalized = Object.assign({}, settings);

        var destination = String(normalized.destination || '').trim().toLowerCase();
        if (!destination) {
            destination = 'github';
            didMigrate = true;
        }
        if (destination !== 'github' && destination !== 'gitea') {
            destination = 'github';
            didMigrate = true;
        }
        if (normalized.destination !== destination) {
            normalized.destination = destination;
            didMigrate = true;
        }

        // Add missing keys for forward compatibility (legacy schema: { token, org })
        if (normalized.giteaBaseUrl === undefined) {
            normalized.giteaBaseUrl = '';
            didMigrate = true;
        }
        if (normalized.giteaToken === undefined) {
            normalized.giteaToken = '';
            didMigrate = true;
        }
        if (normalized.giteaOrg === undefined) {
            normalized.giteaOrg = '';
            didMigrate = true;
        }

        return { settings: normalized, didMigrate: didMigrate };
    }

    return {

        // set encryption secret
        setSecret: function (newSecret) {
            secret = newSecret;
        },

        // get
        // @param {Function} callback gets given the settings Object
        get: function (callback) {
            if (cachedData) {
                callback(cachedData);
                return;
            }
            chrome.storage.local.get(['settings'], function (result) {
                if (! result.settings) {
                    callback(null);
                    return;
                }
                var decrypted = decrypt(result.settings);
                var normalized = normalizeSettingsStore(decrypted);
                cachedData = normalized.settings;

                // Persist migration in the background (no UI blocking)
                if (normalized.didMigrate) {
                    chrome.storage.local.set({ settings: encrypt(cachedData) }, function () {
                        // ignore errors; settings will still be returned to the caller
                    });
                }

                callback(cachedData);
            });
        },

        // fast method to only check for cached version
        getCached: function() {
            return cachedData;
        },

        // set
        // @param {Object} token
        // @param {Function} callback when it's finished saving
        set: function (settings, callback) {
            cachedData = settings;
            settings = encrypt(settings);
            chrome.storage.local.set({ settings: settings }, function (result) {
                callback();
            });
        }
    }

}());
