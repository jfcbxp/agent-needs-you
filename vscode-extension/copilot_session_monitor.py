import json
import sqlite3
import sys
import time

database = sys.argv[1]
poll_ms = max(100, int(sys.argv[2] if len(sys.argv) > 2 else 500))
turn_states = {}

while True:
    try:
        connection = sqlite3.connect(database, timeout=1)
        rows = connection.execute(
            "SELECT t.id, t.session_id, t.turn_index, t.user_message, "
            "t.assistant_response, t.timestamp, s.cwd, s.repository "
            "FROM turns t JOIN sessions s ON s.id=t.session_id "
            "ORDER BY t.timestamp DESC LIMIT 20"
        ).fetchall()
        connection.close()

        latest = rows[0] if rows else None
        if latest:
            turn_id = latest[0]
            completed = bool(latest[4])
            previous_completed = turn_states.get(turn_id)
            if previous_completed is None or previous_completed != completed:
                turn_states[turn_id] = completed
                event = "Stop" if completed else "UserPromptSubmit"
                print(json.dumps({
                    "hook_event_name": event,
                    "session_id": latest[1],
                    "cwd": latest[6] or latest[7] or "copilot",
                    "agent": "copilot",
                    "message": "Copilot needs your attention" if not latest[4] else ""
                }), flush=True)
    except Exception as error:
        print(json.dumps({"error": str(error)}), flush=True)
    time.sleep(poll_ms / 1000)
