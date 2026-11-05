<img alt="Emdash" src="https://github.com/user-attachments/assets/a2ecaf3c-9d84-40ca-9a8e-d4f612cc1c6f" />

<div align="center">

[Download](https://emdash.sh/download) · [Docs](https://emdash.sh/docs) · [Releases](https://github.com/generalaction/emdash/releases/latest) · [Discord](https://discord.gg/f2fv7YxuR2) · [Contributing](CONTRIBUTING.md)

<br />

[![Apache 2.0 License](https://img.shields.io/badge/License-Apache_2.0-555555.svg?labelColor=333333&color=666666)](./LICENSE.md)
[![Downloads](https://img.shields.io/github/downloads/generalaction/emdash/total?labelColor=333333&color=666666)](https://github.com/generalaction/emdash/releases)
[![GitHub Stars](https://img.shields.io/github/stars/generalaction/emdash?labelColor=333333&color=666666&logo=github)](https://github.com/generalaction/emdash)
[![Last Commit](https://img.shields.io/github/last-commit/generalaction/emdash?labelColor=333333&color=666666)](https://github.com/generalaction/emdash/commits/main)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/generalaction/emdash?labelColor=333333&color=666666)](https://github.com/generalaction/emdash/graphs/commit-activity)

[![Discord](https://img.shields.io/badge/Discord-join-%235462eb?labelColor=%235462eb&logo=discord&logoColor=%23f5f5f5)](https://discord.gg/f2fv7YxuR2)
<a href="https://www.ycombinator.com"><img src="https://img.shields.io/badge/Y%20Combinator-W26-orange" alt="Y Combinator W26"></a>
[![Follow @emdashsh on X](https://img.shields.io/twitter/follow/emdashsh?logo=X&color=%23f5f5f5)](https://twitter.com/intent/follow?screen_name=emdashsh)

</div>

Emdash is a desktop app for running AI coding agents in parallel. Each task runs in its
own Git worktree, so you can explore multiple fixes or features at once, review the
diffs, and merge what works.

It works with local projects and remote machines over SSH. Bring the CLI agents you
already use: Claude Code, Codex, OpenCode, Amp, and more.

<img alt="Emdash product screenshot" src="https://emdash.sh/media/blog/public-v1-beta/v1beta.jpg" />

## What You Can Do

- Run multiple coding agents at once without juggling terminals.
- Keep every agent isolated in its own Git worktree and branch.
- Send issues and tickets from Linear, GitHub, Jira, GitLab, Asana, Featurebase,
  Monday.com, Forgejo, Plain, or YouTrack into an agent.
- Review diffs, create pull requests, inspect CI checks, and merge from one place.
- Work locally or on your own remote machines over SSH/SFTP.

## Installation

| Platform | Install |
| --- | --- |
| macOS | `brew install --cask emdash` · [Apple Silicon](https://github.com/generalaction/emdash/releases/latest/download/emdash-arm64.dmg) · [Intel](https://github.com/generalaction/emdash/releases/latest/download/emdash-x64.dmg) |
| Windows | [Installer](https://github.com/generalaction/emdash/releases/latest/download/emdash-x64.msi) · [Portable](https://github.com/generalaction/emdash/releases/latest/download/emdash-x64.exe) |
| Linux x64 | [AppImage](https://github.com/generalaction/emdash/releases/latest/download/emdash-x86_64.AppImage) · [DEB](https://github.com/generalaction/emdash/releases/latest/download/emdash-amd64.deb) · [RPM](https://github.com/generalaction/emdash/releases/latest/download/emdash-x86_64.rpm) |
| Linux ARM64 | [AppImage](https://github.com/generalaction/emdash/releases/latest/download/emdash-arm64.AppImage) · [DEB](https://github.com/generalaction/emdash/releases/latest/download/emdash-arm64.deb) · [RPM](https://github.com/generalaction/emdash/releases/latest/download/emdash-aarch64.rpm) |

See the [latest release](https://github.com/generalaction/emdash/releases/latest) for
all desktop builds.

## Agents

Emdash detects installed provider CLIs automatically. It supports agents like Claude
Code, Codex, Cursor, OpenCode, Amp, Devin, Qwen Code, Droid, and GitHub
Copilot.

For agents with lifecycle-hook support, Emdash installs marker-tagged entries in the agent's
user-level config. These hooks let Emdash track status, notifications, and resumable sessions, and
silently do nothing when the agent runs outside an Emdash session.

See [Providers](https://emdash.sh/docs/providers) for the full list, setup commands,
and provider-specific behavior.

## Remote Projects

Connect to remote machines with SSH/SFTP and run the same parallel workflow on remote
codebases. Emdash supports SSH agent, key, and password authentication, including OpenSSH
certificates held by the agent, with credentials stored in your OS keychain.

See [Remote Projects](https://emdash.sh/docs/remote-projects) for setup details.

## Mainmod Keybindings

Mainmod is a keyboard layer for moving between tasks and acting on them without the mouse. Hold
Left ⌘, the key directly left of the space bar on a Mac, and press a key. Hold it briefly to see the
keys on screen, with task distances shown in the sidebar. You can turn it off in
Settings > Interface.

| Hold Left ⌘ and press | Action |
| --- | --- |
| `j` or `↓` | Next task |
| `k` or `↑` | Previous task |
| `1`–`9`, then `j` or `k` | Move that many tasks, for example `3` `j` |
| `n` | New task |
| `t` | New conversation |
| `r` | Restart the active agent on the same session |
| `d` `d` | Stop the task now and delete it after 1 hour |
| `u` | Undo the latest scheduled delete |
| `m` | Show MCP servers |

`d` `d` shows an Undo toast and lists the task under "Deleting soon" in the sidebar until the hour
is up. The delete then removes the task's worktree and chats, including any uncommitted changes.
Its branch is removed only if deleting branches by default is turned on in settings.

Those keys replace their usual ⌘ shortcuts on Left ⌘. Right ⌘ never enters the layer, so these
shortcuts stay available there:

| Right ⌘ shortcut | Action |
| --- | --- |
| `⌘K` | Command palette |
| `⌘J` | Terminal drawer |
| `⌘D` | New conversation in a right split |
| `⌘R` | Reload the app |
| `⌘M` | Minimize the window |
| `⌘1`–`⌘9` | Open tab 1–9 |
| `⌘↑` or `⌘↓` | Jump to the top or bottom in text fields and editors |

Every other ⌘ shortcut works as normal on either key, including anything combined with Shift, ⌥,
or ⌃.

## Privacy

Emdash is local-first. App state is stored in a local SQLite database, and Emdash does
not send your code or chats to Emdash servers.

Agent CLIs may send code, prompts, and context to their own providers. Their data
handling depends on the provider you choose.

Telemetry is optional and can be disabled in Settings or by launching with:

```bash
TELEMETRY_ENABLED=false
```

See [Telemetry](https://emdash.sh/docs/telemetry) for details.

## Contributing

Contributions are welcome. Read the [Contributing Guide](CONTRIBUTING.md), open an
issue, or join the [Discord](https://discord.gg/f2fv7YxuR2).

## License

Licensed under the [Apache-2.0 license](LICENSE.md).
