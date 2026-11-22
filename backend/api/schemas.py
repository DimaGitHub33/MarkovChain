from typing import Annotated

from pydantic import BaseModel, Field

from markov_calls.model import MAX_SEQUENCE_LENGTH


class PredictRequest(BaseModel):
    actions: Annotated[list[str], Field(min_length=1, max_length=MAX_SEQUENCE_LENGTH,
                                         description="Action ids in time order, e.g. ['login', 'check_balance']")]
