"""The catalog of user actions: the single source of truth for ids, labels and categories."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Category:
    id: str
    label: str


@dataclass(frozen=True)
class Action:
    id: str
    label: str
    description: str
    category: str
    kind: str  # "regular", "failure" or "help"


CATEGORIES = (
    Category("account", "Account"),
    Category("payments", "Payments and transfers"),
    Category("issues", "Password, failures and help"),
)

# The order defines the row and column order of every transition matrix.
ACTIONS = (
    Action("login", "Log in", "The user logs in", "account", "regular"),
    Action("check_balance", "Check balance", "Checks the account balance", "account", "regular"),
    Action("check_exchange_rates", "Check exchange rates", "Checks currency exchange rates",
           "account", "regular"),
    Action("card_payment", "Card payment", "Pays with a card", "payments", "regular"),
    Action("transfer_to_own_account", "Transfer to own account",
           "Moves money between their own accounts", "payments", "regular"),
    Action("transfer_to_other_user", "Transfer to another user", "Sends money to another user",
           "payments", "regular"),
    Action("fx_transfer_attempt", "FX transfer attempt",
           "Tries to make a foreign currency (FX) transfer", "payments", "regular"),
    Action("fx_transfer_failed", "FX transfer failed", "The FX transfer failed", "issues", "failure"),
    Action("password_change_attempt", "Password change attempt", "Tries to change the password",
           "issues", "regular"),
    Action("password_change_failed", "Password change failed", "The password change failed",
           "issues", "failure"),
    Action("open_help_page", "Open help page", "Opens the help page", "issues", "help"),
)

ACTION_IDS = tuple(action.id for action in ACTIONS)
N_ACTIONS = len(ACTIONS)
ACTION_INDEX = {action_id: index for index, action_id in enumerate(ACTION_IDS)}


class UnknownActionError(ValueError):
    def __init__(self, action):
        self.action = action
        super().__init__(f"Unknown action '{action}'. Expected one of: {', '.join(ACTION_IDS)}.")


def to_indices(actions):
    """Convert action ids to matrix indices, rejecting unknown actions."""
    indices = []
    for action in actions:
        if action not in ACTION_INDEX:
            raise UnknownActionError(action)
        indices.append(ACTION_INDEX[action])
    return indices
