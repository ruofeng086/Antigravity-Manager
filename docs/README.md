# Documentation index

This folder contains developer-focused documentation (architecture, implementation details, and validation steps).

## Proxy
- [`docs/proxy/auth.md`](proxy/auth.md) â€?proxy authorization modes, expected client behavior, and implementation pointers.
- [`docs/proxy/accounts.md`](proxy/accounts.md) â€?account lifecycle in the proxy pool (including auto-disable on `invalid_grant`) and UI behavior.

## z.ai (GLM) integration
- [`docs/zai/implementation.md`](zai/implementation.md) â€?end-to-end â€œwhatâ€™s implementedâ€?and how to validate it.
- [`docs/zai/mcp.md`](zai/mcp.md) â€?MCP endpoints exposed by the proxy (Search / Reader / Vision) and upstream behavior.
- [`docs/zai/provider.md`](zai/provider.md) â€?Anthropic-compatible passthrough provider details and dispatch modes.
- [`docs/zai/vision-mcp.md`](zai/vision-mcp.md) â€?built-in Vision MCP server protocol and tool implementations.
- [`docs/zai/notes.md`](zai/notes.md) â€?research notes, constraints, and future follow-ups (budget/usage, additional endpoints).

## Agent Integrations
- [`docs/jeikcode_integration.md`](jeikcode_integration.md) â€?JeikCode integration guide, one-click synchronization, configuration options, and KV-cache optimization.
