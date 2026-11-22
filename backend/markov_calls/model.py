"""Class-conditional Markov chains: one chain per group, prediction by the highest likelihood."""

from dataclasses import dataclass

import numpy as np

from .actions import ACTION_IDS, N_ACTIONS, to_indices

ALPHA = 1.0  # Laplace smoothing for transitions
BETA = 1.0   # Laplace smoothing for the first action
MAX_SEQUENCE_LENGTH = 30
RARE_TRANSITION_COUNT = 5  # fewer training examples than this → the estimate leans on smoothing

NON_CALLERS, CALLERS = "non_callers", "callers"
GROUPS = (NON_CALLERS, CALLERS)  # index 0 and 1, the same as the `called` label
GROUP_LABELS = {NON_CALLERS: "Non-callers", CALLERS: "Callers"}

# Likelihood ratio (in favour of the predicted group) → how strong the evidence is.
EVIDENCE_LEVELS = ((3.0, "weak"), (20.0, "moderate"), (float("inf"), "strong"))


def validate_sequence(sequence):
    if len(sequence) == 0:
        raise ValueError("The sequence is empty. Add at least one action.")
    if len(sequence) > MAX_SEQUENCE_LENGTH:
        raise ValueError(f"The sequence has {len(sequence)} actions; the maximum is {MAX_SEQUENCE_LENGTH}.")


@dataclass
class MarkovChain:
    first_counts: np.ndarray
    transition_counts: np.ndarray
    initial: np.ndarray
    transitions: np.ndarray

    @classmethod
    def fit(cls, sequences, alpha=ALPHA, beta=BETA):
        first_counts = np.zeros(N_ACTIONS)
        transition_counts = np.zeros((N_ACTIONS, N_ACTIONS))
        for sequence in sequences:
            first_counts[sequence[0]] += 1
            np.add.at(transition_counts, (sequence[:-1], sequence[1:]), 1)
        initial = (first_counts + beta) / (first_counts.sum() + N_ACTIONS * beta)
        transitions = (transition_counts + alpha) / (
            transition_counts.sum(axis=1, keepdims=True) + N_ACTIONS * alpha
        )
        return cls(first_counts, transition_counts, initial, transitions)

    @classmethod
    def from_probabilities(cls, initial, transitions):
        return cls(np.zeros(N_ACTIONS), np.zeros((N_ACTIONS, N_ACTIONS)), initial, transitions)

    def step_log_probabilities(self, indices):
        """log π(x1), then log A(x_t, x_t+1) for every transition."""
        indices = np.asarray(indices)
        return np.concatenate(([np.log(self.initial[indices[0]])],
                               np.log(self.transitions[indices[:-1], indices[1:]])))

    def log_likelihood(self, indices):
        return float(self.step_log_probabilities(indices).sum())

    def stationary_distribution(self):
        """Share of each action in a very long session."""
        values, vectors = np.linalg.eig(self.transitions.T)
        vector = np.real(vectors[:, np.argmin(np.abs(values - 1))])
        return vector / vector.sum()


def evidence_strength(ratio):
    for limit, level in EVIDENCE_LEVELS:
        if ratio < limit:
            return level
    return EVIDENCE_LEVELS[-1][1]


@dataclass
class CallClassifier:
    chains: dict

    @classmethod
    def fit(cls, sequences, called, alpha=ALPHA, beta=BETA):
        called = np.asarray(called)
        chains = {
            group: MarkovChain.fit([s for s, c in zip(sequences, called) if c == index], alpha, beta)
            for index, group in enumerate(GROUPS)
        }
        return cls(chains)

    @classmethod
    def from_true_process(cls, initial, matrix_no_call, matrix_call):
        return cls({NON_CALLERS: MarkovChain.from_probabilities(initial, matrix_no_call),
                    CALLERS: MarkovChain.from_probabilities(initial, matrix_call)})

    @property
    def group_sizes(self):
        return {group: int(chain.first_counts.sum()) for group, chain in self.chains.items()}

    def log_likelihoods(self, indices):
        """Array of shape (2,): log L under the non-callers' and the callers' chain."""
        return np.array([self.chains[group].log_likelihood(indices) for group in GROUPS])

    def log_likelihood_matrix(self, sequences):
        return np.array([self.log_likelihoods(sequence) for sequence in sequences])

    @staticmethod
    def argmax(log_likelihoods):
        # np.argmax returns the first maximum, so a tie goes to the non-callers.
        return np.argmax(log_likelihoods, axis=-1)

    def predict(self, actions):
        """Predict and explain one sequence of action ids."""
        validate_sequence(actions)
        indices = to_indices(actions)
        steps = {group: self.chains[group].step_log_probabilities(indices) for group in GROUPS}
        log_lik = np.array([steps[group].sum() for group in GROUPS])
        predicted = GROUPS[int(self.argmax(log_lik))]
        margin = float(abs(log_lik[1] - log_lik[0]))
        ratio = float(np.exp(min(margin, 700.0)))
        return {
            "actions": list(actions),
            "predicted": predicted,
            "log_likelihood": {group: float(value) for group, value in zip(GROUPS, log_lik)},
            "likelihood_ratio": ratio,
            "evidence": evidence_strength(ratio),
            "steps": self._explain(indices, steps),
        }

    def _explain(self, indices, steps):
        cumulative = {group: np.cumsum(steps[group]) for group in GROUPS}
        rows = []
        for position, index in enumerate(indices):
            previous = indices[position - 1] if position else None
            counts = {
                group: int(chain.first_counts[index] if previous is None
                           else chain.transition_counts[previous, index])
                for group, chain in self.chains.items()
            }
            rows.append({
                "position": position + 1,
                "from": None if previous is None else ACTION_IDS[previous],
                "to": ACTION_IDS[index],
                "log_probability": {group: float(steps[group][position]) for group in GROUPS},
                "cumulative": {group: float(cumulative[group][position]) for group in GROUPS},
                "favours": CALLERS if steps[CALLERS][position] > steps[NON_CALLERS][position] else NON_CALLERS,
                "leader": CALLERS if cumulative[CALLERS][position] > cumulative[NON_CALLERS][position]
                else NON_CALLERS,
                "training_count": counts,
                "rare": previous is not None and min(counts.values()) < RARE_TRANSITION_COUNT,
            })
        return rows
