from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Complaint(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    source: str = Field(default="", max_length=100)
    customer: str = Field(default="", max_length=200)
    product: str = Field(default="", max_length=200)
    strength: str = Field(default="", max_length=100)
    batch: str = Field(default="", max_length=100)
    quantity: str = Field(default="", max_length=100)
    manufacturing_date: str = Field(default="", max_length=100)
    expiry_date: str = Field(default="", max_length=100)
    site: str = Field(default="", max_length=200)
    materials: str = Field(default="", max_length=200)
    category: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=6000)


class Intake(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    current: Complaint = Field(default_factory=Complaint)
    operation: Literal["new", "correct", "question"] = "new"


class Commit(BaseModel):
    complaint: Complaint
    reviewed: bool = False
    reviewer: str = Field(min_length=2, max_length=100)
    request_id: str = Field(min_length=10, max_length=100)


class StatusUpdate(BaseModel):
    status: Literal["Under investigation", "Closed"]
    note: str = Field(min_length=10, max_length=2000)
    reviewer: str = Field(min_length=2, max_length=100)
