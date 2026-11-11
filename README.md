# MarkovChain — Predicting Customer Care Calls

Find the customers who are about to call customer care, **and call them first**.

Each user's actions from the last two hours form a sequence. We learn **one Markov chain per group** — users who called and users who did not — and assign a new user to the group whose chain explains their sequence best (**maximum likelihood**).

![Model building and user classification](views/diagram.png)

## The idea

Customers call when something goes wrong: a transfer fails, a password cannot be changed. Their recent actions show it:

| | Sequence |
|---|---|
| Probably **will not** call | `login → check_balance → card_payment → check_balance → transfer_to_other_user` |
| Probably **will** call | `login → fx_transfer_attempt → fx_transfer_failed → fx_transfer_attempt → fx_transfer_failed → open_help_page` |

The order matters: failing, retrying and then looking for help is typical of users who are about to call. A Markov chain captures exactly this — how likely each action is to follow the previous one.

## How it works

**Phase A — build the models** (users whose outcome is known)

1. Collect the events of all users in a two-hour window.
2. Build one sequence of states per user, in time order (11 action types).
3. Split the sequences by label: did the user call customer care after the window?
4. In each group, count the transitions between consecutive states and normalize each row.
5. Result: two transition matrices, `A_call` and `A_no_call`, plus a first-state distribution `π` for each group.

**Phase B — classify a user** (outcome unknown)

1. Collect the user's events from the last two hours.
2. Build the state sequence with the same ordering and state mapping as in phase A.
3. Compute the log-likelihood of the sequence under each model.
4. Compare the two values.
5. Assign the user to the group with the highest likelihood. If it is the call group, call the user first.

This is a **generative classifier**: each group has its own model of how its members behave.

## The math

With `K = 11` states and smoothing constants `α = β = 1` (Laplace smoothing):

```
A_c(i, j) = (N_c(i → j) + α) / (Σ_k N_c(i → k) + K·α)        transition matrix, each row sums to 1
π_c(i)    = (N_c^first(i) + β) / (Σ_k N_c^first(k) + K·β)    first-state distribution
```

`N_c(i → j)` counts how often state `j` comes right after state `i` inside the sequences of group `c`. Smoothing gives unseen transitions a small probability instead of zero, which matters most for the small callers group.

```
log L_c = log π_c(x_1) + Σ_t log A_c(x_t, x_{t+1})        log-likelihood of x_1 … x_n
ĉ       = argmax_c log L_c                                prediction
```

Logarithms turn a long product of small probabilities into a sum, so the numbers do not underflow; they do not change which group wins.

Notebook 3 compares the main rule with two variants:

| Rule | Prediction | When to use |
|------|------------|-------------|
| Maximum likelihood (main method) | `argmax_c log L_c` | Both groups treated as equally likely in advance |
| With the prior (MAP) | `argmax_c [log L_c + log P(c)]` | Calls are rare, so the call group needs a better fit to win |
| Call budget (top K) | the K users with the highest `P(call ∣ actions)` | The call center can make only K calls |

## Data

There is no real data yet, so the data is **synthetic**. Because we create it, we know the true matrices and can compute the best achievable result (the *oracle*).

- 11 actions: `login`, `check_balance`, `check_exchange_rates`, `card_payment`, `transfer_to_own_account`, `transfer_to_other_user`, `fx_transfer_attempt`, `fx_transfer_failed`, `password_change_attempt`, `password_change_failed`, `open_help_page`.
- Users who will call fail more often, retry after failures and open the help page. Other users mostly check balances, pay and transfer money.
- About 5% of users call. Each user performs 3–20 actions, with the same length distribution in both groups.
- 20,000 training users and 10,000 test users, generated with different fixed seeds.

## Results

On the 10,000 test users (531 callers):

| Method | Users flagged | Precision | Recall |
|--------|--------------:|----------:|-------:|
| Simple rule: any failure or help page | 2,495 | 9% | 42% |
| Markov, maximum likelihood | 2,300 | 13% | 56% |
| Markov, with the prior (MAP) | 78 | 68% | 10% |

- **Ranking quality (ROC AUC):** Markov model 0.735, oracle 0.75, simple rule 0.59.
- **Call budget:** of the top 100 users by `P(call | actions)`, 61% really called, against 5% when calling at random.
- **Accuracy is misleading here:** never calling anyone is 95% accurate and catches no one.
- **Short windows carry little evidence:** AUC is 0.63 for 3–6 actions and 0.79 for 16–20 actions.

## Assumptions and limitations

- **First-order Markov chain:** within a group, the next action depends only on the current one, and the same matrix applies to every step.
- **The group drives the whole window:** a user's group determines their behavior throughout the two hours. The synthetic data follows this exactly, which makes it the easy case.
- **Ignored by the model:** the time between actions, the window length, and behavior that changes during the window.
- **The training window:** the label is known only after the window, so in production phase A must use past windows. Only phase B uses the last two hours.
- **Defining the label:** with real data, "called" must mean a call within a fixed horizon after the window, and actions after the call must never enter the sequence.
- **Not implemented yet:** the two-hour window, sorting events by time, and handling event types outside the 11 states. The synthetic sequences are generated already in order.
- **Ties:** in a tie, the user is assigned to "will not call".

## Project structure

```
app/                                Streamlit app
    streamlit_app.py                entry point and navigation
    simulation.py                   synthetic data generator (same process as notebook 1)
    markov_model.py                 learns one Markov model per group and scores sequences
    app_pages/
        introduction.py             the problem, the method and the math
        model_process.py            the process diagram, with zoom
        group_behavior.py           the transition matrices of both groups and the action table
        generate_sequences.py       build a sequence and get a prediction
generative_classifier/              notebooks — run in order
    01_generate_data.ipynb          create the synthetic train and test users
    02_transition_matrices.ipynb    estimate one Markov model per group
    03_predict_and_evaluate.ipynb   predict, compare with baselines and the oracle
views/
    diagram.drawio                  process diagram (edit in draw.io)
    diagram.png                     PNG export of the diagram, used here and in the app
requirements.txt
```

The notebooks write `data/` and `models/` inside `generative_classifier/`; both folders are git-ignored.

## Getting started

Tested with Python 3.11.

```
pip install -r requirements.txt
```

**Notebooks:** open `generative_classifier/` and run notebooks 1, 2 and 3 in order.

**App:**

```
streamlit run app/streamlit_app.py
```

| Page | What it shows |
|------|---------------|
| Introduction | The problem, the method and the math |
| Model Process | The process diagram — building the models and classifying a user — with zoom |
| Group Behavior | The transition matrices of both groups, how they differ, and the actions |
| Generate Sequence | Build a sequence of actions, edit it, and click **Get Prediction** to see the predicted group with a step-by-step explanation |

The app trains its model the first time the Generate Sequence page opens (a few seconds, then cached), with the same settings as the notebooks, so its matrices are identical to those of notebook 2.

**Updating the diagram:** after editing `views/diagram.drawio`, export it again to `views/diagram.png` (draw.io: *File → Export as → PNG*, zoom 200%).

## Roadmap

- [x] Synthetic data, one transition matrix per group, maximum-likelihood prediction
- [x] Evaluation against baselines and the oracle, with MAP and call-budget variants
- [x] Streamlit app and process diagram
- [ ] Sensitivity to smoothing and training size
- [ ] Data that breaks the assumptions: behavior that changes after a failure, order that does not matter, informative session length
- [ ] Real event logs: two-hour windows, time ordering, label horizon
- [ ] Extensions: end-of-session state, higher-order chains, time between actions
