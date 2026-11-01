# Agent Needs You - Kiro

Monitors local Kiro session files and posts working, done, needs-you, or idle
events to an Agent Needs You board.

## Complete installation on Windows

```text
$src = "C:\Users\$env:USERNAME\Documents\agent-needs-you\vscode-extension\kiro-extension"
$dst = "$env:USERPROFILE\.kiro\extensions\anu-kiro-0.1.0"
New-Item -Path $dst -ItemType Directory -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $src '*') -Destination $dst -Recurse -Force
```

Reload the Kiro window. Set the user setting:

```text
anuKiro.boardUrl=http://<board-ip>
```

Available commands:

- `Agent Needs You: Kiro Set Working`
- `Agent Needs You: Kiro Set Needs You`
- `Agent Needs You: Kiro Set Done`
- `Agent Needs You: Kiro Set Idle`
- `Agent Needs You: Kiro Test Board`
