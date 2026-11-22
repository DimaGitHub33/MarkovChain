"""Evaluation on held-out test users: the method against simple baselines and the oracle."""

import numpy as np

from .actions import ACTION_INDEX
from .model import CALLERS, NON_CALLERS, CallClassifier

FAILURE_OR_HELP = {ACTION_INDEX[a] for a in ("fx_transfer_failed", "password_change_failed", "open_help_page")}
LENGTH_BUCKETS = ((3, 6), (7, 10), (11, 15), (16, 20))
BUDGETS = (25, 50, 100, 200, 300, 500, 1000)
MAX_CURVE_K = 2000
HISTOGRAM_BINS = 40
ROC_POINTS = 120


def average_ranks(values):
    """1-based ranks; tied values share their average rank (like pandas' rank())."""
    values = np.asarray(values, dtype=float)
    order = np.argsort(values, kind="mergesort")
    sorted_values = values[order]
    ranks = np.empty(len(values))
    start = 0
    while start < len(values):
        end = start
        while end + 1 < len(values) and sorted_values[end + 1] == sorted_values[start]:
            end += 1
        ranks[order[start:end + 1]] = (start + end) / 2 + 1
        start = end + 1
    return ranks


def roc_auc(is_positive, scores):
    """Probability that a random caller gets a higher score than a random non-caller."""
    is_positive = np.asarray(is_positive, dtype=bool)
    n_pos, n_neg = int(is_positive.sum()), int((~is_positive).sum())
    if n_pos == 0 or n_neg == 0:
        return None
    ranks = average_ranks(scores)
    return float((ranks[is_positive].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def roc_curve(is_positive, scores, n_points=ROC_POINTS):
    order = np.argsort(-np.asarray(scores), kind="mergesort")
    hits = np.asarray(is_positive, dtype=bool)[order]
    tpr = np.concatenate(([0.0], np.cumsum(hits) / hits.sum()))
    fpr = np.concatenate(([0.0], np.cumsum(~hits) / (~hits).sum()))
    keep = np.unique(np.linspace(0, len(tpr) - 1, n_points).astype(int))
    return [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in keep]


def decision_metrics(flagged, called):
    flagged, called = np.asarray(flagged, dtype=bool), np.asarray(called, dtype=bool)
    caught = int((flagged & called).sum())
    n_flagged = int(flagged.sum())
    return {
        "flagged": n_flagged,
        "callers_caught": caught,
        "precision": caught / n_flagged if n_flagged else None,
        "recall": caught / int(called.sum()),
        "accuracy": float((flagged == called).mean()),
    }


def confusion(flagged, called):
    flagged, called = np.asarray(flagged, dtype=bool), np.asarray(called, dtype=bool)
    return {
        "true_positive": int((flagged & called).sum()),
        "false_positive": int((flagged & ~called).sum()),
        "false_negative": int((~flagged & called).sum()),
        "true_negative": int((~flagged & ~called).sum()),
    }


def captured_curve(called, scores, max_k=MAX_CURVE_K):
    """Callers caught when calling the top K users, for K = 1 … max_k."""
    order = np.argsort(-np.asarray(scores), kind="mergesort")[:max_k]
    return np.cumsum(np.asarray(called)[order]).astype(int).tolist()


def histogram(scores, called, bins=HISTOGRAM_BINS):
    scores, called = np.asarray(scores), np.asarray(called, dtype=bool)
    low, high = np.percentile(scores, [0.5, 99.5])
    edges = np.linspace(low, high, bins + 1)
    clipped = np.clip(scores, low, high)

    def density(mask):
        counts, _ = np.histogram(clipped[mask], bins=edges)
        return (counts / counts.sum()).round(5).tolist()

    return {"edges": edges.round(4).tolist(), NON_CALLERS: density(~called), CALLERS: density(called)}


def evaluate(classifier: CallClassifier, oracle: CallClassifier, test):
    called = test.called.astype(bool)
    log_lik = classifier.log_likelihood_matrix(test.sequences)
    oracle_log_lik = oracle.log_likelihood_matrix(test.sequences)
    # Ranking by the likelihood ratio orders users exactly like P(call | actions) would.
    score = log_lik[:, 1] - log_lik[:, 0]
    oracle_score = oracle_log_lik[:, 1] - oracle_log_lik[:, 0]
    predicted = CallClassifier.argmax(log_lik) == 1
    rule = np.array([any(a in FAILURE_OR_HELP for a in sequence) for sequence in test.sequences])
    lengths = test.lengths

    by_length = []
    for low, high in LENGTH_BUCKETS:
        mask = (lengths >= low) & (lengths <= high)
        by_length.append({
            "label": f"{low}–{high}",
            "users": int(mask.sum()),
            "callers": int(called[mask].sum()),
            "auc_model": roc_auc(called[mask], score[mask]),
            "auc_oracle": roc_auc(called[mask], oracle_score[mask]),
        })

    model_curve = captured_curve(called, score)
    oracle_curve = captured_curve(called, oracle_score)
    return {
        "test_set": {"users": int(len(called)), "callers": int(called.sum()),
                     "call_rate": float(called.mean())},
        "methods": [
            {"id": "never_call", "label": "Never call anyone", **decision_metrics(np.zeros(len(called)), called)},
            {"id": "rule", "label": "Simple rule: any failure or help page", **decision_metrics(rule, called)},
            {"id": "markov", "label": "Markov model (highest likelihood)", **decision_metrics(predicted, called)},
        ],
        "confusion": confusion(predicted, called),
        "auc": {"model": roc_auc(called, score), "oracle": roc_auc(called, oracle_score),
                "rule": roc_auc(called, rule.astype(float)), "random": 0.5},
        "roc": {"model": roc_curve(called, score), "oracle": roc_curve(called, oracle_score)},
        "budget": {
            "max_k": MAX_CURVE_K,
            "captured_model": model_curve,
            "captured_oracle": oracle_curve,
            "table": [{"k": k, "precision_model": model_curve[k - 1] / k,
                       "precision_oracle": oracle_curve[k - 1] / k,
                       "callers_caught": model_curve[k - 1]} for k in BUDGETS],
        },
        "score_histogram": histogram(score, called),
        "by_length": by_length,
    }
