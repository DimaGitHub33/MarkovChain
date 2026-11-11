import altair as alt
import numpy as np
import pandas as pd
import streamlit as st

from simulation import (
    ACTION_DESCRIPTIONS,
    ACTIONS,
    TRUE_FIRST_ACTION,
    TRUE_MATRIX_CALL,
    TRUE_MATRIX_NO_CALL,
)

MATRIX_HEIGHT = 640

st.title("🧭 How the Two Groups Behave")
st.markdown(
    """
Each group has its own **transition matrix**: the probability of each next action, given the
current action. These are the true matrices used to generate the synthetic users.
The classifier never sees them; it has to learn them from the data.
"""
)


def matrix_to_long(matrix, value_name):
    return (
        pd.DataFrame(matrix, index=ACTIONS, columns=ACTIONS)
        .rename_axis("current action")
        .reset_index()
        .melt(id_vars="current action", var_name="next action", value_name=value_name)
    )


def heatmap(matrix, value_name, scale, text_format, text_threshold, dark_threshold):
    data = matrix_to_long(matrix, value_name)
    base = alt.Chart(data).encode(
        x=alt.X("next action:N", sort=ACTIONS,
                axis=alt.Axis(labelAngle=-50, labelOverlap=False, labelLimit=220)),
        y=alt.Y("current action:N", sort=ACTIONS, axis=alt.Axis(labelLimit=220)),
    )
    cells = base.mark_rect().encode(
        color=alt.Color(f"{value_name}:Q", scale=scale, legend=alt.Legend(orient="right")),
        tooltip=["current action", "next action", alt.Tooltip(f"{value_name}:Q", format=".3f")],
    )
    # Write the value only in cells that matter, so the matrix stays readable.
    labels = base.mark_text(fontSize=11).encode(
        text=alt.Text(f"{value_name}:Q", format=text_format),
        color=alt.condition(f"abs(datum['{value_name}']) > {dark_threshold}",
                            alt.value("white"), alt.value("black")),
    ).transform_filter(f"abs(datum['{value_name}']) >= {text_threshold}")
    return (cells + labels).properties(height=MATRIX_HEIGHT)


st.header("Transition matrices")
st.caption(
    "Row = current action, column = next action. Each row sums to 1. "
    "Darker cells are more likely transitions; values below 0.10 are not written. "
    "Hover over a cell to see its exact value."
)

# Same color range for both groups, so equal colors mean equal probabilities.
max_probability = float(max(TRUE_MATRIX_NO_CALL.max(), TRUE_MATRIX_CALL.max()))
probability_scale = alt.Scale(scheme="blues", domain=[0, max_probability])
col_no_call, col_call = st.columns(2)
with col_no_call:
    st.subheader("✅ Did not call")
    st.altair_chart(heatmap(TRUE_MATRIX_NO_CALL, "probability", probability_scale, ".2f", 0.1,
                            0.6 * max_probability), width="stretch")
with col_call:
    st.subheader("📞 Called")
    st.altair_chart(heatmap(TRUE_MATRIX_CALL, "probability", probability_scale, ".2f", 0.1,
                            0.6 * max_probability), width="stretch")

st.subheader("What is different for callers")
st.markdown(
    """
Difference = probability for callers − probability for non-callers.
**Red** transitions are more typical for callers, **blue** for non-callers.
Callers fail more often (`fx_transfer_failed`, `password_change_failed`), retry right after a failure,
and open the help page.
"""
)
difference = TRUE_MATRIX_CALL - TRUE_MATRIX_NO_CALL
limit = float(np.abs(difference).max())
difference_scale = alt.Scale(scheme="redblue", domain=[-limit, limit], reverse=True)
st.altair_chart(heatmap(difference, "difference", difference_scale, "+.2f", 0.08, 0.6 * limit),
                width="stretch")


def long_run_share(matrix, start, n_steps=500):
    """Share of each action in a very long session: apply the matrix many times."""
    distribution = start.copy()
    for _ in range(n_steps):
        distribution = distribution @ matrix
    return distribution


share_no_call = long_run_share(TRUE_MATRIX_NO_CALL, TRUE_FIRST_ACTION)
share_call = long_run_share(TRUE_MATRIX_CALL, TRUE_FIRST_ACTION)
max_share = float(max(share_no_call.max(), share_call.max()))

st.header("The actions")
st.caption(
    "What each action means, and its share of all actions in a long session of each group "
    "(the stationary distribution of each matrix)."
)
ratio = share_call / share_no_call
actions_table = pd.DataFrame({
    "Action": ACTIONS,
    "Meaning": [ACTION_DESCRIPTIONS[a] for a in ACTIONS],
    "Share (did not call)": share_no_call,
    "Share (called)": share_call,
    "More typical for": np.where(ratio > 1.25, "Called", np.where(ratio < 0.8, "Did not call", "Both")),
})
st.dataframe(
    actions_table,
    hide_index=True,
    width="stretch",
    height=(len(actions_table) + 1) * 35 + 3,  # show every row without scrolling
    column_config={
        "Share (did not call)": st.column_config.ProgressColumn(format="percent", min_value=0,
                                                               max_value=max_share),
        "Share (called)": st.column_config.ProgressColumn(format="percent", min_value=0,
                                                         max_value=max_share),
    },
)
