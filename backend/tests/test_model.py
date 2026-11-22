import numpy as np
import pytest

from markov_calls.actions import ACTION_IDS, UnknownActionError, to_indices
from markov_calls.evaluation import average_ranks, roc_auc
from markov_calls.model import (CALLERS, MAX_SEQUENCE_LENGTH, NON_CALLERS, CallClassifier, MarkovChain,
                                evidence_strength)
from markov_calls.service import get_service
from markov_calls.simulation import TRUE_MATRIX_CALL, TRUE_MATRIX_NO_CALL, SimulationConfig, generate_users


def test_true_matrices_are_row_stochastic_and_strictly_positive():
    for matrix in (TRUE_MATRIX_CALL, TRUE_MATRIX_NO_CALL):
        assert np.allclose(matrix.sum(axis=1), 1)
        assert (matrix > 0).all()


def test_simulation_is_reproducible_and_respects_lengths():
    config = SimulationConfig(n_users=200, min_actions=3, max_actions=20, seed=9)
    first, second = generate_users(config), generate_users(config)
    assert first.sequences == second.sequences
    assert (first.called == second.called).all()
    assert first.lengths.min() >= 3 and first.lengths.max() <= 20


def test_fit_counts_transitions_inside_each_sequence_and_smooths():
    # Transitions are counted within each sequence, never across sequences.
    chain = MarkovChain.fit([[0, 1, 1], [2, 0]], alpha=1, beta=1)
    assert chain.first_counts[0] == 1 and chain.first_counts[2] == 1
    assert chain.transition_counts[0, 1] == 1 and chain.transition_counts[1, 1] == 1
    assert chain.transition_counts[2, 0] == 1 and chain.transition_counts[1, 2] == 0
    assert chain.transition_counts.sum() == 3
    assert np.allclose(chain.transitions.sum(axis=1), 1)
    assert (chain.transitions > 0).all()
    k = len(ACTION_IDS)
    assert chain.transitions[0, 1] == pytest.approx((1 + 1) / (1 + k))


def test_log_likelihood_matches_a_hand_computation():
    chain = MarkovChain.fit([[0, 1, 1], [2, 0]])
    expected = np.log(chain.initial[0]) + np.log(chain.transitions[0, 1]) + np.log(chain.transitions[1, 1])
    assert chain.log_likelihood([0, 1, 1]) == pytest.approx(expected)


def test_tie_goes_to_non_callers():
    assert CallClassifier.argmax(np.array([-5.0, -5.0])) == 0


def test_identical_chains_give_a_weak_non_caller_prediction():
    uniform = np.full(len(ACTION_IDS), 1 / len(ACTION_IDS))
    matrix = np.tile(uniform, (len(ACTION_IDS), 1))
    classifier = CallClassifier.from_true_process(uniform, matrix, matrix)
    result = classifier.predict(["login", "check_balance"])
    assert result["predicted"] == NON_CALLERS
    assert result["likelihood_ratio"] == pytest.approx(1)
    assert result["evidence"] == "weak"


@pytest.mark.parametrize("ratio, level", [(1, "weak"), (2.99, "weak"), (3, "moderate"), (19.9, "moderate"),
                                          (20, "strong"), (1e6, "strong")])
def test_evidence_strength_levels(ratio, level):
    assert evidence_strength(ratio) == level


def test_invalid_sequences_are_rejected():
    classifier = get_service().classifier
    with pytest.raises(ValueError, match="empty"):
        classifier.predict([])
    with pytest.raises(UnknownActionError, match="logout"):
        classifier.predict(["login", "logout"])
    with pytest.raises(ValueError, match="maximum"):
        classifier.predict(["login"] * (MAX_SEQUENCE_LENGTH + 1))
    with pytest.raises(UnknownActionError):
        to_indices(["nope"])


def test_failures_and_help_point_to_callers():
    result = get_service().predict(["login", "fx_transfer_attempt", "fx_transfer_failed", "open_help_page"])
    assert result["predicted"] == CALLERS
    assert result["evidence"] == "strong"
    steps = result["steps"]
    assert [s["to"] for s in steps] == ["login", "fx_transfer_attempt", "fx_transfer_failed", "open_help_page"]
    assert steps[0]["from"] is None and steps[1]["from"] == "login"
    assert steps[-1]["cumulative"][CALLERS] == pytest.approx(result["log_likelihood"][CALLERS])


def test_average_ranks_and_auc():
    assert average_ranks([10, 20, 20, 30]).tolist() == [1, 2.5, 2.5, 4]
    assert roc_auc([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9]) == 1.0
    assert roc_auc([0, 1, 0, 1], [1, 1, 1, 1]) == 0.5
    assert roc_auc([0, 0], [1, 2]) is None


def test_results_match_the_original_notebook():
    """The port must reproduce notebook 03 exactly (same seeds, same data, same model)."""
    performance = get_service().performance
    methods = {m["id"]: m for m in performance["methods"]}
    assert performance["test_set"] == {"users": 10_000, "callers": 531, "call_rate": 0.0531}
    assert (methods["markov"]["flagged"], methods["markov"]["callers_caught"]) == (2300, 297)
    assert (methods["rule"]["flagged"], methods["rule"]["callers_caught"]) == (2495, 224)
    assert performance["auc"]["model"] == pytest.approx(0.735, abs=5e-4)
    assert performance["auc"]["oracle"] == pytest.approx(0.75, abs=5e-4)
    top_100 = next(row for row in performance["budget"]["table"] if row["k"] == 100)
    assert top_100["callers_caught"] == 61
