# Extensions — LogiTrack Pro

Phase 6C introduces a minimal extension registry so LogiTrack can grow into a marketplace without forking core.

## Concepts

- **Extension**: a Python package with a `manifest = {name, version, hooks: {hook: fn}}` registered via `register_extension(manifest)` or the `@hook("name")` decorator.
- **Hook**: a named point in core code. Core does `await trigger("pre_create:companies", ctx)`; all handlers for that hook run sequentially. `validate:*` hooks may raise `HTTPException` to abort the caller.
- **Context (`ctx`)**: a dict the core passes — always includes `user`; entity hooks include the entity payload (`company`, `product`, etc.).

## Hook surface (P6C focused set)

| Hook | When |
|------|------|
| `pre_create:companies` | before company validation/insert |
| `post_create:companies` | after insert |
| `pre_create:products` | before product insert |
| `post_create:products` | after |
| `pre_create:depots` | before depot insert |
| `post_create:depots` | after |
| `pre_create:stock_transfers` | before stock transfer request |
| `post_create:stock_transfers` | after |
| `validate:invoice` | before invoice generation |
| `custom_report:{name}` | inside reports handlers |

Add more by inserting `await trigger("pre_update:companies", ctx)` etc. — 1 line per hook point.

## Manifest

```python
from extensions.registry import register_extension

async def my_validator(ctx):
    if not ctx["company"].get("gst_number"):
        from fastapi import HTTPException
        raise HTTPException(400, "GST number required by extension")

register_extension({
    "name": "gst-enforcer",
    "version": "0.1.0",
    "hooks": {
        "validate:invoice": my_validator,
        "post_create:companies": my_logger,
    }
})
```

Or decorator style:

```python
from extensions.registry import hook

@hook("post_create:companies")
async def log_company(ctx):
    print("new company", ctx["company"]["name"])
```

## Lifecycle

1. Core imports the extension package at startup (e.g. `import extensions.sample_hello` in `server.py`).
2. Extension registers its hooks.
3. Core triggers hooks at the named points.
4. `GET /api/v1/extensions` lists registered extensions (for ops).

## Sample

`extensions/sample_hello` logs on `post_create:companies` and validates `validate:invoice`. Enable it by ensuring `import extensions.sample_hello` runs at startup (already done in `server.py`).

## Marketplace vision

Extensions become installable per-tenant (enabled via `tenants.feature_flags` or `client_modules`). A future `extensions` table + tenant-scoped enable flag + signed package upload would turn this registry into a marketplace.
