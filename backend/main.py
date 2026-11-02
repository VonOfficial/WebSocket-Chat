
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()


def create_message(type, username, text):
    return {
        "type": type,
        "username": username,
        "text": text,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket, username):
        await websocket.accept()
        self.active_connections[username] = websocket

    def disconnect(self, username):
        self.active_connections.pop(username, None)

    async def broadcast(self, message, exclude=None):
        for username, connection in list(self.active_connections.items()):
            if username != exclude:
                try:
                    await connection.send_json(message)
                except (WebSocketDisconnect, RuntimeError):
                    self.disconnect(username)


manager = ConnectionManager()


@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    username = username.strip()

    if (
        not username
        or len(username) > 24
        or username in manager.active_connections
    ):
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, username)

    await manager.broadcast(
        create_message(
            "system",
            "Система",
            f"{username} присоединился к чату"
        ),
        exclude=username
    )

    try:
        while True:
            data = await websocket.receive_json()

            if not isinstance(data, dict):
                continue

            if data.get("type") != "chat":
                continue

            text = data.get("text", "")

            if not isinstance(text, str):
                continue

            text = text.strip()

            if text:
                message = create_message(
                    "chat",
                    username,
                    text[:1000]
                )

                await manager.broadcast(message)

    except WebSocketDisconnect:
        pass

    finally:
        manager.disconnect(username)

        await manager.broadcast(
            create_message(
                "system",
                "Система",
                f"{username} покинул чат"
            )
        )
