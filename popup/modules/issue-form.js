
//
// Issue Form
//
// Restores field state & watches for changes to save state
//

window.IssueForm = (function () {

    var fields = {};

    return {

        init: function ($screen) {

            // restore field state
            chrome.storage.local.get(['fields'], function (result) {
                if (! result.fields) {
                    return;
                }
                fields = JSON.parse(result.fields);
                $screen.find('select').each(function () {
                    var $input = $(this),
                        val = fields[$input.attr('id')];
                    if (val) {
                        $input.val(fields[$input.attr('id')]);
                    }
                });
                $screen.find('input[type="radio"]').each(function () {
                    var $input = $(this),
                        val = fields[$input.attr('id')];
                    if (val) {
                        $input.prop('checked', val);
                    }
                });
            });

            // watch for field changes
            $screen.find('select').on('change', function () {
                var $input = $(this);
                fields[$input.attr('id')] = $input.val();
                chrome.storage.local.set({ fields: JSON.stringify(fields) });
            });
            $screen.find('input[type="radio"]').on('change', function () {
                var $input = $(this);
                fields[$input.attr('id')] = $input.prop('checked');
                chrome.storage.local.set({ fields: JSON.stringify(fields) });
            });
        }

    }

}());
