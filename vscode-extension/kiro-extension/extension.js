const vscode = require("vscode");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

let timer = null;
let statusBar = null;
let previousState = null;

function boardUrl() {
  return vscode.workspace.getConfiguration("anuKiro").get("boardUrl", "").replace(/\/$/, "");
}

function postBoard(event, sessionId, message, cwd) {
  const base = boardUrl();
  if (!base) return;

  let url;
  try {
    url = new URL(base + "/hook");
  } catch {
    return;
  }

  const body = JSON.stringify({
    hook_event_name: event,
    session_id: sessionId || "kiro-" + process.pid,
    cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "kiro",
    agent: "kiro",
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

function setStatus(label, color, event, sessionId, message, cwd) {
  if (!statusBar) return;
  statusBar.text = "$(radio-tower) " + label;
  statusBar.color = color;
  if (event) postBoard(event, sessionId, message, cwd);
}

function findLatestKiroSession() {
  const sessionsRoot = path.join(os.homedir(), ".kiro", "sessions");
  if (!fs.existsSync(sessionsRoot)) return null;

  let latest = null;
  function walk(directory) {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name === "session.json") {
        try {
          const stat = fs.statSync(fullPath);
          const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));
          if (!latest || stat.mtimeMs > latest.mtimeMs) {
            latest = { ...json, path: fullPath, mtimeMs: stat.mtimeMs };
          }
        } catch {}
      }
    }
  }
  walk(sessionsRoot);
  return latest;
}

function readLatestMessageTypes(session) {
  if (!session?.path) return [];
  const messagesPath = path.join(path.dirname(session.path), "messages.jsonl");
  try {
    const text = fs.readFileSync(messagesPath, "utf8");
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    return lines.slice(-20).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function inspectKiroState() {
  const session = findLatestKiroSession();
  if (!session) {
    if (previousState !== "idle") setStatus("Kiro idle", undefined, "SessionEnd", null, "", "");
    previousState = "idle";
    return;
  }

  const status = String(session.status || "").toLowerCase();
  const messages = readLatestMessageTypes(session);
  const newest = messages[messages.length - 1];
  const newestTime = newest?.timestamp ? Date.parse(newest.timestamp) : 0;
  const recentlyModified = Date.now() - Math.max(session.mtimeMs, newestTime || 0) < 15000;
  const recentTurnStart = messages.some(item => item?.payload?.type === "turn_start");
  const recentToolPending = messages.some((item, index) => {
    if (item?.payload?.type !== "tool_call") return false;
    const callId = item.payload.toolCallId;
    return !messages.slice(index + 1).some(result =>
      result?.payload?.type === "tool_result" && result.payload.toolCallId === callId);
  });

  const cwd = session.workspacePaths?.[0] || session.rootPaths?.[0] || "kiro";
  let state;
  let label;
  let color;
  let event;

  if (recentlyModified && (status === "running" || status === "working" || status === "in_progress" || recentToolPending || recentTurnStart)) {
    state = "working";
    label = "Kiro working";
    color = "#4EC9B0";
    event = "UserPromptSubmit";
  } else if (status === "failed" || status === "error") {
    state = "needs-you";
    label = "Kiro needs you";
    color = "#FF6B6B";
    event = "Notification";
  } else {
    state = "done";
    label = "Kiro done";
    color = "#C8C8C8";
    event = "Stop";
  }

  if (previousState !== state) {
    setStatus(label, color, event, session.id, session.description || "", cwd);
    previousState = state;
  } else {
    statusBar.text = "$(radio-tower) " + label;
    statusBar.color = color;
  }
}

function activate(context) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("anuKiro.setWorking", () => setStatus("Kiro working", "#4EC9B0", "UserPromptSubmit")),
    vscode.commands.registerCommand("anuKiro.setNeedsYou", () => setStatus("Kiro needs you", "#FF6B6B", "Notification")),
    vscode.commands.registerCommand("anuKiro.setDone", () => setStatus("Kiro done", "#C8C8C8", "Stop")),
    vscode.commands.registerCommand("anuKiro.setIdle", () => setStatus("Kiro idle", undefined, "SessionEnd")),
    vscode.commands.registerCommand("anuKiro.testBoard", () => {
      postBoard("Notification", "kiro-test", "Kiro test");
      vscode.window.showInformationMessage("Agent Needs You Kiro test sent.");
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration("anuKiro")) startMonitor(context);
    })
  );

  startMonitor(context);
}

function startMonitor() {
  if (timer) clearInterval(timer);
  const pollMs = vscode.workspace.getConfiguration("anuKiro").get("pollIntervalMs", 500);
  timer = setInterval(inspectKiroState, pollMs);
  inspectKiroState();
}

function deactivate() {
  if (timer) clearInterval(timer);
}

module.exports = { activate, deactivate };
