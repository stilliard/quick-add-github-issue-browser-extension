
const {
    DESTINATION_KEYS,
    getDestinationProvider,
    getDestinationKeyFromStore
} = require('./lib/destinations');

function mergeSettings(previousSettings, newSettings) {
    return Object.assign({}, previousSettings || {}, newSettings || {});
}

function buildSettingsTemplateContext(store) {
    store = store || {};

    const destination = getDestinationKeyFromStore(store);
    return {
        destination: destination,
        token: store.token || '',
        org: store.org || '',
        giteaBaseUrl: store.giteaBaseUrl || '',
        giteaToken: store.giteaToken || '',
        giteaOrg: store.giteaOrg || ''
    };
}

function showSettingsError($screen, message) {
    const $alert = $screen.find('#settings-error');
    $alert.text(String(message || 'Unknown error')).removeClass('d-none');
}

function clearSettingsError($screen) {
    $screen.find('#settings-error').text('').addClass('d-none');
}

function parseOriginPatternFromBaseUrl(baseUrl) {
    const raw = String(baseUrl || '').trim();
    if (!raw) {
        return { ok: false, error: 'Gitea base URL is required.' };
    }

    let url;
    try {
        url = new URL(raw);
    } catch (e) {
        return { ok: false, error: 'Gitea base URL must be a valid URL (including https://).' };
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return { ok: false, error: 'Gitea base URL must start with http:// or https://.' };
    }

    return { ok: true, value: url.origin + '/*' };
}

function checkOriginPermission(originPattern, callback) {
    try {
        if (!chrome || !chrome.permissions || typeof chrome.permissions.contains !== 'function') {
            callback(true);
            return;
        }

        chrome.permissions.contains({ origins: [originPattern] }, function (result) {
            if (chrome && chrome.runtime && chrome.runtime.lastError) {
                callback(true);
                return;
            }
            callback(Boolean(result));
        });
    } catch (e) {
        callback(true);
    }
}

function hasRequiredSettings(store) {
    const destination = getDestinationKeyFromStore(store);

    if (destination === DESTINATION_KEYS.GITEA) {
        return Boolean(store && store.giteaBaseUrl && store.giteaToken);
    }

    return Boolean(store && store.token);
}

// When showing the settings screen
Screen.onShow('settings', function ($screen) {

    function updateSettingsVisibility() {
        clearSettingsError($screen);

        const destination = String($screen.find('#destination').val() || '').trim().toLowerCase();
        const isGitea = destination === DESTINATION_KEYS.GITEA;

        $screen.find('#github-settings').toggleClass('d-none', isGitea);
        $screen.find('#gitea-settings').toggleClass('d-none', !isGitea);

        // enforce required fields per destination
        $screen.find('#token').prop('required', !isGitea);
        $screen.find('#gitea_base_url').prop('required', isGitea);
        $screen.find('#gitea_token').prop('required', isGitea);

        if (isGitea) {
            $screen.find('#gitea_base_url').focus();
        } else {
            $screen.find('#token').focus();
        }
    }

    // hook into save button click
    $screen.off('submit', '#settings-form');
    $screen.on('submit', '#settings-form', function (e) {
        e.preventDefault();

        clearSettingsError($screen);

        // save settings
        var destination = String($screen.find('#destination').val() || '').trim().toLowerCase(),
            token = $screen.find('#token').val(),
            org = $screen.find('#org').val(),
            giteaBaseUrl = $screen.find('#gitea_base_url').val(),
            giteaToken = $screen.find('#gitea_token').val(),
            giteaOrg = $screen.find('#gitea_org').val();

        const destinationKey = destination === DESTINATION_KEYS.GITEA ? DESTINATION_KEYS.GITEA : DESTINATION_KEYS.GITHUB;

        if (destinationKey === DESTINATION_KEYS.GITHUB && !token) {
            showSettingsError($screen, 'GitHub token is required.');
            return;
        }

        const originPatternResult = destinationKey === DESTINATION_KEYS.GITEA
            ? parseOriginPatternFromBaseUrl(giteaBaseUrl)
            : { ok: true, value: null };

        if (destinationKey === DESTINATION_KEYS.GITEA) {
            if (!originPatternResult.ok) {
                showSettingsError($screen, originPatternResult.error);
                return;
            }

            if (!giteaToken) {
                showSettingsError($screen, 'Gitea token is required.');
                return;
            }
        }

        function persistSettings() {
            Settings.get(function (store) {
                Settings.set(
                    mergeSettings(store, {
                        destination: destinationKey,
                        token: token,
                        org: org,
                        giteaBaseUrl: giteaBaseUrl,
                        giteaToken: giteaToken,
                        giteaOrg: giteaOrg,
                    }),
                    function () {
                        // & switch to report-issue screen
                        Screen.show('report-issue');
                    }
                );
            });
        }

        if (destinationKey !== DESTINATION_KEYS.GITEA || !originPatternResult.value) {
            persistSettings();
            return;
        }

        checkOriginPermission(originPatternResult.value, function (hasPermission) {
            if (!hasPermission) {
                showSettingsError(
                    $screen,
                    'Missing host permission for ' + originPatternResult.value + '. Please update the extension host_permissions (or reinstall after manifest changes).'
                );
                return;
            }

            persistSettings();
        });
    });

    $screen.off('change', '#destination');
    $screen.on('change', '#destination', updateSettingsVisibility);

    const savedDestination = String($screen.find('#destination').attr('data-saved-destination') || '').trim().toLowerCase();
    if (savedDestination) {
        $screen.find('#destination').val(savedDestination);
    }

    updateSettingsVisibility();
});

// When showing the report-issue screen
Screen.onShow('report-issue', function ($screen) {
    Settings.get(function (store) {
        const destination = getDestinationProvider(store);
        destination.onShowReportIssue({ $screen: $screen, store: store });
    });
});

Screen.onShow('success', function ($screen) {
    var $copyButton = $screen.find('#copy-issue-link');

    $copyButton.off('click').on('click', function (e) {
        e.preventDefault();
        var url = $copyButton.attr('data-issue-url') || '';
        if (!url) return;

        var resetTimer = null;
        var originalText = $copyButton.text();
        var markCopied = function () {
            $copyButton.text('Copied!');
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () {
                $copyButton.text(originalText);
            }, 1200);
        };

        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(markCopied).catch(markCopied);
            return;
        }

        var input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        markCopied();
    });

    $screen.off('click', '#create-another-issue');
    $screen.on('click', '#create-another-issue', function (e) {
        e.preventDefault();
        Screen.show('report-issue');
    });

    $screen.off('click', '#success-settings-link');
    $screen.on('click', '#success-settings-link', function (e) {
        e.preventDefault();
        Settings.get(function (store) {
            Screen.show('settings', buildSettingsTemplateContext(store));
        });
    });
});

// Check if a token is saved yet & show either settings to set it or the report-issue screen
Settings.get(function (store) {
    if (!hasRequiredSettings(store)) {
        Screen.show('settings', buildSettingsTemplateContext(store));
        return;
    }

    Screen.show('report-issue');
});
