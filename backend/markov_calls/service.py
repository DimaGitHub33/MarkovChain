"""Builds the trained model and its evaluation once, and keeps them for the lifetime of the process."""

from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from .actions import ACTION_IDS, ACTIONS, CATEGORIES
from .evaluation import evaluate
from .model import ALPHA, BETA, CALLERS, GROUP_LABELS, GROUPS, MAX_SEQUENCE_LENGTH, NON_CALLERS, CallClassifier
from .simulation import (TEST_CONFIG, TRAIN_CONFIG, TRUE_FIRST_ACTION, TRUE_MATRIX_CALL, TRUE_MATRIX_NO_CALL,
                         generate_users)

# A share ratio above this (or below its inverse) marks an action as typical for one group.
TYPICAL_RATIO = 1.25


@dataclass
class ModelService:
    classifier: CallClassifier
    oracle: CallClassifier
    performance: dict

    def catalog(self):
        return {
            "categories": [{"id": c.id, "label": c.label} for c in CATEGORIES],
            "actions": [{"id": a.id, "label": a.label, "description": a.description,
                         "category": a.category, "kind": a.kind} for a in ACTIONS],
        }

    def summary(self):
        sizes = self.classifier.group_sizes
        return {
            "groups": [{"id": g, "label": GROUP_LABELS[g], "training_users": sizes[g]} for g in GROUPS],
            "training": {"users": TRAIN_CONFIG.n_users, "call_rate": TRAIN_CONFIG.call_rate,
                         "min_actions": TRAIN_CONFIG.min_actions, "max_actions": TRAIN_CONFIG.max_actions,
                         "seed": TRAIN_CONFIG.seed},
            "smoothing": {"alpha": ALPHA, "beta": BETA},
            "max_sequence_length": MAX_SEQUENCE_LENGTH,
        }

    def patterns(self):
        def source(classifier, with_counts):
            groups = {}
            for group in GROUPS:
                chain = classifier.chains[group]
                groups[group] = {
                    "initial": _round(chain.initial),
                    "transitions": _round(chain.transitions),
                    "stationary": _round(chain.stationary_distribution()),
                }
                if with_counts:
                    groups[group]["transition_counts"] = chain.transition_counts.astype(int).tolist()
            return groups

        true_shares = {g: self.oracle.chains[g].stationary_distribution() for g in GROUPS}
        ratio = true_shares[CALLERS] / true_shares[NON_CALLERS]
        typical = np.where(ratio > TYPICAL_RATIO, CALLERS,
                           np.where(ratio < 1 / TYPICAL_RATIO, NON_CALLERS, "both"))
        return {
            "actions": list(ACTION_IDS),
            "true": source(self.oracle, with_counts=False),
            "learned": source(self.classifier, with_counts=True),
            "typical_for": dict(zip(ACTION_IDS, typical.tolist())),
        }

    def predict(self, actions):
        return self.classifier.predict(actions)


def _round(array, digits=6):
    return np.round(np.asarray(array, dtype=float), digits).tolist()


@lru_cache(maxsize=1)
def get_service():
    train = generate_users(TRAIN_CONFIG)
    test = generate_users(TEST_CONFIG)
    classifier = CallClassifier.fit(train.sequences, train.called)
    oracle = CallClassifier.from_true_process(TRUE_FIRST_ACTION, TRUE_MATRIX_NO_CALL, TRUE_MATRIX_CALL)
    return ModelService(classifier, oracle, evaluate(classifier, oracle, test))
