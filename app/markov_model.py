"""One Markov model per group, learned from synthetic training users.

The training settings match the notebooks (20,000 users, seed 1), so the learned
matrices are the same as in generative_classifier/02_transition_matrices.ipynb.
"""

import numpy as np

from simulation import ACTION_INDEX, N_ACTIONS, generate_users

TRAIN_USERS = 20_000
TRAIN_CALL_RATE = 0.05
TRAIN_MIN_ACTIONS, TRAIN_MAX_ACTIONS = 3, 20
TRAIN_SEED = 1

ALPHA = 1.0  # smoothing for transitions
BETA = 1.0   # smoothing for the first action

NO_CALL, CALL = "Did not call", "Called"
GROUPS = (NO_CALL, CALL)


def estimate_markov_model(sequences, alpha=ALPHA, beta=BETA):
    first_counts = np.zeros(N_ACTIONS)
    transition_counts = np.zeros((N_ACTIONS, N_ACTIONS))
    for sequence in sequences:
        first_counts[sequence[0]] += 1
        for current, following in zip(sequence[:-1], sequence[1:]):
            transition_counts[current, following] += 1
    first_action = (first_counts + beta) / (first_counts.sum() + N_ACTIONS * beta)
    matrix = (transition_counts + alpha) / (
        transition_counts.sum(axis=1, keepdims=True) + N_ACTIONS * alpha
    )
    return first_action, matrix


def train_models():
    """Return {group: (first_action, transition_matrix)} and the number of training users per group."""
    users = generate_users(TRAIN_USERS, TRAIN_CALL_RATE, TRAIN_MIN_ACTIONS, TRAIN_MAX_ACTIONS, TRAIN_SEED)
    models, group_sizes = {}, {}
    for called, group in enumerate(GROUPS):
        sequences = [
            [ACTION_INDEX[a] for a in actions]
            for actions in users.loc[users["called"] == called, "actions"]
        ]
        models[group] = estimate_markov_model(sequences)
        group_sizes[group] = len(sequences)
    return models, group_sizes


def step_log_probabilities(actions, first_action, matrix):
    """Log-probability of each step: the first action, then every transition."""
    indices = [ACTION_INDEX[a] for a in actions]
    steps = [np.log(first_action[indices[0]])]
    for current, following in zip(indices[:-1], indices[1:]):
        steps.append(np.log(matrix[current, following]))
    return np.array(steps)
