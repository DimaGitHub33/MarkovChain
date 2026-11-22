"""The synthetic data-generating process.

The weights and the order of random draws are identical to the original project
(notebook 01 and app/simulation.py), so the same seed produces the same users.
"""

from dataclasses import dataclass

import numpy as np

from .actions import ACTION_INDEX, N_ACTIONS

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

# Callers behave like everyone else, except for these transitions.
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

FIRST_ACTION_WEIGHTS = {"login": 6, "check_balance": 2, "card_payment": 1, "check_exchange_rates": 1}

# Every transition gets a small weight, so no true probability is exactly zero.
BACKGROUND_WEIGHT = 0.05


def _caller_weights():
    weights = {action: dict(row) for action, row in NO_CALL_WEIGHTS.items()}
    for (from_action, to_action), weight in CALLER_CHANGES.items():
        weights[from_action][to_action] = weight
    return weights


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
TRUE_MATRIX_CALL = weights_to_transition_matrix(_caller_weights())


@dataclass(frozen=True)
class SimulationConfig:
    n_users: int
    call_rate: float = 0.05
    min_actions: int = 3
    max_actions: int = 20
    seed: int = 1


TRAIN_CONFIG = SimulationConfig(n_users=20_000, seed=1)
TEST_CONFIG = SimulationConfig(n_users=10_000, seed=2)


@dataclass(frozen=True)
class Dataset:
    sequences: list  # one list of action indices per user
    called: np.ndarray  # 1 if the user called, else 0

    @property
    def lengths(self):
        return np.array([len(sequence) for sequence in self.sequences])


def generate_actions(n_actions, transition_matrix, rng):
    actions = [int(rng.choice(N_ACTIONS, p=TRUE_FIRST_ACTION))]
    for _ in range(n_actions - 1):
        actions.append(int(rng.choice(N_ACTIONS, p=transition_matrix[actions[-1]])))
    return actions


def generate_users(config):
    """Each user first gets a label, then a sequence drawn from the matrix of that label."""
    rng = np.random.default_rng(config.seed)
    sequences, called = [], []
    for _ in range(config.n_users):
        is_caller = rng.random() < config.call_rate
        matrix = TRUE_MATRIX_CALL if is_caller else TRUE_MATRIX_NO_CALL
        n_actions = int(rng.integers(config.min_actions, config.max_actions + 1))
        sequences.append(generate_actions(n_actions, matrix, rng))
        called.append(int(is_caller))
    return Dataset(sequences=sequences, called=np.array(called))
