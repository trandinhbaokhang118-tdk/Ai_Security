"""MCP server with stdio, SSE, and Streamable HTTP transports."""

from __future__ import annotations

import argparse
import os
from typing import Any, Literal

import uvicorn
from fastapi import HTTPException
from mcp.server.auth.settings import AuthSettings, ClientRegistrationOptions, RevocationOptions
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from backend.config import settings
from mcp_server.auth import MCPApiKeyMiddleware, current_mcp_identity, reserve_mcp_scan_quota
from mcp_server.oauth import OAUTH_SCOPES, PrewiseOAuthProvider, install_oauth_routes
from mcp_server.tools import MCPTools


def build_server(host: str = "127.0.0.1", port: int = 3001) -> FastMCP:
    handlers = MCPTools()
    oauth_provider = PrewiseOAuthProvider()

    def dispatch(name: str, arguments: dict[str, Any], *, consume_scan: bool = True) -> dict[str, Any]:
        if consume_scan:
            try:
                reserve_mcp_scan_quota()
            except HTTPException as exc:
                return {
                    "error": "quota_exceeded" if exc.status_code == 429 else "access_denied",
                    "detail": exc.detail,
                    "status_code": exc.status_code,
                }
        return handlers.dispatch(name, arguments)
    allowed_hosts = ["localhost", "127.0.0.1", f"{host}:{port}"]
    allowed_hosts.extend(value.strip() for value in os.getenv("MCP_ALLOWED_HOSTS", "").split(",") if value.strip())
    allowed_origins = [
        value.strip() for value in os.getenv("MCP_ALLOWED_ORIGINS", "").split(",") if value.strip()
    ]
    server = FastMCP(
        "ai-security-armor",
        instructions="Assess risk before an AI agent processes content or takes action.",
        host=host,
        port=port,
        sse_path="/sse",
        message_path="/messages/",
        streamable_http_path="/mcp",
        stateless_http=True,
        json_response=True,
        auth_server_provider=oauth_provider,
        auth=AuthSettings(
            issuer_url=settings.mcp_public_url,
            resource_server_url=f"{settings.mcp_public_url.rstrip('/')}/mcp",
            required_scopes=OAUTH_SCOPES,
            client_registration_options=ClientRegistrationOptions(
                enabled=True,
                valid_scopes=OAUTH_SCOPES,
                default_scopes=OAUTH_SCOPES,
            ),
            revocation_options=RevocationOptions(enabled=True),
        ),
        transport_security=TransportSecuritySettings(
            enable_dns_rebinding_protection=True,
            allowed_hosts=allowed_hosts,
            allowed_origins=allowed_origins,
        ),
    )
    install_oauth_routes(server)

    @server.tool(name="prewise_connection_test")
    def prewise_connection_test(request: str = "test") -> dict[str, Any]:
        """Test MCP connectivity and authentication; returns status done."""
        result = dispatch("prewise_connection_test", {"request": request}, consume_scan=False)
        identity = current_mcp_identity.get()
        result["authenticated"] = bool(identity and identity.authenticated)
        return result

    @server.tool(name="assess_url")
    def assess_url(url: str, context: str = "") -> dict[str, Any]:
        return dispatch("assess_url", {"url": url, "context": context})

    @server.tool(name="assess_text")
    def assess_text(
        content: str,
        content_type: Literal["email", "sms", "text", "webpage", "chat_message", "prompt"] = "text",
    ) -> dict[str, Any]:
        return dispatch(
            "assess_text",
            {"content": content, "content_type": content_type},
        )

    @server.tool(name="assess_tool_output")
    def assess_tool_output(
        content: str,
        tool_name: str,
        intended_use: Literal["read_only", "memory_write", "tool_argument", "user_display"] = "read_only",
    ) -> dict[str, Any]:
        return dispatch(
            "assess_tool_output",
            {"content": content, "tool_name": tool_name, "intended_use": intended_use},
        )

    @server.tool(name="scan_prompt_injection")
    def scan_prompt_injection(content: str) -> dict[str, Any]:
        return dispatch(
            "scan_prompt_injection",
            {"content": content, "content_type": "prompt"},
        )

    @server.tool(name="assess_action")
    def assess_action(
        action_type: Literal[
            "open_url", "click_link", "submit_form", "send_email", "download_file",
            "open_file", "execute_file", "copy_data", "call_api", "upload_file",
        ],
        target: str,
        protected_assets: list[str] | None = None,
    ) -> dict[str, Any]:
        return dispatch(
            "assess_action",
            {
                "action_type": action_type,
                "target": target,
                "protected_assets": protected_assets or [],
            },
        )

    @server.tool(name="assess_page")
    def assess_page(html: str, url: str = "") -> dict[str, Any]:
        return dispatch("assess_page", {"html": html, "url": url})

    @server.tool(name="assess_file_static")
    def assess_file_static(path: str) -> dict[str, Any]:
        return dispatch("assess_file_static", {"path": path})

    @server.tool(name="summarize_risk_safely")
    def summarize_risk_safely(risk_score: float, evidence: list[str] | None = None) -> dict[str, Any]:
        return dispatch(
            "summarize_risk_safely",
            {"risk_score": risk_score, "evidence": evidence or []},
            consume_scan=False,
        )

    return server


def main() -> None:
    parser = argparse.ArgumentParser(description="AI Security Armor MCP server")
    parser.add_argument(
        "--transport",
        choices=("stdio", "sse", "streamable-http"),
        default="stdio",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3001)
    args = parser.parse_args()
    server = build_server(args.host, args.port)
    if args.transport == "streamable-http":
        app = MCPApiKeyMiddleware(server.streamable_http_app())
        uvicorn.run(
            app,
            host=args.host,
            port=args.port,
            proxy_headers=True,
            server_header=False,
            date_header=False,
            access_log=True,
        )
        return
    if args.transport == "sse":
        parser.error("SSE is disabled for production; use streamable-http or local stdio")
    server.run(transport="stdio")


if __name__ == "__main__":
    main()
