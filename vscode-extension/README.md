# Agent Needs You - Copilot

VS Code extension that reports GitHub Copilot Chat activity to the board.

## Install

From VS Code's Extensions view, use **Install from VSIX** after packaging this folder with `vsce`.
Alternatively, copy this folder to `%USERPROFILE%\.vscode\extensions\anu-copilot-0.1.0`, then run **Developer: Reload Window**.

## Behavior

The extension monitors the local Copilot Chat session database:

- a new turn without a completed assistant response is shown as working;
- a new turn with a completed assistant response is shown as done.

Commands are available from the Command Palette to manually set **Needs You**, **Working**, **Done**, or **Idle**. The board URL defaults to `http://192.168.68.232` and can be changed in VS Code settings.
