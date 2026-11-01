---
inclusion: manual
name: agent-needs-you-board
description: Instructions for setting up the Agent Needs You board hooks on this machine
---

# Agent Needs You — Board Setup

There is a physical desk status light (LilyGO T-Display S3) on the network at **http://192.168.68.232** that shows the state of Kiro sessions on screen. It needs two hook files to work.

## What the board does

- Shows **focused eyes** (blue) while Kiro is working
- Shows **happy eyes** (green) when Kiro finishes and it is the user's turn
- Shows **curious eyes** (amber, with "?") when the board needs attention

## What you need to do

Create the two files below inside `.kiro/hooks/` in the current workspace. If the folder does not exist, create it.

---

### File 1: `.kiro/hooks/anu-working.json`

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "Agent Needs You - Working",
      "trigger": "UserPromptSubmit",
      "description": "Tells the board Kiro is working when the user sends a prompt",
      "action": {
        "type": "command",
        "command": "curl -sf -X POST http://192.168.68.232/hook -H 'Content-Type: application/json' -d '{\"hook_event_name\":\"UserPromptSubmit\",\"session_id\":\"kiro\",\"agent\":\"kiro\",\"message\":\"\"}'"
      }
    }
  ]
}
```

---

### File 2: `.kiro/hooks/anu-done.json`

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "Agent Needs You - Done",
      "trigger": "Stop",
      "description": "Tells the board Kiro is done when it finishes responding",
      "action": {
        "type": "command",
        "command": "curl -sf -X POST http://192.168.68.232/hook -H 'Content-Type: application/json' -d '{\"hook_event_name\":\"Stop\",\"session_id\":\"kiro\",\"agent\":\"kiro\",\"message\":\"\"}'"
      }
    }
  ]
}
```

---

## Notes

- These commands use `curl`, which is natively available on macOS — no extra tools needed.
- The board IP is `192.168.68.232`. If it changes, update both files.
- The hooks are workspace-scoped. To make them global (all workspaces), place the files in `~/.kiro/hooks/` instead.
- To verify the board is reachable: `curl http://192.168.68.232/` — it returns a JSON list of active sessions.
- To test manually: run the curl command from the terminal and check if the board reacts.
