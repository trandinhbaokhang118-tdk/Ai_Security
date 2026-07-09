"""MCP stdio server entry point (module-specification.md M5).

Registers the 3 Security Armor tools with the MCP runtime. Requires the `mcp` package
(`pip install ai-security-armor[mcp]`). The tool logic lives in tools.py so it can be
tested without the runtime.

Run: python -m mcp_server.server
"""

from __future__ import annotations

from mcp_server.tools import TOOL_DEFINITIONS, MCPTools


def build_server():  # pragma: no cover - requires mcp package + runtime
    import json

    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import TextContent, Tool

    tools = MCPTools()
    server = Server("ai-security-armor")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return [
            Tool(
                name=d["name"],
                description=d["description"],
                inputSchema=d["inputSchema"],
            )
            for d in TOOL_DEFINITIONS
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        result = tools.dispatch(name, arguments or {})
        return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False))]

    async def _run():
        async with stdio_server() as (read, write):
            await server.run(read, write, server.create_initialization_options())

    return _run


def main() -> None:  # pragma: no cover
    import asyncio

    asyncio.run(build_server()())


if __name__ == "__main__":  # pragma: no cover
    main()
