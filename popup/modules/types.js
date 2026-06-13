
//
// Issue Types
//
// An issue "type" abstracts three things that used to be hardcoded:
//   - githubType:   GitHub's native Issue Type, sent as &type= (org-level feature,
//                   silently ignored on repos/orgs without issue types)
//   - labels:       default labels applied via &labels= (supports multiple)
//   - bodyTemplate: the markdown prefilled into the issue body
//
// Stored in chrome.storage.local under `types`, seeded with the defaults below on
// first use. CRUD/editing of types is handled separately (see issue #15).
//

window.Types = (function () {

    // bug report template (unchanged from the original hardcoded version)
    var bugTemplate =
        "### Issue description:\n" +
        "\n" +
        "As a User/Admin/Developer\n" +
        "When I <steps to reproduce>\n" +
        "Currently it <what happens currently>\n" +
        "While it should <what should happen>\n" +
        "Because <some business value>\n" +
        "\n\n";

    // feature/enhancement template
    // order: Story -> Requirements -> Tasks -> Acceptance criteria
    // Requirements = context/links (support tickets, quotes, docs) + key features
    // Acceptance criteria = end validation (what confirms it's done)
    var featureTemplate =
        "### Story:\n" +
        "\n" +
        "As a User/Admin/Developer\n" +
        "I want <some software feature>\n" +
        "So that <some business value>\n" +
        "\n" +
        "### Requirements:\n" +
        "\n" +
        "<!-- context & key features needed: links to support tickets, quotes, docs + the features required -->\n" +
        "- \n" +
        "\n" +
        "### Tasks:\n" +
        "\n" +
        "- [ ] \n" +
        "- [ ] \n" +
        "- [ ] \n" +
        "\n" +
        "### Acceptance criteria:\n" +
        "\n" +
        "<!-- how we validate it's done, e.g. checks/tests that should pass -->\n" +
        "- [ ] \n" +
        "\n\n";

    var DEFAULTS = [
        {
            id: 'bug',
            name: 'Bug',
            githubType: 'Bug',
            labels: ['bug'],
            bodyTemplate: bugTemplate
        },
        {
            id: 'enhancement',
            name: 'Enhancement',
            githubType: 'Feature',
            labels: ['enhancement'],
            bodyTemplate: featureTemplate
        },
        {
            id: 'other',
            name: 'Other',
            githubType: '',
            labels: [],
            bodyTemplate: ''
        }
    ];

    // persist the full set of types
    // @param {Array} types
    // @param {Function} [callback] when saved
    function saveAll(types, callback) {
        chrome.storage.local.set({ types: JSON.stringify(types) }, function () {
            if (callback) callback();
        });
    }

    // get all types, seeding storage with the defaults on first use
    // @param {Function} callback gets given the Array of types
    function getAll(callback) {
        chrome.storage.local.get(['types'], function (result) {
            if (result.types) {
                // the store can be hand-edited (devtools) so parse defensively;
                // fall through to reseed defaults on corrupt/unexpected data
                var parsed = null;
                try {
                    parsed = JSON.parse(result.types);
                } catch (e) {
                    parsed = null;
                }
                if (Array.isArray(parsed) && parsed.length) {
                    callback(parsed);
                    return;
                }
            }
            // first use (or recovery): seed storage with the defaults
            saveAll(DEFAULTS, function () {
                callback(DEFAULTS);
            });
        });
    }

    // find a single type by its id
    // @param {Array} types
    // @param {String} id
    function find(types, id) {
        return types.filter(function (t) { return t.id === id; })[0] || null;
    }

    return {
        DEFAULTS: DEFAULTS,
        getAll: getAll,
        saveAll: saveAll,
        find: find
    }

}());
