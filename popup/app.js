
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

    // get token
    Settings.get(function (store) {

        // lookup GitHub repos list
        var gh = new GitHub({
            token: store.token
        });
        var org = store.org ? gh.getOrganization(store.org) : gh.getUser();
        (store.org ? org.getRepos : org.listRepos).call(org, function(err, repos) {
            if (err) {
                alert(err);
                return;
            }
            var list = repos.map(function (repo) {
                return '<option>' + repo.full_name + '</option>';
            });
            $screen.find('#repo').html(list);
        });

        // projects only supported for org level
        if (! store.org) {
            $screen.find('#project-container').hide();

            IssueForm.init($screen);
        } else {
            org.listProjects(function(err, projects) {
                if (err) {
                    alert(err);
                    return;
                }
                var list = projects.map(function (project) {
                    return '<option value="' + store.org + '/' + project.number + '">' + project.name + '</option>';
                });
                $screen.find('#project').html('<option>~ optional ~</option>' + list);

                IssueForm.init($screen);
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
                type_field = $screen.find('#type_field input[name="type"]:checked').val(),
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

                // add type/label + standard template ;D
                if (type_field) {
                    url += '&labels=' + encodeURIComponent(type_field);

                    if (type_field=='bug') {
                        body += "### Issue description:\n";
                        body += "\n";
                        body += "As a User/Admin/Developer\n";
                        body += "When I <steps to reproduce>\n";
                        body += "Currently it <what happens currently>\n";
                        body += "While it should <what should happen>\n";
                        body += "Because <some business value>\n";
                        body += "\n\n";
                    }
                    else if (type_field=='enhancement') {
                        body += "### Story:\n";
                        body += "\n";
                        body += "As a User/Admin/Developer\n";
                        body += "I want <some software feature>\n";
                        body += "So that <some business value>\n";
                        body += "\n";
                        body += "### Requirements:\n";
                        body += "\n";
                        body += "- list them here\n";
                        body += "\n";
                        body += "### Tasks:\n";
                        body += "\n";
                        body += "- [ ] \n";
                        body += "- [ ] \n";
                        body += "- [ ] \n";
                        body += "\n\n";
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

