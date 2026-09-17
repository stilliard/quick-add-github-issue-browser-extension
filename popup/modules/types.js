
//
// Issue Types
//
// An issue "type" abstracts three things that used to be hardcoded:
//   - githubType:   GitHub's native Issue Type, sent as &type= (org-level feature,
//                   silently ignored on repos/orgs without issue types)
//   - labels:       default labels applied via &labels= (supports multiple)
//   - bodyTemplate: the markdown prefilled into the issue body
//
// For now the defaults below are the single source of truth, so every user gets
// the latest. User-customised types (stored in chrome.storage) arrive with the
// management UI in issue #15.
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
        "### Requirements: <!-- context & key features needed, links to support tickets, quotes, docs, etc. -->\n" +
        "\n" +
        "- \n" +
        "\n" +
        "### Tasks:\n" +
        "\n" +
        "- [ ] \n" +
        "- [ ] \n" +
        "- [ ] \n" +
        "\n" +
        "### Acceptance criteria: <!-- how we validate it's done, e.g. key checks/tests -->\n" +
        "\n" +
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

    // get all types — just the code defaults for now. Callback-style because #15
    // will read user-customised types from chrome.storage (async) here.
    // @param {Function} callback gets given the Array of types
    function getAll(callback) {
        callback(DEFAULTS);
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
        find: find
    }

}());
