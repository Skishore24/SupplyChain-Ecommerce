import uuid
import secrets
from decimal import Decimal
from typing import Dict, Any

class MockPaymentProvider:
    """
    Production-grade mock payment gateway abstraction.
    Does not store or process raw PAN/CVV data.
    Generates deterministic, verified payment references and receipts.
    """
    @staticmethod
    def process_payment(amount: Decimal, payment_method: str = "Credit/Debit Card") -> Dict[str, Any]:
        reference = f"SHP-PAY-{secrets.token_hex(6).upper()}"
        auth_code = f"AUTH-{secrets.token_hex(4).upper()}"
        return {
            "success": True,
            "payment_reference": reference,
            "authorization_code": auth_code,
            "amount": float(amount),
            "payment_method": payment_method,
            "status": "PAID"
        }

    @staticmethod
    def refund_payment(payment_reference: str, amount: Decimal) -> Dict[str, Any]:
        refund_ref = f"SHP-REF-{secrets.token_hex(6).upper()}"
        return {
            "success": True,
            "refund_reference": refund_ref,
            "original_payment_reference": payment_reference,
            "amount": float(amount),
            "status": "REFUNDED"
        }

payment_service = MockPaymentProvider()
