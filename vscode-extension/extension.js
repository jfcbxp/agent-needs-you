const vscode = require("vscode");
const http = require("http");
const https = require("https");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let monitor = null;
let statusBar = null;

function boardUrl() {
  return vscode.workspace.getConfiguration("anuCopilot").get("boardUrl", "").replace(/\/$/, "");
}

function postBoard(event, sessionId, message) {
  const url = new URL(boardUrl() + "/hook");
  const body = JSON.stringify({
    hook_event_name: event,
    session_id: sessionId || "copilot-" + process.pid,
    cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "copilot",
    agent: "copilot",
    message: message || ""
  });
  const client = url.protocol === "https:" ? https : http;
  const request = client.request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
  }, response => response.resume());
  request.setTimeout(1500, () => request.destroy());
  request.on("error", () => {});
  request.end(body);
}

function setStatus(label, color, event) {
  statusBar.text = "$(radio-tower) " + label;
  statusBar.color = color;
  if (event) postBoard(event);
}

function findSessionDatabase() {
  const appData = process.env.APPDATA;
  if (!appData) return null;
  return path.join(appData, "Code", "User", "globalStorage", "github.copilot-chat", "session-store.db");
}

function startMonitor(context) {
  if (monitor) {
    monitor.kill();
    monitor = null;
  }
  const database = findSessionDatabase();
  if (!database || !fs.existsSync(database)) {
    setStatus("Copilot DB unavailable", undefined, null);
    return;
  }

  const pollMs = vscode.workspace.getConfiguration("anuCopilot").get("pollIntervalMs", 500);
  monitor = spawn("python", [
    path.join(context.extensionPath, "copilot_session_monitor.py"),
    database,
    String(pollMs)
  ]);

  let buffer = "";
  monitor.stdout.on("data", data => {
    buffer += data.toString();
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      try {
        const event = JSON.parse(line);
        if (event.error) continue;
        if (event.hook_event_name === "UserPromptSubmit") {
          setStatus("Copilot working", "#4EC9B0", "UserPromptSubmit");
        } else if (event.hook_event_name === "Stop") {
          setStatus("Copilot done", "#C8C8C8", "Stop");
        }
      } catch {}
      newline = buffer.indexOf("\n");
    }
  });
  monitor.on("error", () => setStatus("Copilot monitor error", "#F48771", null));
}

function activate(context) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = "anuCopilot.setNeedsYou";
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("anuCopilot.setWorking", () => setStatus("Working", "#4EC9B0", "UserPromptSubmit")),
    vscode.commands.registerCommand("anuCopilot.setNeedsYou", () => setStatus("Needs you", "#FF6B6B", "Notification")),
    vscode.commands.registerCommand("anuCopilot.setDone", () => setStatus("Done", "#C8C8C8", "Stop")),
    vscode.commands.registerCommand("anuCopilot.setIdle", () => setStatus("Idle", undefined, "SessionEnd")),
    vscode.commands.registerCommand("anuCopilot.testBoard", () => {
      postBoard("Notification", "copilot-test", "Copilot test");
      vscode.window.showInformationMessage("Agent Needs You test sent.");
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration("anuCopilot")) startMonitor(context);
    })
  );

  startMonitor(context);
}

function deactivate() {
  if (monitor) monitor.kill();
}

module.exports = { activate, deactivate };
