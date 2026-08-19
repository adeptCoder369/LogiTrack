"""Billing provider stubs (Phase 6B).

Real SDK calls are intentionally absent — these are placeholder interfaces
behind BaseBillingProvider so the webhook + subscription wiring can be
verified without external keys. Replace the methods with real Stripe/PayPal
SDK calls when going live.
"""
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseBillingProvider(ABC):
    provider_name: str = "base"

    @abstractmethod
    def create_checkout_session(self, tenant_id: str, plan: str) -> dict:
        """Return a fake checkout URL (real impl would call Stripe/PayPal)."""

    @abstractmethod
    def create_portal_session(self, tenant_id: str) -> dict:
        """Return a fake billing portal URL."""

    @abstractmethod
    def handle_webhook(self, payload: dict, signature: str | None = None) -> dict:
        """Verify (stub) and normalize a webhook payload."""

    @abstractmethod
    def get_subscription(self, provider_subscription_id: str) -> dict | None:
        """Fetch a provider subscription (stub)."""


class StripeProvider(BaseBillingProvider):
    provider_name = "stripe"

    def create_checkout_session(self, tenant_id: str, plan: str) -> dict:
        logger.info("stripe stub: create_checkout_session tenant=%s plan=%s", tenant_id, plan)
        return {
            "provider": "stripe",
            "checkout_url": f"https://checkout.stripe.test/c/{tenant_id}/{plan}",
            "provider_subscription_id": f"sub_stripe_{tenant_id}_{plan}",
        }

    def create_portal_session(self, tenant_id: str) -> dict:
        logger.info("stripe stub: create_portal_session tenant=%s", tenant_id)
        return {"provider": "stripe", "portal_url": f"https://billing.stripe.test/p/{tenant_id}"}

    def handle_webhook(self, payload: dict, signature: str | None = None) -> dict:
        logger.info("stripe stub: handle_webhook signature=%s payload_keys=%s", signature, list(payload.keys()))
        # Stub verification: accept anything, normalize to a common shape
        return {
            "provider": "stripe",
            "event_type": payload.get("type") or payload.get("event_type") or "unknown",
            "provider_subscription_id": (payload.get("data") or {}).get("object", {}).get("id") or payload.get("provider_subscription_id"),
            "status": (payload.get("data") or {}).get("object", {}).get("status") or payload.get("status"),
        }

    def get_subscription(self, provider_subscription_id: str) -> dict | None:
        logger.info("stripe stub: get_subscription %s", provider_subscription_id)
        return {"provider": "stripe", "id": provider_subscription_id, "status": "active"}


class PayPalProvider(BaseBillingProvider):
    provider_name = "paypal"

    def create_checkout_session(self, tenant_id: str, plan: str) -> dict:
        logger.info("paypal stub: create_checkout_session tenant=%s plan=%s", tenant_id, plan)
        return {
            "provider": "paypal",
            "checkout_url": f"https://www.paypal.test/checkout/{tenant_id}/{plan}",
            "provider_subscription_id": f"sub_paypal_{tenant_id}_{plan}",
        }

    def create_portal_session(self, tenant_id: str) -> dict:
        logger.info("paypal stub: create_portal_session tenant=%s", tenant_id)
        return {"provider": "paypal", "portal_url": f"https://www.paypal.test/billing/{tenant_id}"}

    def handle_webhook(self, payload: dict, signature: str | None = None) -> dict:
        logger.info("paypal stub: handle_webhook signature=%s", signature)
        return {
            "provider": "paypal",
            "event_type": payload.get("event_type") or "unknown",
            "provider_subscription_id": payload.get("resource", {}).get("id") or payload.get("provider_subscription_id"),
            "status": payload.get("resource", {}).get("status") or payload.get("status"),
        }

    def get_subscription(self, provider_subscription_id: str) -> dict | None:
        logger.info("paypal stub: get_subscription %s", provider_subscription_id)
        return {"provider": "paypal", "id": provider_subscription_id, "status": "active"}


billing_providers: dict[str, BaseBillingProvider] = {
    "stripe": StripeProvider(),
    "paypal": PayPalProvider(),
}


def get_provider(name: str) -> BaseBillingProvider:
    provider = billing_providers.get(name)
    if not provider:
        raise ValueError(f"Unknown billing provider: {name}")
    return provider
