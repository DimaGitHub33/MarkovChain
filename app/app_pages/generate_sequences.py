import html

import altair as alt
import numpy as np
import pandas as pd
import streamlit as st

from markov_model import CALL, GROUPS, NO_CALL, TRAIN_USERS, step_log_probabilities, train_models
from simulation import ACTION_DESCRIPTIONS, ACTIONS

MAX_STEPS = 30

ACTION_LABELS = {
    "login": "Log in",
    "check_balance": "Check balance",
    "check_exchange_rates": "Check exchange rates",
    "card_payment": "Card payment",
    "transfer_to_own_account": "Transfer to own account",
    "transfer_to_other_user": "Transfer to another user",
    "fx_transfer_attempt": "FX transfer attempt",
    "fx_transfer_failed": "FX transfer failed",
    "password_change_attempt": "Password change attempt",
    "password_change_failed": "Password change failed",
    "open_help_page": "Open help page",
}

ACTION_ICONS = {
    "login": ":material/login:",
    "check_balance": ":material/account_balance_wallet:",
    "check_exchange_rates": ":material/currency_exchange:",
    "card_payment": ":material/credit_card:",
    "transfer_to_own_account": ":material/sync_alt:",
    "transfer_to_other_user": ":material/send:",
    "fx_transfer_attempt": ":material/public:",
    "fx_transfer_failed": ":material/error:",
    "password_change_attempt": ":material/key:",
    "password_change_failed": ":material/lock:",
    "open_help_page": ":material/help:",
}

ACTION_GROUPS = {
    "Account": ["login", "check_balance", "check_exchange_rates"],
    "Payments and transfers": ["card_payment", "transfer_to_own_account",
                               "transfer_to_other_user", "fx_transfer_attempt"],
    "Password, failures and help": ["password_change_attempt", "password_change_failed",
                                    "fx_transfer_failed", "open_help_page"],
}

GROUP_COLORS = alt.Scale(domain=[NO_CALL, CALL], range=["#21c354", "#ff4b4b"])

STYLES = """
<style>
.seq-box {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
    min-height: 72px; padding: 16px;
    border: 1px solid rgba(128, 128, 128, 0.35); border-radius: 12px;
    background: rgba(128, 128, 128, 0.06);
}
.seq-empty { opacity: 0.6; font-size: 0.95rem; }
.chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 999px; font-size: 0.88rem; line-height: 1.3;
    border: 1px solid rgba(28, 131, 225, 0.45); background: rgba(28, 131, 225, 0.12);
}
.chip.fail { border-color: rgba(255, 75, 75, 0.6); background: rgba(255, 75, 75, 0.14); }
.chip.help { border-color: rgba(255, 164, 33, 0.6); background: rgba(255, 164, 33, 0.14); }
.chip .num { font-size: 0.72rem; font-weight: 700; opacity: 0.65; }
.arrow { opacity: 0.45; }
.legend { font-size: 0.8rem; opacity: 0.75; margin: 8px 0 10px 0; display: flex; flex-wrap: wrap; gap: 4px 16px; }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; }
.result {
    padding: 22px 24px; border-radius: 14px; border: 2px solid; margin: 4px 0 12px 0;
}
.result.call { border-color: #ff4b4b; background: rgba(255, 75, 75, 0.12); }
.result.nocall { border-color: #21c354; background: rgba(33, 195, 84, 0.12); }
.result .kicker { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.75; }
.result .value { font-size: clamp(1.3rem, 2.2vw, 1.9rem); font-weight: 700; margin: 4px 0 6px 0; }
.result .why { font-size: 0.92rem; opacity: 0.9; }
.st-key-predict button { min-height: 3.1rem; font-size: 1.05rem; font-weight: 600; }
.placeholder {
    padding: 28px 20px; border: 2px dashed rgba(128, 128, 128, 0.4); border-radius: 14px;
    text-align: center; opacity: 0.7; margin: 4px 0 12px 0;
}
.lik-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
.lik {
    flex: 1 1 130px; padding: 10px 14px; border-radius: 10px;
    border: 1px solid rgba(128, 128, 128, 0.35);
}
.lik.win { border: 2px solid currentColor; }
.lik .name { font-size: 0.78rem; opacity: 0.75; }
.lik .val { font-size: 1.25rem; font-weight: 700; }
.lik .badge { font-size: 0.72rem; font-weight: 700; }
</style>
"""


@st.cache_resource(show_spinner="Training the model on synthetic users...")
def get_models():
    return train_models()


def init_state():
    st.session_state.setdefault("sequence", [])  # items: {"id": int, "action": str}
    st.session_state.setdefault("next_id", 0)
    st.session_state.setdefault("prediction", None)


def current_actions():
    return tuple(item["action"] for item in st.session_state.sequence)


def new_item(action):
    st.session_state.next_id += 1
    return {"id": st.session_state.next_id, "action": action}


# ---------- callbacks ----------

def add_action(action):
    if len(st.session_state.sequence) < MAX_STEPS:
        st.session_state.sequence.append(new_item(action))


def undo_last():
    if st.session_state.sequence:
        st.session_state.sequence.pop()


def reset_sequence():
    st.session_state.sequence = []
    st.session_state.prediction = None


def change_action(item_id):
    for item in st.session_state.sequence:
        if item["id"] == item_id:
            item["action"] = st.session_state[f"step_{item_id}"]


def move_item(position, offset):
    sequence = st.session_state.sequence
    target = position + offset
    sequence[position], sequence[target] = sequence[target], sequence[position]


def remove_item(position):
    st.session_state.sequence.pop(position)


def run_prediction():
    actions = current_actions()
    models, _ = get_models()
    steps = {group: step_log_probabilities(actions, *models[group]) for group in GROUPS}
    log_likelihood = {group: float(steps[group].sum()) for group in GROUPS}
    st.session_state.prediction = {
        "actions": actions,
        "log_likelihood": log_likelihood,
        "predicted": max(GROUPS, key=log_likelihood.get),  # argmax over the two groups
        "steps": steps,
    }


# ---------- rendering helpers ----------

def chip_class(action):
    if action.endswith("_failed"):
        return "fail"
    if action == "open_help_page":
        return "help"
    return ""


def sequence_html(actions):
    if not actions:
        return ('<div class="seq-box"><span class="seq-empty">Your sequence is empty. '
                'Click an action below to start.</span></div>')
    parts = []
    for number, action in enumerate(actions, start=1):
        label = html.escape(ACTION_LABELS[action])
        parts.append(f'<span class="chip {chip_class(action)}" title="{html.escape(action)}">'
                     f'<span class="num">{number}</span>{label}</span>')
    return '<div class="seq-box">' + '<span class="arrow">→</span>'.join(parts) + "</div>"


def legend_html(n_actions):
    count = f"{n_actions} action{'s' if n_actions != 1 else ''}"
    return (
        f'<div class="legend"><span><b>{count}</b></span>'
        '<span><span class="dot" style="background:#1c83e1"></span>regular action</span>'
        '<span><span class="dot" style="background:#ff4b4b"></span>failure</span>'
        '<span><span class="dot" style="background:#ffa421"></span>help page</span>'
        "</div>"
    )


def result_html(predicted):
    if predicted == CALL:
        return ('<div class="result call"><div class="kicker">Prediction</div>'
                '<div class="value">📞 Will call</div>'
                '<div class="why">The sequence fits the transition matrix of users who '
                '<b>called</b> best. Call this customer first.</div></div>')
    return ('<div class="result nocall"><div class="kicker">Prediction</div>'
            '<div class="value">✅ Will not call</div>'
            '<div class="why">The sequence fits the transition matrix of users who '
            '<b>did not call</b> best. No proactive call is needed.</div></div>')


def likelihood_html(log_likelihood, predicted):
    boxes = []
    for group, color in ((CALL, "#ff4b4b"), (NO_CALL, "#21c354")):
        win = group == predicted
        badge = f'<div class="badge" style="color:{color}">▲ highest</div>' if win else '<div class="badge">&nbsp;</div>'
        boxes.append(
            f'<div class="lik{" win" if win else ""}" style="{"color:" + color if win else ""}">'
            f'<div class="name">log L · model "{group}"</div>'
            f'<div class="val">{log_likelihood[group]:.2f}</div>{badge}</div>'
        )
    return '<div class="lik-row">' + "".join(boxes) + "</div>"


def steps_table(prediction):
    actions = prediction["actions"]
    labels = [f"start: {ACTION_LABELS[actions[0]]}"] + [
        f"{ACTION_LABELS[a]} → {ACTION_LABELS[b]}" for a, b in zip(actions[:-1], actions[1:])
    ]
    table = pd.DataFrame({
        "step": range(1, len(actions) + 1),
        "transition": labels,
        f"log P ({NO_CALL})": prediction["steps"][NO_CALL],
        f"log P ({CALL})": prediction["steps"][CALL],
    })
    table[f"log L so far ({NO_CALL})"] = table[f"log P ({NO_CALL})"].cumsum()
    table[f"log L so far ({CALL})"] = table[f"log P ({CALL})"].cumsum()
    table["group ahead"] = np.where(
        table[f"log L so far ({CALL})"] > table[f"log L so far ({NO_CALL})"], CALL, NO_CALL)
    return table


def running_chart(table):
    data = pd.concat([
        pd.DataFrame({"step": table["step"], "transition": table["transition"], "group": group,
                      "log_lik_so_far": table[f"log L so far ({group})"]})
        for group in GROUPS
    ])
    return alt.Chart(data).mark_line(point=True).encode(
        x=alt.X("step:Q", title="step", axis=alt.Axis(tickMinStep=1, format="d")),
        y=alt.Y("log_lik_so_far:Q", title="log-likelihood so far"),
        color=alt.Color("group:N", scale=GROUP_COLORS, legend=alt.Legend(orient="top", title=None)),
        tooltip=["step", "transition", "group",
                 alt.Tooltip("log_lik_so_far:Q", title="log L so far", format=".2f")],
    ).properties(height=300)


# ---------- page ----------

init_state()
st.markdown(STYLES, unsafe_allow_html=True)
models, group_sizes = get_models()

st.title("🎲 Generate Sequence")
st.markdown(
    "Build the actions a user performed in the last two hours, in order, and predict whether "
    "the user will call customer care."
)
st.markdown(
    "**1.** Add actions from the palette below  ·  **2.** Edit the sequence if needed  ·  "
    "**3.** Click **Get Prediction**"
)

sequence = st.session_state.sequence
actions = current_actions()
is_full = len(sequence) >= MAX_STEPS
prediction = st.session_state.prediction
prediction_is_current = prediction is not None and prediction["actions"] == actions

# ---- Row 1: the input sequence (left) and the prediction (right) ----
input_col, result_col = st.columns([3, 2], gap="large")

with input_col:
    st.subheader("Your sequence")
    st.markdown(sequence_html(actions) + legend_html(len(sequence)), unsafe_allow_html=True)
    with st.container(horizontal=True, gap="small"):
        st.button("Undo last", icon=":material/undo:", on_click=undo_last, disabled=not sequence)
        st.button("Reset", icon=":material/restart_alt:", on_click=reset_sequence,
                  disabled=not sequence)

with result_col:
    st.subheader("Prediction")
    st.button("Get Prediction", type="primary", icon=":material/online_prediction:", key="predict",
              on_click=run_prediction, disabled=not sequence, width="stretch")
    if not sequence:
        st.markdown('<div class="placeholder">Add at least one action to get a prediction.</div>',
                    unsafe_allow_html=True)
    elif prediction is None:
        st.markdown('<div class="placeholder">Your prediction will appear here.</div>',
                    unsafe_allow_html=True)
    elif not prediction_is_current:
        st.markdown('<div class="placeholder">The sequence changed.<br>'
                    'Click <b>Get Prediction</b> to update the result.</div>', unsafe_allow_html=True)
    else:
        st.markdown(result_html(prediction["predicted"]), unsafe_allow_html=True)
        st.markdown(likelihood_html(prediction["log_likelihood"], prediction["predicted"]),
                    unsafe_allow_html=True)
        st.caption(
            "log L = how well each group's transition matrix explains the sequence. "
            "Higher (closer to 0) is better. The prediction is the group with the highest log L."
        )
        if len(actions) == 1:
            st.info("With a single action there are no transitions, so both groups are almost "
                    "equally likely. Add more actions for a meaningful prediction.", icon="ℹ️")

# ---- Row 2: the action palette ----
st.subheader("Add actions")
st.caption(
    "Click an action to add it to the end of the sequence. "
    "Hover over a button to see what the action means."
)
if is_full:
    st.warning(f"The sequence has reached the maximum of {MAX_STEPS} actions.", icon="⚠️")

palette = st.columns(len(ACTION_GROUPS))
for column, (group_name, group_actions) in zip(palette, ACTION_GROUPS.items()):
    with column, st.container(border=True, key=f"palette_{group_name}"):
        st.markdown(f"**{group_name}**")
        for action in group_actions:
            st.button(
                ACTION_LABELS[action], icon=ACTION_ICONS[action], key=f"add_{action}",
                on_click=add_action, args=(action,), disabled=is_full, width="stretch",
                help=f"`{action}` — {ACTION_DESCRIPTIONS[action]}",
            )

# ---- Row 3: editing and explanation ----
if sequence:
    with st.expander("✏️ Edit steps — change, reorder or remove actions"):
        for position, item in enumerate(sequence):
            number, choice, up, down, delete = st.columns([0.4, 6, 1, 1, 1],
                                                          vertical_alignment="center")
            number.markdown(f"**{position + 1}**")
            choice.selectbox(
                f"Step {position + 1}", ACTIONS, index=ACTIONS.index(item["action"]),
                format_func=ACTION_LABELS.get, key=f"step_{item['id']}",
                on_change=change_action, args=(item["id"],), label_visibility="collapsed",
            )
            up.button("", icon=":material/arrow_upward:", key=f"up_{item['id']}",
                      on_click=move_item, args=(position, -1), disabled=position == 0,
                      help="Move up", width="stretch")
            down.button("", icon=":material/arrow_downward:", key=f"down_{item['id']}",
                        on_click=move_item, args=(position, 1),
                        disabled=position == len(sequence) - 1, help="Move down", width="stretch")
            delete.button("", icon=":material/delete:", key=f"del_{item['id']}",
                          on_click=remove_item, args=(position,), help="Remove", width="stretch")

if prediction_is_current:
    with st.expander("🔍 How was this decided? Step by step"):
        st.markdown(
            "Each step adds its log-probability to the log-likelihood of each group. "
            "The line that ends higher wins."
        )
        table = steps_table(prediction)
        st.altair_chart(running_chart(table), width="stretch")
        st.dataframe(table.round(3), hide_index=True, width="stretch")

st.caption(
    f"Model: one transition matrix per group, learned from {TRAIN_USERS:,} synthetic users "
    f"({group_sizes[CALL]:,} called, {group_sizes[NO_CALL]:,} did not call), with Laplace smoothing."
)
