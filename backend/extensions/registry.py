"""Extension registry (Phase 6C).

Hook points: pre_create / post_create / pre_update / post_update on core
entities (companies, products, depots, stock_transfers) + custom_report:*
+ validate:invoice. Extensions register via @hook or register_extension().
"""
import logging
from typing import Callable, Dict, List

logger = logging.getLogger(__name__)

# hook_name -> list[callable]
_registry: Dict[str, List[Callable]] = {}
# name -> manifest
_extensions: Dict[str, dict] = {}


def hook(name: str):
    """Decorator to register a function for a hook.

    Example:
        @hook("post_create:companies")
        async def my_hook(ctx): ...
    """
    def decorator(fn: Callable):
        _registry.setdefault(name, []).append(fn)
        return fn
    return decorator


def register_extension(manifest: dict):
    """Register an extension by manifest: {name, version, hooks: {hook: fn}}."""
    name = manifest.get("name")
    if not name:
        raise ValueError("Extension manifest must have a name")
    if name in _extensions:
        logger.warning("extension %s already registered, overwriting", name)
    _extensions[name] = manifest
    for hook_name, fn in (manifest.get("hooks") or {}).items():
        _registry.setdefault(hook_name, []).append(fn)
    logger.info("extension registered: %s v%s hooks=%s", name, manifest.get("version"), list((manifest.get("hooks") or {}).keys()))


def list_extensions() -> List[dict]:
    return [{"name": k, "version": v.get("version"), "hooks": list((v.get("hooks") or {}).keys())} for k, v in _extensions.items()]


async def trigger(hook_name: str, ctx: dict) -> None:
    """Run all handlers for a hook sequentially.

    Validation hooks (validate:*) may raise HTTPException to abort the
    caller; other hooks are best-effort (exceptions are logged, not raised).
    """
    handlers = _registry.get(hook_name, [])
    if not handlers:
        return
    for fn in handlers:
        try:
            result = fn(ctx)
            # Support both sync and async handlers
            if hasattr(result, "__await__"):
                await result
        except Exception as e:
            # Validation hooks are expected to raise HTTPException — re-raise
            from fastapi import HTTPException
            if isinstance(e, HTTPException):
                raise
            logger.exception("extension hook %s failed: %s", hook_name, e)


def clear_registry():
    """For tests: reset the registry."""
    _registry.clear()
    _extensions.clear()
