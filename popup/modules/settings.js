
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
        return JSON.parse(data);
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
                cachedData = decrypt(result.settings);
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
