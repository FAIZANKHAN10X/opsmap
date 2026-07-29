"""Shared schema primitives: pagination and response envelopes."""

from math import ceil
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    """Base schema that can be built from ORM instances."""

    model_config = ConfigDict(from_attributes=True)


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=25, ge=1, le=100)


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    pages: int

    @classmethod
    def from_totals(cls, *, page: int, limit: int, total: int) -> "PaginationMeta":
        pages = ceil(total / limit) if limit > 0 and total > 0 else 0
        return cls(page=page, limit=limit, total=total, pages=pages)


class DataResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    message: str | None = None


class ListResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    pagination: PaginationMeta
    message: str | None = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    fields: list[dict[str, str]] | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class MessageResponse(BaseModel):
    success: bool = True
    data: None = None
    message: str | None = None
