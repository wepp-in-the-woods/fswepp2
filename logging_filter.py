import logging


class HealthCheckFilter(logging.Filter):
    """Filter out health check requests from Uvicorn access logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Filter out health check requests
        message = record.getMessage()
        return "/health" not in message
