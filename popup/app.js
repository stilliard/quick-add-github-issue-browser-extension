
const { Octokit } = require("@octokit/rest");

// When showing the settings screen
Screen.onShow('settings', function ($screen) {

    // hook into save button click
    $screen.on('submit', '#settings-form', function (e) {
        e.preventDefault();

        // save settings
        var token = $screen.find('#token').val(),
            org = $screen.find('#org').val();
        Settings.set({ token: token, org: org }, function () {
            // & switch to report-issue screen
            Screen.show('report-issue');
        });
    });
});

// When showing the report-issue screen
Screen.onShow('report-issue', function ($screen) {

    // load issue types & render the type selector
    // (issueTypes is kept in scope so the submit handler can look up the selected type)
    var issueTypes = [];
    var typesReady = false;
    var whenTypesReady = null;
    Types.getAll(function (types) {
        issueTypes = types;

        // Build the radios with DOM APIs (not string concat) so a type's name/id —
        // which can be hand-edited in chrome.storage — can't inject markup or break
        // the DOM. The label text is set via .text(); the element id is normalised
        // while the radio value keeps the real id (used by Types.find on submit).
        var $options = $screen.find('#type_options').empty();
        types.forEach(function (type, i) {
            var inputId = 'type_' + String(type.id).replace(/[^A-Za-z0-9_-]/g, '-');
            var $input = $('<input>')
                .attr({ type: 'radio', name: 'type', id: inputId, value: type.id })
                .addClass('hidden-checkbox')
                .prop('checked', i === 0);
            var $label = $('<label>')
                .attr({ tabindex: 0, role: 'button', 'for': inputId })
                .addClass('hidden-checkbox-label')
                .text(type.name);
            // trailing space gives the same inter-button gap as the other radio
            // groups (whose spacing comes from markup whitespace)
            $options.append($input).append($label).append(document.createTextNode(' '));
        });

        typesReady = true;
        if (whenTypesReady) { whenTypesReady(); whenTypesReady = null; }
    });

    // Initialise the form once the type radios exist. IssueForm.init restores the
    // saved selection & binds (non-delegated) change handlers, so it must not run
    // before the radios are rendered above. Callers below invoke this after the
    // repo/project selects are populated; this just adds the "& types ready" gate.
    function initForm() {
        if (typesReady) {
            IssueForm.init($screen);
        } else {
            whenTypesReady = function () { IssueForm.init($screen); };
        }
    }

    // get token
    Settings.get(function (store) {

        // lookup GitHub repos list
        const octokit = new Octokit({ auth: store.token });

        const listRepos = store.org ? octokit.rest.repos.listForOrg : octokit.rest.repos.listForAuthenticatedUser;
        octokit.paginate(listRepos, { org: store.org, per_page: 100 }).then((data) => {

            var orgs = {};
            data.forEach(function (repo) {
                var orgName = repo.owner.login;
                orgs[orgName] = orgs[orgName] || [];
                orgs[orgName].push(repo);
            });

            function buildList(orgs) {

                var list = Object.keys(orgs).map(function (org) {
                    var options = orgs[org].map(function (repo) {
                        return '<option value="' + repo.full_name + '">' + repo.name + '</option>';
                    });
                    return '<optgroup label="' + org + '">' + options.join('') + '</optgroup>';
                });
                $screen.find('#repo').html(list.join(''));
            }

            if (! store.org) {
                buildList(orgs);
            } else {
                octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, { per_page: 100 }).then((data) => {

                    data.forEach(function (repo) {
                        var orgName = repo.owner.login;
                        orgs[orgName] = orgs[orgName] || [];
                        orgs[orgName].push(repo);
                    });

                    buildList(orgs);
                });
            }
        });

        // projects only supported for org level
        if (! store.org) {
            $screen.find('#project-container').hide();

            setTimeout(initForm, 300);
        } else {
            octokit.graphql(
                `query listProjects($org: String!, $count: Int = 100, $query: String = "is:open") {
                    organization(login: $org) {
                        projectsV2 (first: $count, query: $query) {
                            nodes { number, title }
                        }
                    }
                }`,
                {
                  org: store.org,
                }
            ).then(data => {

                var projects = {
                    v2: [],
                    classic: [],
                };
                data?.organization?.projectsV2?.nodes?.forEach(function (project) {
                    projects.v2.push({
                        number: project.number,
                        name: project.title
                    });
                });
                data?.organization?.projects?.nodes?.forEach(function (project) {
                    projects.classic.push(project);
                });

                var list = Object.keys(projects).map(function (projectType) {
                    var options = projects[projectType].map(function (project) {
                        return '<option value="' + store.org + '/' + project.number + '">' + project.name + '</option>';
                    });
                    return options.length ? '<optgroup label="' + projectType + '">' + options.join('') + '</optgroup>' : '';
                });
                $screen.find('#project').html('<option>~ optional ~</option>' + list.join(''));

                setTimeout(initForm, 300);
            });
        }

        // hookup config icon to switch to settings screen
        $screen.on('click', '#settings-link', function (e) {
            e.preventDefault();
            Screen.show('settings', store);
        });

        // hook into submit button click
        $screen.on('submit', '#report-issue-form', function (e) {
            e.preventDefault();

            // gather fields
            var title = $screen.find('#title').val(),
                repo = $screen.find('#repo').val(),
                project = $screen.find('#project').val(),
                added_url = $screen.find('#added_url').prop('checked'),
                added_screenshot = $screen.find('#added_screenshot').prop('checked'),
                added_debug = $screen.find('#added_debug').prop('checked'),
                type_id = $screen.find('#type_field input[name="type"]:checked').val(),
                // fall back to the first (default) type if none is checked, matching
                // the pre-selected radio the UI shows
                selectedType = Types.find(issueTypes, type_id) || issueTypes[0],
                body = '',
                url = 'https://github.com/' + repo + '/issues/new?title=' + encodeURIComponent(title);

            // build up extra params (ref https://help.github.com/articles/about-automation-for-issues-and-pull-requests-with-query-parameters/)
            if (project) {
                url += '&projects=' + encodeURIComponent(project);
            }

            // redirect to new issue page for given repo
            chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {

                // handle sending (delay until added additional data)
                var sendToGitHub = function () {
                    if (body) {
                        url += '&body=' + encodeURIComponent(body);
                    }
                    chrome.tabs.create({
                        url: url
                    });
                };

                // add the selected type's GitHub issue type, default labels & body template
                if (selectedType) {

                    // GitHub native Issue Type (org-level; ignored where unsupported)
                    if (selectedType.githubType) {
                        url += '&type=' + encodeURIComponent(selectedType.githubType);
                    }

                    // default labels (supports multiple)
                    if (selectedType.labels && selectedType.labels.length) {
                        url += '&labels=' + selectedType.labels.map(encodeURIComponent).join(',');
                    }

                    // body template
                    if (selectedType.bodyTemplate) {
                        body += selectedType.bodyTemplate;
                    }
                }

                // add url
                if (added_url) {
                    body += "Reported from: " + tabs[0].url + "\n\n";
                }

                // add debug data
                if (added_debug) {
                    body += "### Debug details: \n";
                    body += "User-agent: " + navigator.userAgent + "\n";
                    body += "Cookies: " + navigator.cookieEnabled + " (DNT: " + navigator.doNotTrack + ")\n";
                    body += "Date/time: " + Date() + "\n";
                    body += "\n";
                }

                // add screenshot link
                if (added_screenshot) {
                    chrome.tabs.captureVisibleTab(function (imageUri) {
                        body += "### Screenshot:\n\n";
                        body += "<!-- drag in the screenshot file -->\n\n";
                        download(imageUri, 'screenshot.png');
                        setTimeout(sendToGitHub, 300); // small delay to allow download
                    });
                } else {
                    sendToGitHub();
                }
            });

        });

    });

});

// Check if a token is saved yet & show either settings to set it or the report-issue screen
Settings.get(function (store) {
    if (! store || ! store.token) {
        Screen.show('settings', {
            token: '',
            org: ''
        });
    } else {
        Screen.show('report-issue');
    }
});

