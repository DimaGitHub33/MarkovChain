"""Synthetic user-session generator.

This is the same process as in generative_classifier/01_generate_data.ipynb.
With the same seed, the app produces the same users as the notebook.
"""

import numpy as np
import pandas as pd

ACTIONS = [
    "login",
    "check_balance",
    "check_exchange_rates",
    "card_payment",
    "transfer_to_own_account",
    "transfer_to_other_user",
    "fx_transfer_attempt",
    "fx_transfer_failed",
    "password_change_attempt",
    "password_change_failed",
    "open_help_page",
]
N_ACTIONS = len(ACTIONS)
ACTION_INDEX = {action: i for i, action in enumerate(ACTIONS)}

ACTION_DESCRIPTIONS = {
    "login": "The user logs in",
    "check_balance": "Checks the account balance",
    "check_exchange_rates": "Checks currency exchange rates",
    "card_payment": "Pays with a card",
    "transfer_to_own_account": "Moves money between their own accounts",
    "transfer_to_other_user": "Sends money to another user",
    "fx_transfer_attempt": "Tries to make a foreign currency (FX) transfer",
    "fx_transfer_failed": "The FX transfer failed",
    "password_change_attempt": "Tries to change the password",
    "password_change_failed": "The password change failed",
    "open_help_page": "Opens the help page",
}

FAILURE_ACTIONS = {"fx_transfer_failed", "password_change_failed"}
HELP_ACTIONS = {"open_help_page"}

NO_CALL_WEIGHTS = {
    "login": {"check_balance": 5, "check_exchange_rates": 2, "card_payment": 2,
              "transfer_to_own_account": 1, "transfer_to_other_user": 2,
              "fx_transfer_attempt": 1, "password_change_attempt": 0.3},
    "check_balance": {"login": 0.5, "check_balance": 0.5, "check_exchange_rates": 1.5,
                      "card_payment": 2, "transfer_to_own_account": 2,
                      "transfer_to_other_user": 2, "fx_transfer_attempt": 1},
    "check_exchange_rates": {"login": 0.5, "check_balance": 1.5, "check_exchange_rates": 1,
                             "fx_transfer_attempt": 3},
    "card_payment": {"login": 1, "check_balance": 3, "card_payment": 2,
                     "transfer_to_other_user": 0.5},
    "transfer_to_own_account": {"login": 1, "check_balance": 3, "card_payment": 1,
                                "fx_transfer_attempt": 0.5},
    "transfer_to_other_user": {"login": 1, "check_balance": 3, "card_payment": 1,
                               "transfer_to_other_user": 1},
    "fx_transfer_attempt": {"login": 1, "check_balance": 3, "check_exchange_rates": 1,
                            "fx_transfer_failed": 0.4},
    "fx_transfer_failed": {"login": 1, "check_balance": 2, "check_exchange_rates": 1,
                           "fx_transfer_attempt": 2, "open_help_page": 0.3},
    "password_change_attempt": {"login": 3, "check_balance": 1, "password_change_failed": 0.4},
    "password_change_failed": {"login": 1, "password_change_attempt": 2, "open_help_page": 0.3},
    "open_help_page": {"login": 2, "check_balance": 2, "fx_transfer_attempt": 0.5,
                       "password_change_attempt": 0.5},
}

CALLER_CHANGES = {
    ("login", "fx_transfer_attempt"): 2,
    ("login", "password_change_attempt"): 1,
    ("check_balance", "check_balance"): 1.5,
    ("check_balance", "fx_transfer_attempt"): 2,
    ("fx_transfer_attempt", "fx_transfer_failed"): 2.5,
    ("fx_transfer_failed", "fx_transfer_attempt"): 3,
    ("fx_transfer_failed", "open_help_page"): 1,
    ("password_change_attempt", "password_change_failed"): 2.5,
    ("password_change_failed", "password_change_attempt"): 3,
    ("password_change_failed", "open_help_page"): 1,
    ("open_help_page", "open_help_page"): 1,
}

CALL_WEIGHTS = {action: dict(row) for action, row in NO_CALL_WEIGHTS.items()}
for (_from, _to), _weight in CALLER_CHANGES.items():
    CALL_WEIGHTS[_from][_to] = _weight

FIRST_ACTION_WEIGHTS = {"login": 6, "check_balance": 2, "card_payment": 1,
                        "check_exchange_rates": 1}

BACKGROUND_WEIGHT = 0.05


def weights_to_transition_matrix(weights):
    matrix = np.full((N_ACTIONS, N_ACTIONS), BACKGROUND_WEIGHT)
    for from_action, row in weights.items():
        for to_action, weight in row.items():
            matrix[ACTION_INDEX[from_action], ACTION_INDEX[to_action]] += weight
    return matrix / matrix.sum(axis=1, keepdims=True)


def weights_to_distribution(weights):
    distribution = np.full(N_ACTIONS, BACKGROUND_WEIGHT)
    for action, weight in weights.items():
        distribution[ACTION_INDEX[action]] += weight
    return distribution / distribution.sum()


TRUE_FIRST_ACTION = weights_to_distribution(FIRST_ACTION_WEIGHTS)
TRUE_MATRIX_NO_CALL = weights_to_transition_matrix(NO_CALL_WEIGHTS)
TRUE_MATRIX_CALL = weights_to_transition_matrix(CALL_WEIGHTS)


def generate_actions(n_actions, transition_matrix, rng):
    actions = [int(rng.choice(N_ACTIONS, p=TRUE_FIRST_ACTION))]
    for _ in range(n_actions - 1):
        current = actions[-1]
        actions.append(int(rng.choice(N_ACTIONS, p=transition_matrix[current])))
    return actions


def generate_users(n_users, call_rate, min_actions, max_actions, seed, id_prefix="user"):
    """Return one row per user: user_id, actions (list of names), n_actions, called (0/1)."""
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n_users):
        called = rng.random() < call_rate
        matrix = TRUE_MATRIX_CALL if called else TRUE_MATRIX_NO_CALL
        n_actions = int(rng.integers(min_actions, max_actions + 1))
        actions = generate_actions(n_actions, matrix, rng)
        rows.append({
            "user_id": f"{id_prefix}_{i}",
            "actions": [ACTIONS[a] for a in actions],
            "n_actions": n_actions,
            "called": int(called),
        })
    return pd.DataFrame(rows)
