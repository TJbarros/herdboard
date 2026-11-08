<p align="center"><img src="assets/logo.svg" width="96" height="96" alt="Herdboard logo"></p>

<h1 align="center">Herdboard</h1>

<p align="center">A kanban board for your coding agents in <a href="https://herdr.dev">Herdr</a>.<br>See which one needs you, and what it is asking, at a glance.</p>

<p align="center">
  <img src="https://img.shields.io/badge/herdr-layout-E5735F" alt="Herdr layout">
  <img src="https://img.shields.io/badge/tested%20with-herdr--app%200.1.13-3F78D8" alt="Tested with herdr-app 0.1.13">
  <img src="https://img.shields.io/github/license/TJbarros/herdboard" alt="License">
  <img src="https://img.shields.io/badge/language-English%20%C2%B7%20Portugu%C3%AAs-6e7781" alt="English and Portuguese">
</p>

<p align="center"><b>English</b> · <a href="README.pt-BR.md">Português (Brasil)</a></p>

<p align="center"><img src="docs/images/demo.gif" alt="Animation: an agent working; it stops to ask for permission and its card moves to Needs you, showing the question; after the answer it goes back to Working"></p>

<p align="center"><sub>Demo data. An agent asks for permission: its card moves to <b>Needs you</b> with the question; once answered, it goes back to <b>Working</b>.</sub></p>

## Install

### With your Herdr agent

Herdboard is in the [herdr.dev gallery](https://herdr.dev/layouts). Paste the line its
card gives into an agent running in Herdr:

```
Read ~/.config/herdr-app/AGENTS.md, then add this layout: https://github.com/TJbarros/herdboard/tree/main
```

The agent reads every file before it adds the layout. Your own layout stays as it is.

### With the script

```sh
git clone https://github.com/TJbarros/herdboard.git
cd herdboard
scripts/install.sh
```

`scripts/install.sh` copies Herdboard into Herdr's home folder: run from WSL, into the
Windows one (`C:\Users\<you>\.config\herdr-app`); run anywhere else, into
`~/.config/herdr-app`, Herdr's default home. Set `HERDR_APP_HOME` to use another
folder. It only copies files, and adds the `layout:herdboard` section to `keys.json`
(with a backup) when it isn't there; that step needs Python 3.7 or later, and
without it the script tells you to add the section by hand. It is a POSIX shell
script (`sh`); on Windows it was tested from WSL and from Git Bash.

To see first what it would do, run `scripts/install.sh --dry-run`: it prints the Herdr
home it found, every file it would copy (**new**, **overwrite** or **unchanged**) and
what would happen to `keys.json`, and changes nothing.

Then in Herdr: **Settings › Look › Layout › herdboard**, or
`herdr-app do layout.switch --name herdboard`.

Free and open source (Apache-2.0) · runs inside the Herdr app · tested on Windows
with herdr-app 0.1.13.

## Why

With several agents running across projects, the slow part is finding the one that
stopped to ask you something. Herdboard puts every agent of every space on one board
by status, shows a blocked agent's question on its card, and opens new tabs in the
project folder you pick.

## Herdboard and Herdr's default layout

| | Default layout | Herdboard |
| --- | --- | --- |
| Agents | a list in the sidebar | kanban columns by status, every space |
| What a blocked agent asks | open its terminal to read it | shown on its card |
| New tab folder | the focused terminal's | the active tab's, or one you pick |
| Language | English | English or Portuguese |

## Features

- **Needs you, answered from the board**: the question, *Open and answer*, *Peek*,
  and *Yes* / *No* for a Claude Code permission dialog.
- **Cards that say what's going on**: task title, space · tab · branch, time in status.
- **"stuck?"** on an agent working for more than 30 minutes.
- **Peek, Pin and Put away** when you hover a card.
- **New tabs in the right folder**, with a folder picker.
- **One-line header** with every space, an All / This space filter and search.
- **Expand** the terminals to the whole window, and back.
- **Follows your Herdr theme**, light or dark; responsive; English / Portuguese.

![Herdboard](preview.png)

**[Full guide →](docs/guide.md)** using it step by step (with screenshots), keys,
FAQ, update and uninstall.

## Contributing

Bug reports and ideas are welcome: see [CONTRIBUTING](CONTRIBUTING.md). Changes are
listed in the [CHANGELOG](CHANGELOG.md).

## License

Apache License 2.0. Derived from the `board` example in
[herdr-layout-examples](https://github.com/herdrdev/herdr-layout-examples) and from
mods shipped with Herdr; see [NOTICE](NOTICE). Not affiliated with the Herdr project.
