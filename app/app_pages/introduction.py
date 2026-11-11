import streamlit as st

st.title("📞 Predicting Customer Care Calls")
st.markdown(
    """
Customers call customer care when something goes wrong: a transfer fails, a password cannot be
changed, a payment is unclear. If we can find these customers **before** they call, we can
**call them first** — a better experience for the customer and a lighter load on the call center.

This project predicts who is about to call, using the **sequence of actions** each user performed
in the **last two hours**.
"""
)

st.header("The idea")
st.markdown("A user's recent actions tell a story. Compare these two users:")
col_normal, col_caller = st.columns(2)
with col_normal:
    st.success(
        "**Probably will not call**\n\n"
        "login → check_balance → card_payment → check_balance → transfer_to_other_user"
    )
with col_caller:
    st.error(
        "**Probably will call**\n\n"
        "login → fx_transfer_attempt → fx_transfer_failed → fx_transfer_attempt → "
        "fx_transfer_failed → open_help_page"
    )
st.markdown(
    "The second user fails, retries, fails again and looks for help. "
    "This pattern is typical for users who are about to call."
)

st.header("The method")
st.markdown(
    """
1. **Collect recent activity.** Take all users who performed actions in the last two hours.
2. **Build a sequence per user.** The ordered list of actions the user performed.
3. **Split into two groups.** Users who **called** customer care and users who **did not**.
4. **Build a transition matrix for each group.** The probability of moving from each action to the next one.
5. **Predict.** For a new user, compute how likely their sequence is under each group's matrix.
   The group with the higher likelihood wins. If it is the "will call" group, we call the user first.

This is a **generative classifier**: each group has its own model of how its members behave.
"""
)
st.page_link("app_pages/model_process.py", label="See the full process diagram", icon="🗺️")

st.header("The math")
st.markdown("**Transition matrix** of group $c$, estimated from counts with Laplace smoothing $\\alpha$:")
st.latex(r"A_c(i, j) = \frac{N_c(i \to j) + \alpha}{\sum_k N_c(i \to k) + K\alpha}")
st.markdown(
    "$N_c(i \\to j)$ is how many times action $j$ came right after action $i$ in group $c$, "
    "and $K$ is the number of actions. Smoothing gives unseen transitions a small probability "
    "instead of zero."
)

st.markdown("**Log-likelihood** of a sequence $x_1, \\dots, x_n$ under group $c$:")
st.latex(r"\log L_c = \log \pi_c(x_1) + \sum_{t=1}^{n-1} \log A_c(x_t, x_{t+1})")
st.markdown(
    "$\\pi_c$ is the probability of the first action. Logarithms turn a long product of small "
    "probabilities into a sum, so the numbers do not underflow."
)

st.markdown("**Prediction — argmax:** the user belongs to the group whose model explains the sequence best.")
st.latex(r"\hat{c} = \arg\max_{c \in \{\text{no call},\ \text{call}\}} \; \log L_c")
st.markdown(
    "If the sequence fits the callers' transition matrix best, the user is predicted to call, "
    "and we call them first."
)
