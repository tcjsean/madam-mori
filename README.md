# Madam Mori

Memory across your AI tools. Published by **AXETEXA PTE LTD**.

**Current release: 0.4.7** · [Install and connect](https://www.mdmori.com/connect/memory) · [Releases](https://github.com/tcjsean/madam-mori/releases)

## Codex CLI and desktop

```sh
codex plugin marketplace add https://github.com/tcjsean/madam-mori.git
codex plugin add madam-mori@madam-mori
```

Start a fresh session and ask: `Use $mori-setup to connect my Mori account.`
Complete the browser sign-in and approve the named Mori permission screen.

## Claude Code

```sh
claude plugin marketplace add tcjsean/madam-mori
claude plugin install madam-mori@madam-mori
```

Start a fresh session and run `/madam-mori:mori-setup`.

## ChatGPT

Public directory approval is pending. The ChatGPT bundle is for supported private
imports and review. It is not a one-click public ChatGPT installation.

## What is included

One hosted Mori connection, three skills (Setup, Memory, Reconnect), Archivist
helper and knowledge-bank framework, branding and optional project instructions.
Nine remote tools are supplied after account authorization. No credentials,
customer memory, development services or private application code are included.
The graph and evidence stay in the user's Mori account. Installing the helper
does not schedule background organisation. Automatic skill invocation depends on
the host and model. Setup verifies actual access without saving test facts.

## Versions and verification

Installations track the current default branch. Tagged releases (`v0.4.7`)
and ZIP assets preserve a fixed version. Each release includes SHA256SUMS.
Verify downloaded ZIPs with `shasum -a 256 -c SHA256SUMS` in the download folder.
Use the host's plugin settings to refresh its marketplace and update the plugin;
start a fresh session after updating. Version information is also served at
https://www.mdmori.com/downloads/madam-mori/latest.json.

## Account and support

Sign in or register at https://www.mdmori.com. Manage access in
[Sign-in & security](https://www.mdmori.com/profile/security). Uninstalling a plugin does not
remove your account. Report installation bugs in this repository's Issues;
never post secrets or private memory. Use the bundled Reconnect skill for
account connection recovery.

## Distribution boundary

This repository contains the client distribution only. The application, hosted
Memory Core and customer evidence are maintained separately. Public availability
here does not imply listing approval from OpenAI or Anthropic.
