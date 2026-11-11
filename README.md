# MarkovChain

Predicting which customers are about to call customer care, using **one Markov chain per group** and **maximum-likelihood classification**.

## The business problem

Customers call customer care when something goes wrong: a transfer fails, a password cannot be changed, a payment is unclear. If we can find these customers **before** they call, we can call them first — a better experience for the customer and a lighter load on the call center.

The idea: a customer's recent actions tell a story. A user who tries an FX transfer, fails, retries, fails again and opens the help page behaves differently from a user who checks the balance and pays with a card.

## The method

1. **Collect recent activity.** Take all users who performed actions in the last two hours.
2. **Build a sequence per user.** For example:
   `login → check_balance → fx_transfer_attempt → fx_transfer_failed → fx_transfer_attempt → open_help_page`
3. **Split into two groups** (training data): users who **called** customer care and users who **did not**.
4. **Build a transition matrix for each group**: the probability of moving from each action to the next action.
5. **Predict.** For a new user, build the sequence of their last two hours and compute its likelihood under both matrices. The user is assigned to the group whose model gives the higher likelihood. If the "will call" model wins, we call the user first.

This is a **generative classifier**: each group has a model of how its members behave, and Bayes' rule turns these models into a classification.

## The math

Let `K` be the number of possible actions and `c ∈ {no call, call}` the group.

**First-action distribution** (with smoothing `β`):

```
π_c(i) = (N_c^first(i) + β) / (Σ_k N_c^first(k) + K·β)
```

**Transition matrix** (with smoothing `α`):

```
A_c(i, j) = (N_c(i → j) + α) / (Σ_k N_c(i → k) + K·α)
```

`N_c(i → j)` counts how often action `j` comes right after action `i` among users of group `c`. Adding `α` (Laplace smoothing) gives unseen transitions a small probability instead of zero. This matters most for the callers group, which is small.

**Log-likelihood** of a sequence `x_1, ..., x_n`:

```
log L_c = log π_c(x_1) + Σ_{t=1}^{n-1} log A_c(x_t, x_{t+1})
```

Logarithms turn a long product of small probabilities into a sum and prevent numerical underflow. The logarithm is increasing, so it does not change which group has the highest likelihood.

**Prediction — argmax:** the user belongs to the group whose model explains the sequence best.

```
ĉ = argmax_c  log L_c
```

If the sequence fits the callers' transition matrix best, the user is predicted to call, and we call them first.

**Decision rules:**

| Rule | Prediction | Notes |
|------|------------|-------|
| Argmax (maximum likelihood, ML) | `argmax_c log L_c` | The method as described above; treats both groups as equally likely in advance |
| Argmax with the prior (MAP) | `argmax_c [log L_c + log P(c)]` | Calls are rare, so the call group needs a better fit to win |
| Call budget (top K) | the K users with the highest `P(call \| actions)` | Matches a call center with limited capacity |

The posterior probability of each group comes from the same likelihoods (Bayes' rule):

```
P(c | actions) = L_c · P(c) / Σ_k L_k · P(k)
```

Its argmax is the MAP prediction; sorting users by `P(call | actions)` gives the order in which to call them.

## Model assumptions

1. **First-order Markov property:** within a group, the next action depends only on the current action.
2. **Time homogeneity:** the same transition matrix applies to every step in the window.
3. **Class-conditional generation:** a user's group determines how they behave during the whole window.
4. **Independent users.**

Things the basic model ignores: the time between actions, the length of the window, and behavior that changes during the window (for example, a normal user who becomes frustrated only after a failure).

## Label definition

For real data, the label must be defined carefully to avoid leakage: the observation window (last two hours) must end **before** the call, and "called" means a call within a fixed horizon after the window. Actions performed after the call must never enter the sequence.

## Synthetic data

There is no real data in this project, so we generate it. Because we create the data, we know the true transition matrices and can compute the best possible result (the oracle).

- 11 actions: `login`, `check_balance`, `check_exchange_rates`, `card_payment`, `transfer_to_own_account`, `transfer_to_other_user`, `fx_transfer_attempt`, `fx_transfer_failed`, `password_change_attempt`, `password_change_failed`, `open_help_page`.
- Users who do not call mostly check balances, pay, and transfer; failures are rare.
- Users who will call fail more often, retry after failures, and open the help page.
- About 5% of users call.
- Each user performs 3–20 actions; the length distribution is the same in both groups.
- 20,000 training users and 10,000 test users, generated with different seeds.

In the first experiment the data follow the model's assumptions exactly. Later experiments will break these assumptions on purpose.

## Evaluation

Calls are rare, so **accuracy is misleading**: "never call anyone" is about 95% accurate and useless. We use:

- **precision** and **recall** for each decision rule;
- **ROC AUC** — the quality of the ranking;
- **precision at K** — the share of real callers among the K users we call;
- performance by window length.

Baselines:

| Baseline | Description |
|----------|-------------|
| Never call | Always predict "will not call" |
| Simple rule | Predict "will call" if the user had any failure or opened the help page |
| Random calling | Precision equals the call rate |
| Oracle | The same scoring with the true matrices; the best achievable result |

## Project structure

```
app/
    streamlit_app.py                # Streamlit entry point (navigation)
    simulation.py                   # synthetic data generator (same process as notebook 1)
    app_pages/
        introduction.py             # page 1: project overview, method and math
        group_behavior.py           # page 2: transition matrices and action distributions of both groups
        generate_sequences.py       # page 3: generate users and browse their action sequences
generative_classifier/
    01_generate_data.ipynb          # create synthetic users and save train/test sets
    02_transition_matrices.ipynb    # estimate one Markov model per group
    03_predict_and_evaluate.ipynb   # argmax prediction for test users, compare with baselines and the oracle
    data/                           # created by notebook 1 (not committed)
    models/                         # created by notebook 2 (not committed)
requirements.txt
```

## How to run

```
pip install -r requirements.txt
```

**Notebooks:** open the notebooks in `generative_classifier/` and run them in order: 1, 2, 3.

**Streamlit app:**

```
streamlit run app/streamlit_app.py
```

- **Introduction** — the business problem, the method and the math.
- **Group Behavior** — the transition matrices of both groups and how they differ, the next-action distribution for any action, the first-action and long-run action distributions, and a table of the actions.
- **Generate Sequences** — choose the number of users, the call rate, the seed and the number of actions per user.
  Browse the sequences of users who called, of users who did not call, and a combined table whose right column is the classification.
  With the same settings and seed, the app creates the same users as notebook 1.

## Roadmap

- [x] Synthetic data that follows the model's assumptions
- [x] One transition matrix per group, with smoothing
- [x] ML and MAP prediction, baselines, oracle, call-budget evaluation
- [x] Streamlit app: introduction, group behavior and sequence generation pages
- [ ] Sensitivity to smoothing (`α`, `β`) and training size
- [ ] Data that breaks the assumptions (behavior that changes after a failure, order that does not matter, informative session length)
- [ ] Extensions: end-of-session state, higher-order chains, time between actions
