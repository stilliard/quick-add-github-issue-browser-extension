
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
                    try {
                        fields = JSON.parse(result.fields) || {};
                    } catch (e) {
                        fields = {};
                    }
                    $screen.find('select').each(function () {
                        var $input = $(this),
                            val = fields[$input.attr('name')];
                        if (val != undefined) {
                            var desired = String(val);
                            $input.val(desired);

                            // Only trigger change when the value actually exists in the dropdown.
                            // This prevents overwriting persisted state when options haven't loaded yet.
                            if (String($input.val() || '') === desired) {
                                $input.trigger('change');
                            }
                        }
                    });
                    $screen.find('input[type="radio"]').each(function () {
                        var $input = $(this),
                            val = fields[$input.attr('name')];
                        if (val != undefined) {
                            $input.filter('#' + val).prop('checked', true);
                        }
                    });

                    // restore text inputs and textareas (e.g., description)
                    $screen.find('input[type="text"], textarea').each(function () {
                        var $input = $(this),
                            val = fields[$input.attr('name')];
                        if (val != undefined) {
                            $input.val(val);
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

                $screen.find('input[type="text"], textarea').on('input', function () {
                    var $input = $(this);
                    fields[$input.attr('name')] = $input.val();
                    chrome.storage.local.set({ fields: JSON.stringify(fields) });
                });
            });

        }

    }

}());
