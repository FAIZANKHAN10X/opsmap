"""Application exceptions. Services raise these; the API layer maps them to HTTP."""


class AppError(Exception):
    """Base application error with a stable machine-readable code."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        fields: list[dict[str, str]] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.fields = fields
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(code, message, status_code=404)


class ConflictError(AppError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(code, message, status_code=409)


class ValidationAppError(AppError):
    def __init__(
        self,
        message: str = "Validation failed.",
        *,
        fields: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(
            "VALIDATION_ERROR",
            message,
            status_code=422,
            fields=fields,
        )
