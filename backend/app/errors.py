"""Public error envelopes deliberately exclude request values and exceptions."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from starlette.exceptions import HTTPException


class ErrorDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str
    message: str
    field: str | None = None


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    error: ErrorDetail


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str,
                 field: str | None = None, headers: dict[str, str] | None = None):
        self.status = status
        self.body = ErrorResponse(error=ErrorDetail(code=code, message=message, field=field))
        self.headers = headers


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error(_request: Request, exc: APIError):
        return JSONResponse(status_code=exc.status,
                            content=exc.body.model_dump(exclude_none=True),
                            headers={"Cache-Control": "no-store", **(exc.headers or {})})

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError):
        # Never serialize Pydantic's input/context: they can contain a password.
        field = None
        for error in exc.errors():
            location = error.get("loc", ())
            if len(location) > 1 and location[0] == "body" and location[1] in {"email", "password"}:
                field = location[1]
                break
        body = ErrorResponse(error=ErrorDetail(code="validation_error",
                             message="Request does not match the documented schema.", field=field))
        return JSONResponse(status_code=422, content=body.model_dump(exclude_none=True),
                            headers={"Cache-Control": "no-store"})

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException):
        messages = {404: ("not_found", "Resource not found."),
                    405: ("method_not_allowed", "Method not allowed.")}
        code, message = messages.get(exc.status_code, ("http_error", "Request failed."))
        return JSONResponse(status_code=exc.status_code,
                            content={"error": {"code": code, "message": message}},
                            headers={"Cache-Control": "no-store", **(exc.headers or {})})

    @app.exception_handler(Exception)
    async def unexpected_error(_request: Request, _exc: Exception):
        return JSONResponse(status_code=500, content={"error": {
            "code": "internal_error", "message": "An unexpected error occurred."}},
            headers={"Cache-Control": "no-store"})
