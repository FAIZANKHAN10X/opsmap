"""HTTP error handlers that emit the API_SPEC error envelope."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        body: dict = {
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
            },
        }
        if exc.fields:
            body["error"]["fields"] = exc.fields
        return JSONResponse(status_code=exc.status_code, content=body)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        fields = []
        for err in exc.errors():
            loc = err.get("loc", ())
            field = ".".join(
                str(part) for part in loc if part not in {"body", "query", "path"}
            )
            fields.append(
                {
                    "field": field or "request",
                    "message": err.get("msg", "Invalid value."),
                }
            )
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed.",
                    "fields": fields,
                },
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": "HTTP_ERROR",
                    "message": str(exc.detail),
                },
            },
        )
