
//
// Handle accessability for our hidden checkboxs where only the label is shown
// We use tabindex on them so users can tab to them
// but we want users to be able to press enter or space to trigger a click
//
$('body').on('keypress', '.hidden-checkbox-label', function (e) {
    var enterKeyCode = 13,
    spaceKeyCode = 32;

    console.log('Pressed: ', e.which);

    if (e.which == enterKeyCode || e.which == spaceKeyCode) {
        e.preventDefault();
        $(this).click();
    }
});
