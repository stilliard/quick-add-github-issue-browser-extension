
//
// Issue Form
//
// Restores field state & watches for changes to save state
//

window.IssueForm = (function () {

    var fields = {};

    return {

        init: function ($screen) {

            chrome.storage.local.get(['fields'], function (result) {

                // restore field state
                if (result.fields) {
                    fields = JSON.parse(result.fields);
                    $screen.find('select').each(function () {
                        var $input = $(this),
                            val = fields[$input.attr('name')];
                        if (val != undefined) {
                            $input.val(val).trigger('change');
                        }
                    });
                    $screen.find('input[type="radio"]').each(function () {
                        var $input = $(this),
                            val = fields[$input.attr('name')];
                        if (val != undefined) {
                            $input.filter('#' + val).prop('checked', true);
                        }
                    });
                }

                // watch for field changes
                $screen.find('select').on('change', function () {
                    var $input = $(this);
                    fields[$input.attr('name')] = $input.val();
                    chrome.storage.local.set({ fields: JSON.stringify(fields) });
                });
                $screen.find('input[type="radio"]').on('change', function () {
                    var $input = $(this);
                    fields[$input.attr('name')] = $input.attr('id');
                    chrome.storage.local.set({ fields: JSON.stringify(fields) });
                });
            });

        }

    }

}());
