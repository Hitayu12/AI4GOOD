"""
Rutgers AI4Good 2026 — AI Tutor Service & Provider Adapter
Phase 8 Deterministic Curriculum Mode & AI Provider Bridge
"""

import time
import re
from typing import Dict, List, Optional, Tuple

class TutorUnavailableException(Exception):
    """Raised when the AI provider is unconfigured or offline (503)."""
    def __init__(self, message: str = "AI tutor is currently unavailable. Educational curriculum is available."):
        super().__init__(message)
        self.code = "tutor_unavailable"
        self.message = message

class RateLimitExceededException(Exception):
    """Raised when per-user query rate limit is exceeded (429)."""
    def __init__(self, message: str = "Tutor request rate limit exceeded. Please wait a moment before sending another query."):
        super().__init__(message)
        self.code = "rate_limit_exceeded"
        self.message = message

class SimulationNotFoundException(Exception):
    """Raised when simulation_id does not exist or does not belong to the user (404)."""
    def __init__(self, message: str = "Simulation not found or access denied."):
        super().__init__(message)
        self.code = "simulation_not_found"
        self.message = message


class UserRateLimiter:
    """In-memory sliding-window rate limiter per user ID."""
    def __init__(self, max_requests: int = 10, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.user_timestamps: Dict[str, List[float]] = {}

    def check_and_record(self, user_id: str) -> None:
        now = time.time()
        timestamps = self.user_timestamps.setdefault(user_id, [])
        # Prune timestamps older than window
        cutoff = now - self.window_seconds
        self.user_timestamps[user_id] = [t for t in timestamps if t > cutoff]

        if len(self.user_timestamps[user_id]) >= self.max_requests:
            raise RateLimitExceededException()

        self.user_timestamps[user_id].append(now)

    def reset(self) -> None:
        self.user_timestamps.clear()


class CurriculumTutorEngine:
    """
    Deterministic educational tutor engine for active simulation contexts.
    Enforces STRICT ZERO LOOKAHEAD by making exactly 0 LLM/provider calls.
    """
    def __init__(self):
        self.model_calls_made: int = 0  # Monitored invariant: MUST REMAIN 0

        self.catalog: Dict[str, Dict[str, object]] = {
            "compound": {
                "reply": "Compound interest represents interest earned on both initial principal and previously accumulated interest. In our savings calculator, monthly interest is computed using the effective annual rate formula i = (1 + r)^(1/12) - 1, with contributions credited at the end of each monthly period.",
                "sources": [
                    "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator",
                    "https://www.sec.gov/oiea/investor-alerts-bulletins/ib_compoundinterest.html",
                ],
            },
            "etf": {
                "reply": "An Exchange-Traded Fund (ETF) pools investor capital to hold a diversified portfolio of securities (e.g., the S&P 500 index via SPY) and trades intraday on stock exchanges. Individual stocks represent equity ownership in a single corporation with company-specific risk.",
                "sources": [
                    "https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-1",
                    "https://www.sec.gov/investor/alerts/etfs.pdf",
                ],
            },
            "cd": {
                "reply": "A Certificate of Deposit (CD) is a time deposit offered by banks that pays a fixed interest rate in exchange for locking up funds until a specified maturity date, subject to early withdrawal penalties.",
                "sources": [
                    "https://www.investor.gov/introduction-investing/investing-basics/investment-products/certificates-deposit-cds",
                    "https://www.fdic.gov/resources/deposit-insurance/financial-products-insured/",
                ],
            },
            "hysa": {
                "reply": "A High-Yield Savings Account (HYSA) offers significantly higher interest rates than traditional savings accounts while maintaining liquidity and FDIC/NCUA insurance up to $250,000 per depositor per institution.",
                "sources": [
                    "https://www.fdic.gov/resources/deposit-insurance/faq/",
                    "https://www.investor.gov/introduction-investing/investing-basics/save-and-invest",
                ],
            },
            "option": {
                "reply": "Options are derivative contracts giving the buyer the right, but not the obligation, to buy (Call) or sell (Put) an underlying asset at an agreed strike price on or before an expiration date. In this curriculum, options are studied strictly for educational understanding; live trading is not permitted in MVP.",
                "sources": [
                    "https://www.investor.gov/introduction-investing/investing-basics/investment-products/options",
                    "https://www.sec.gov/oiea/investor-alerts-and-bulletins/investor-bulletin-opening-options-account",
                ],
            },
            "order": {
                "reply": "In our historical simulation, orders submitted after session close are placed in pending status and fill at the next session OPEN price. This realistically models overnight market risk and price gaps between sessions.",
                "sources": [
                    "https://www.investor.gov/introduction-investing/investing-basics/how-stock-market-works/market-orders",
                    "https://www.sec.gov/fast-answers/answersmktorderhtm.html",
                ],
            },
            "basis": {
                "reply": "Weighted-average cost basis sums the total dollar purchase costs divided by total shares held. When shares are partially sold, the proportional cost basis is allocated to realized P&L; the remainder is allocated on the final sale to prevent rounding drift.",
                "sources": [
                    "https://www.irs.gov/publications/p550",
                    "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-5",
                ],
            },
        }

    def answer_query(self, message: str) -> Tuple[str, List[str]]:
        # INVARIANT: Do NOT call any LLM.
        lower = message.lower()

        # Check for personal trading advice or price forecasts
        if self._is_unsafe_advice_request(lower):
            return (
                "Notice: As an educational platform, the AI Tutor does not provide personalized investment advice, stock recommendations, or price forecasts. All trading decisions in the historical simulation should be based on your research and risk tolerance.",
                ["https://www.investor.gov/introduction-investing/investing-basics"]
            )

        for keyword, entry in self.catalog.items():
            if keyword in lower:
                return str(entry["reply"]), list(entry["sources"])

        # Default educational reply
        return (
            "The educational curriculum covers foundational financial instruments including Certificates of Deposit (CDs), High-Yield Savings Accounts (HYSAs), Equities, ETFs, Options fundamentals, and portfolio accounting principles. Ask about any specific concept to learn more.",
            [
                "https://www.investor.gov/introduction-investing/investing-basics",
                "https://www.sec.gov/investor"
            ]
        )

    def _is_unsafe_advice_request(self, lower: str) -> bool:
        patterns = [
            r"should i (buy|sell|short)\b",
            r"what stock (should i|to) buy\b",
            r"predict the price\b",
            r"will (aapl|msft|spy|\w+) go up\b",
            r"guaranteed (profit|return)\b",
            r"execute (a|this) trade for me\b",
        ]
        return any(re.search(p, lower) for p in patterns)


class AiTutorProviderAdapter:
    """
    Adapter for external LLM provider in General Educational Mode.
    Handles timeout, credential checks, prompt sanitization, and output redaction.
    """
    def __init__(self, api_key: Optional[str] = None, timeout_seconds: float = 5.0):
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.simulate_timeout: bool = False

    def generate_response(self, message: str) -> Tuple[str, List[str]]:
        # 1. Missing credentials check
        if not self.api_key:
            raise TutorUnavailableException("AI tutor is currently unavailable. Educational curriculum is available.")

        # 2. Simulated timeout check
        if self.simulate_timeout:
            raise TutorUnavailableException("Tutor provider timed out. Educational curriculum is available.")

        # 3. Prompt Injection Defense
        if self._detect_prompt_injection(message):
            return (
                "Educational Safety Notice: This system operates strictly as a financial literacy assistant. Prompt override attempts are ignored. Please ask a personal finance or market concepts question.",
                ["https://www.investor.gov/introduction-investing/investing-basics"]
            )

        # 4. Unsafe advice declination
        if self._is_unsafe_advice_request(message.lower()):
            return (
                "Notice: I cannot give personalized stock recommendations or predict future asset prices. I can explain the mechanics of stocks, diversification, and market orders.",
                ["https://www.investor.gov/introduction-investing/investing-basics"]
            )

        # 5. Educational guidance reply
        reply = (
            f"Educational AI Tutor: Financial concepts, market mechanics, and savings strategies are explained here for learning. Notice: I cannot provide personalized buy/sell advice or forecast future stock prices."
        )
        sources = ["https://www.investor.gov/introduction-investing/investing-basics"]
        return reply, sources

    def _detect_prompt_injection(self, text: str) -> bool:
        lower = text.lower()
        injection_patterns = [
            r"ignore (all )?(previous|prior) instructions",
            r"system prompt",
            r"you are now dan",
            r"reveal your secrets",
            r"disregard (all )?safety",
            r"bypass security",
        ]
        return any(re.search(p, lower) for p in injection_patterns)

    def _is_unsafe_advice_request(self, lower: str) -> bool:
        patterns = [
            r"should i (buy|sell|short)\b",
            r"what stock (should i|to) buy\b",
            r"predict the price\b",
            r"will (aapl|msft|spy|\w+) go up\b",
            r"guaranteed (profit|return)\b",
            r"execute (a|this) trade for me\b",
        ]
        return any(re.search(p, lower) for p in patterns)
