
//
// Screen
// based on templates
//

window.Screen = (function () {

    var $el = $('#screen'),
        templates = null,
        showCallbacks = {};

    // template handler
    function compileTemplate(source) {
        return function (context) {
            var html = source;
            $.each(context, function (k, v) {
                html = html.replace('{{' + k + '}}', v || '');
            });
            return html;
        };
    }

    templates = {
        settings: compileTemplate($('#settings-template').html()),
        'report-issue': compileTemplate($('#report-issue-template').html())
    };

    return {

        // show a specific template screen
        // @param {String} name
        show: function (name, context) {
            $el.html(templates[name](context));

            // handle callback
            if (showCallbacks[name]) {
                showCallbacks[name]($el);
            }

            // support autofocus inside templates
            $el.find('[autofocus]').focus();
        },

        // callback for showing a specific screen
        // @param {String} name
        // @param {Function} callback run when it's shown
        onShow: function (name, callback) {
            showCallbacks[name] = callback;
        }
    }

}());
