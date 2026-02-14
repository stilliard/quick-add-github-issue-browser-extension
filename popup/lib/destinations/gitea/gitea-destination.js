
var createGiteaClient = require('../../gitea/gitea-client').createGiteaClient;
var buildRepoSelectHtml = require('./gitea-repo-core').buildRepoSelectHtml;
var mergeDedupeSortGroupRepos = require('./gitea-repo-core').mergeDedupeSortGroupRepos;
var labelsCore = require('./gitea-labels-core');
var giteaIssueCore = require('./gitea-issue-core');

function createGiteaDestination() {
    var labelCacheByRepo = {};

    function getRepoKey($screen) {
        return $screen.find('#repo').val() || '';
    }

    function getCachedLabels(repoFullName) {
        return labelCacheByRepo[repoFullName] || null;
    }

    function setCachedLabels(repoFullName, labels) {
        labelCacheByRepo[repoFullName] = Array.isArray(labels) ? labels : [];
    }

    function setSelectedLabelsBadge($screen, labelsMap, repoFullName) {
        var $container = $screen.find('#gitea-selected-labels');
        $container.empty();

        var selectedIds = (labelsMap && labelsMap[repoFullName]) || [];
        if (!selectedIds.length) return;

        var cached = getCachedLabels(repoFullName) || [];
        var selectedLabels = cached.filter(function (l) { return selectedIds.indexOf(l.id) !== -1; });

        selectedLabels.forEach(function (label) {
            var color = labelsCore.normalizeHexColor(label.color) || '#6c757d';
            var $badge = $('<span class="badge" style="margin-right:6px; background-color:' + color + '; color: #fff;">' + labelsCore.normalizeLabel(label).name + '</span>');
            $container.append($badge);
        });
    }

    function loadPersistedLabelSelections(callback) {
        chrome.storage.local.get(['giteaLabelSelections'], function (result) {
            var selections = {};
            if (result && result.giteaLabelSelections) {
                try {
                    selections = JSON.parse(result.giteaLabelSelections);
                } catch (e) {
                    selections = {};
                }
            }
            callback(selections || {});
        });
    }

    function savePersistedLabelSelections(selections) {
        chrome.storage.local.set({ giteaLabelSelections: JSON.stringify(selections || {}) });
    }

    function clearSubmitError($screen) {
        var $error = $screen.find('#submit-error');
        if (!$error.length) return;
        $error.text('').addClass('d-none');
    }

    function showSubmitError($screen, message) {
        var $error = $screen.find('#submit-error');
        if (!$error.length) return;
        $error.text(String(message || 'Failed to create issue')).removeClass('d-none');
    }

    function setSubmitState($screen, state) {
        var $btn = $screen.find('#report-issue-form input[type="submit"]');
        if (!$btn.length) return;

        if (!$btn.attr('data-original-text')) {
            $btn.attr('data-original-text', $btn.val());
        }

        if (state === 'loading') {
            $btn.prop('disabled', true).val('Submitting...');
            return;
        }

        $btn.prop('disabled', false).val($btn.attr('data-original-text'));
    }

    function renderLabelsList($screen, labels, selectedIds) {
        var $list = $screen.find('#gitea-labels-list');
        $list.empty();

        if (!labels || !labels.length) {
            $list.append('<div class="text-muted">No labels found</div>');
            return;
        }

        labels.forEach(function (raw) {
            var label = labelsCore.normalizeLabel(raw);
            var color = labelsCore.normalizeHexColor(label.color) || '#6c757d';
            var id = label.id;
            var checked = selectedIds.indexOf(id) !== -1;

            var $row = $('<label class="list-group-item d-flex align-items-center" style="cursor:pointer;"></label>');
            var $checkbox = $('<input type="checkbox" class="form-check-input me-2">').val(id);
            if (checked) $checkbox.prop('checked', true);
            var $dot = $('<span class="me-2" style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:' + color + ';"></span>');
            var $name = $('<span></span>').text(label.name || String(id));

            $row.append($checkbox).append($dot).append($name);
            $list.append($row);
        });
    }

    function wireSubmitHandler($screen, store) {
        $screen.off('submit', '#report-issue-form');
        $screen.on('submit', '#report-issue-form', function (e) {
            e.preventDefault();

            clearSubmitError($screen);
            setSubmitState($screen, 'loading');

            var title = $screen.find('#title').val();
            var description = $screen.find('#description').val();
            var repoFullName = $screen.find('#repo').val();
            var issueType = $screen.find('#type_field input[name="type"]:checked').val();
            var includeUrl = $screen.find('#added_url').prop('checked');
            var includeScreenshot = $screen.find('#added_screenshot').prop('checked');
            var includeDebug = $screen.find('#added_debug').prop('checked');

            chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
                var currentTabUrl = tabs && tabs[0] && tabs[0].url;

                loadPersistedLabelSelections(function (selections) {
                    try {
                        var createParams = giteaIssueCore.buildCreateIssueParams({
                            repoFullName: repoFullName,
                            title: title,
                            description: description,
                            issueType: issueType,
                            includeUrl: includeUrl,
                            includeDebug: includeDebug,
                            includeScreenshot: includeScreenshot,
                            currentTabUrl: currentTabUrl,
                            env: {
                                userAgent: navigator.userAgent,
                                cookieEnabled: navigator.cookieEnabled,
                                doNotTrack: navigator.doNotTrack,
                                now: Date()
                            },
                            labelIds: (selections && selections[repoFullName]) || []
                        });

                        if (!createParams.owner || !createParams.repo) {
                            setSubmitState($screen, 'idle');
                            showSubmitError($screen, 'Select a repository.');
                            return;
                        }

                        var client = createGiteaClient({
                            baseUrl: store && store.giteaBaseUrl,
                            token: store && store.giteaToken,
                        });

                        function performCreate() {
                            client.createIssue({
                                owner: createParams.owner,
                                repo: createParams.repo,
                                title: createParams.title,
                                body: createParams.body,
                                labels: createParams.labels,
                            }).then(function (issue) {
                                var issueUrl = giteaIssueCore.buildIssueUrl(issue, {
                                    apiBaseUrl: client.apiBaseUrl,
                                    owner: createParams.owner,
                                    repo: createParams.repo,
                                }) || '';

                                Screen.show('success', {
                                    destinationName: 'Gitea',
                                    issueUrlHref: issueUrl,
                                    issueUrlText: issueUrl || 'View issue',
                                    issueUrlCopy: issueUrl,
                                });
                            }).catch(function (err) {
                                setSubmitState($screen, 'idle');
                                showSubmitError($screen, err && err.message ? err.message : 'Failed to create issue.');
                            });
                        }

                        if (!includeScreenshot || !chrome || !chrome.tabs || !chrome.tabs.captureVisibleTab) {
                            performCreate();
                            return;
                        }

                        chrome.tabs.captureVisibleTab(function (imageUri) {
                            if (imageUri) {
                                try {
                                    download(imageUri, 'screenshot.png');
                                } catch (e) {
                                    // ignore download errors, still proceed
                                }
                            }
                            setTimeout(performCreate, 300);
                        });
                    } catch (err) {
                        setSubmitState($screen, 'idle');
                        showSubmitError($screen, err && err.message ? err.message : 'Failed to create issue.');
                    }
                });
            });
        });
    }

    function filterAndRenderLabels($screen, repoFullName, labels, selectedIds) {
        var q = $screen.find('#gitea-labels-search').val();
        var filtered = labelsCore.filterLabels(labels, q);
        renderLabelsList($screen, filtered, selectedIds);
    }

    async function fetchLabelsForRepo(client, repoFullName) {
        var owner = '';
        var repo = '';
        if (repoFullName.indexOf('/') !== -1) {
            owner = repoFullName.split('/')[0];
            repo = repoFullName.split('/')[1];
        }
        if (!owner || !repo) return [];
        return client.listRepoLabels({ owner: owner, repo: repo, limit: 100, page: 1 });
    }

    function showRepoLoadError($screen, message) {
        var msg = String(message || 'Failed to load repos');
        var $existing = $screen.find('#gitea-repo-error');

        if (!$existing.length) {
            $existing = $('<div id="gitea-repo-error" class="alert alert-danger" role="alert" style="margin-top: 10px;"></div>');
            $screen.find('#repo').closest('p').append($existing);
        }

        $existing.text(msg).removeClass('d-none');
    }

    function clearRepoLoadError($screen) {
        $screen.find('#gitea-repo-error').text('').addClass('d-none');
    }

    /**
     * Fetch a full repo list with pagination.
     *
     * @param {(opts: { page?: number, limit?: number }) => Promise<any[]>} listFn
     * @param {{ limit: number, maxPages: number }} options
     * @returns {Promise<any[]>}
     */
    async function listAllRepos(listFn, options) {
        var limit = options && options.limit ? options.limit : 50;
        var maxPages = options && options.maxPages ? options.maxPages : 10;

        var all = [];
        for (var page = 1; page <= maxPages; page++) {
            var data = await listFn({ page: page, limit: limit });
            var pageItems = Array.isArray(data) ? data : [];
            all = all.concat(pageItems);

            if (pageItems.length < limit) {
                break;
            }
        }

        return all;
    }

    /**
     * @param {$} $screen
     * @param {any} store
     * @returns {Promise<void>}
     */
    async function populateRepoSelect($screen, store) {
        clearRepoLoadError($screen);

        $screen.find('#repo').prop('disabled', true).html('<option>loading...</option>');

        var client = createGiteaClient({
            baseUrl: store && store.giteaBaseUrl,
            token: store && store.giteaToken,
        });

        var userRepos = [];
        var orgRepos = [];

        var userError = null;
        var orgError = null;

        try {
            userRepos = await listAllRepos(function (opts) {
                return client.listUserRepos(opts);
            }, { limit: 50, maxPages: 10 });
        } catch (e) {
            userError = e;
        }

        var org = String(store && store.giteaOrg ? store.giteaOrg : '').trim();
        if (org) {
            try {
                orgRepos = await listAllRepos(function (opts) {
                    return client.listOrgRepos({ org: org, page: opts.page, limit: opts.limit });
                }, { limit: 50, maxPages: 10 });
            } catch (e) {
                orgError = e;
            }
        }

        if (userError && orgError) {
            showRepoLoadError($screen, userError.message || orgError.message);
            $screen.find('#repo').html('<option>Failed to load repos</option>');
            return;
        }

        if (userError) {
            showRepoLoadError($screen, userError.message);
        }

        if (orgError) {
            showRepoLoadError($screen, orgError.message);
        }

        var groups = mergeDedupeSortGroupRepos({ userRepos: userRepos, orgRepos: orgRepos });
        $screen.find('#repo').html(buildRepoSelectHtml(groups)).prop('disabled', false);
    }

    function setupLabelsUi($screen, store) {
        var $labelsContainer = $screen.find('#gitea-labels-container');
        var $labelsButton = $screen.find('#gitea-labels-button');
        var $labelsError = $screen.find('#gitea-labels-error');
        var $labelsModal = $('#gitea-labels-modal');
        var $labelsApply = $screen.find('#gitea-labels-apply');
        var $labelsSearch = $screen.find('#gitea-labels-search');

        var bsModal = null;
        var client = createGiteaClient({ baseUrl: store.giteaBaseUrl, token: store.giteaToken });

        loadPersistedLabelSelections(function (selections) {
            var repoFullName = getRepoKey($screen);
            setSelectedLabelsBadge($screen, selections, repoFullName);

            function openModal() {
                $labelsError.addClass('d-none').text('');

                var repoKey = getRepoKey($screen);
                var cached = getCachedLabels(repoKey);

                function ensureModal() {
                    if (!bsModal) {
                        bsModal = new bootstrap.Modal(document.getElementById('gitea-labels-modal'));
                    }
                    return bsModal;
                }

                function renderWithSelection(labels) {
                    var selectedIds = (selections && selections[repoKey]) || [];
                    filterAndRenderLabels($screen, repoKey, labels, selectedIds);
                }

                if (cached) {
                    renderWithSelection(cached);
                    ensureModal().show();
                    return;
                }

                // fetch labels
                $labelsSearch.val('');
                $screen.find('#gitea-labels-list').html('<div class="text-muted">Loading…</div>');
                fetchLabelsForRepo(client, repoKey).then(function (labels) {
                    var normed = (labels || []).map(labelsCore.normalizeLabel);
                    setCachedLabels(repoKey, normed);
                    renderWithSelection(normed);
                    ensureModal().show();
                }).catch(function (e) {
                    $labelsError.removeClass('d-none').text(e && e.message ? e.message : 'Failed to load labels');
                });
            }

            $labelsButton.off('click').on('click', function (e) {
                e.preventDefault();
                openModal();
            });

            $labelsSearch.off('input').on('input', function () {
                var repoKey = getRepoKey($screen);
                var cached = getCachedLabels(repoKey) || [];
                var selectedIds = (selections && selections[repoKey]) || [];
                filterAndRenderLabels($screen, repoKey, cached, selectedIds);
            });

            $labelsApply.off('click').on('click', function () {
                var repoKey = getRepoKey($screen);
                var checked = [];
                $screen.find('#gitea-labels-list input[type="checkbox"]:checked').each(function () {
                    checked.push($(this).val());
                });

                selections[repoKey] = checked;
                savePersistedLabelSelections(selections);
                setSelectedLabelsBadge($screen, selections, repoKey);
                if (bsModal) bsModal.hide();
            });

            // Update badges when repo changes
            $screen.on('change', '#repo', function () {
                var repoKey = getRepoKey($screen);
                setSelectedLabelsBadge($screen, selections, repoKey);
            });
        });

        $labelsContainer.removeClass('d-none');
    }

    return {
        key: 'gitea',
        onShowReportIssue: function (args) {
            const $screen = args.$screen;
            const store = args.store || {};

            // no projects support for Gitea
            $screen.find('#project-container').hide();
            $screen.find('#repo').html('<option>loading...</option>');
            $screen.find('#report-issue-form input[type="submit"]').prop('disabled', true);
            clearSubmitError($screen);

            setupLabelsUi($screen, store);

            populateRepoSelect($screen, store).catch(function (e) {
                showRepoLoadError($screen, e && e.message ? e.message : 'Failed to load repos');
                $screen.find('#repo').prop('disabled', false).html('<option>Failed to load repos</option>');
            }).then(function () {
                setTimeout(function () {
                    IssueForm.init($screen);
                }, 300);
            }).finally(function () {
                setSubmitState($screen, 'idle');
            });

            // still allow settings navigation
            $screen.off('click', '#settings-link');
            $screen.on('click', '#settings-link', function (e) {
                e.preventDefault();
                Screen.show('settings', store);
            });

            wireSubmitHandler($screen, store);

        }
    };
}

module.exports = {
    createGiteaDestination
};
