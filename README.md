
# Browser extension to quickly report issues to GitHub

![screenshot](./images/screenshot.png)

**Make sure you have setup your popup/config.js first!** - copy the popup/config.js.example to popup/config.js and set a secret for it to work.

Supports Chrome & Firefox.

- [Chrome Extension](https://chrome.google.com/webstore/detail/quick-add-issue-to-github/mgamfhobfmlghohfjdiecjhddoigenkk)
- [Firefox Addon](https://addons.mozilla.org/en-GB/firefox/addon/quick-add-issue-to-github/)

Features:
- Sending issues to github
- Select a repo based on your user or set a specific org.
- When using a specific org you can also set an org project.
- Set issue type/labels
- Bugs/enhancements also currently come with a issue template.
- Screenshot support
- Url & debug info (such as browser UA, etc.)

------

A few ideas:

- ~~Upgrade to use the new github projects api~~
- Support projects at a repo level too
- Select labels based on ones for selected repo
- Allow setting issue templates (currently hardcoded)
- Screenshot hosting, (currently it downloads and you drag it back in manually)
- Better oauth flow to avoid personal access key usage

-------

Local dev:

- Install packages with `npm install`
- Build js with `npm run build` (or `npm run watch` for dev)
- Make the zip extension with `make`
- Locally test the extension in chrome by going to `chrome://extensions/` and loading in this folder as an unpacked extension.
- When ready, update the version in the manifest.json and then run `make` again to update the zip file, then upload latest version via https://chrome.google.com/webstore/devconsole/

-------

Current icon from: https://octicons.github.com/icon/report/

**[Contributions welcome](https://github.com/stilliard/quick-add-github-issue-browser-extension) :)**
