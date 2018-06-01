

//
// example to get current page/tab URL
//
// chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
//     var url = tabs[0].url;

//     console.log('You\'re on:', url);
// });

// idea for getting screenshot -> https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/captureVisibleTab


// When showing the settings screen
Screen.onShow('settings', function ($screen) {

    console.log('settings screen');

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

    console.log('report screen');

    // get token
    Settings.get(function (store) {

        // lookup GitHub repos list
        var gh = new GitHub({
            token: store.token
        });
        var org = store.org ? gh.getOrganization(store.org) : gh.getUser();
        (store.org ? org.getRepos : org.listRepos).call(org, function(err, repos) {
            if (err) {
                console.error(err);
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
        } else {
            org.listProjects(function(err, projects) {
                if (err) {
                    console.error(err);
                    return;
                }
                var list = projects.map(function (project) {
                    return '<option value="' + store.org + '/' + project.number + '">' + project.name + '</option>';
                });
                $screen.find('#project').html(list + '<option>~ None ~</option>');
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
                extraParams = project ? '&projects=' + encodeURIComponent(project) : '',
                url = 'https://github.com/' + repo + '/issues/new?title=' + encodeURIComponent(title) + extraParams;

            // redirect to new issue page for given repo
            chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
                chrome.tabs.update(tabs[0].id, {
                    url: url
                });
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

