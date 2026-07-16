import asyncio

from mcp_server.server import build_server
from mcp_server.tools import MCPTools


def test_mcp_server_registers_required_tools() -> None:
    server = build_server()
    tools = asyncio.run(server.list_tools())
    names = {tool.name for tool in tools}
    assert {
        "prewise_connection_test",
        "assess_url",
        "assess_text",
        "scan_prompt_injection",
        "assess_action",
        "assess_page",
        "assess_file_static",
        "summarize_risk_safely",
    } <= names


def test_connection_tool_replies_done() -> None:
    response = MCPTools().dispatch("prewise_connection_test", {"request": "agent test"})
    assert response == {
        "status": "done",
        "message": "done",
        "received": "agent test",
        "service": "prewise-mcp",
        "authenticated": True,
    }


def test_mcp_http_apps_can_be_constructed() -> None:
    server = build_server(host="127.0.0.1", port=3001)
    assert server.sse_app() is not None
    assert server.streamable_http_app() is not None
