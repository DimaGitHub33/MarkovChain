<div align="center">

# 📞 Customer Care Call Predictor

**Find the customers who are about to call customer care, and call them first.**

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-double--click_to_run-0078D4?logo=windows&logoColor=white)

<img src="docs/images/overview.png" alt="The Overview page of the app" width="900">

</div>

## 💡 The idea

When something goes wrong, such as a failed transfer or a locked password, customers often call customer care. Their actions in the last two hours usually show it.

This project learns how **callers** and **non-callers** move from one action to the next. It then uses this to find customers who are likely to call, **before** they call.

## 🧠 How the model works

```mermaid
flowchart TB
    subgraph LEARN["① Learn from past customers"]
        direction LR
        L1["Actions from<br/>the last 2 hours"] --> L2["One sequence<br/>per customer"]
        L2 --> L3{"Called?"}
        L3 -- "yes" --> MC["Callers'<br/>transition matrix"]
        L3 -- "no" --> MN["Non-callers'<br/>transition matrix"]
    end
    subgraph PREDICT["② Predict for a new customer"]
        direction LR
        P1["The new customer's<br/>sequence"] --> P2["Likelihood under<br/>each matrix"]
        P2 --> P3{"Which is<br/>higher?"}
        P3 -- "callers" --> R1["📞 Likely to call:<br/>call them first"]
        P3 -- "non-callers" --> R2["✅ Unlikely to call"]
    end
    LEARN -- "both matrices" --> PREDICT

    classDef callers fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef noncallers fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    class MC,R1 callers
    class MN,R2 noncallers
```

1. **Learn.** Split past customers into two groups: those who called and those who did not. In each group, count how often each action follows each other action, and turn the counts into probabilities. The result is a **transition matrix** for each group.
2. **Predict.** For a new customer, ask: *which group's matrix makes this sequence of actions more likely?* If it is the callers' matrix, the customer is likely to call.

> **Example:** Log in → FX transfer attempt → **FX transfer failed** → FX transfer attempt → **FX transfer failed** → Open help page
>
> This sequence is **110× more likely** under the callers' pattern. The app says: *likely to call, so call this customer first.*

<details>
<summary><b>The math in three formulas</b></summary>

**1. Transition matrix of group *c*.** $N_c(i \to j)$ counts how often action $j$ follows action $i$ in group $c$. There are $K = 11$ actions. Laplace smoothing ($\alpha = 1$) gives unseen transitions a small probability instead of zero.

$$A_c(i,j) = \frac{N_c(i \to j) + \alpha}{\sum_k N_c(i \to k) + K\alpha}$$

**2. Log-likelihood of a sequence** $x_1, \dots, x_n$. $\pi_c$ is the probability of the first action. Logarithms turn a long product of small numbers into a sum.

$$\log L_c = \log \pi_c(x_1) + \sum_{t=1}^{n-1} \log A_c(x_t, x_{t+1})$$

**3. Prediction.** The customer joins the group with the highest likelihood. A tie goes to non-callers.

$$\hat{c} = \arg\max_{c \in \lbrace \text{callers}, \text{non-callers} \rbrace} \log L_c$$

</details>

## 🖥️ The app

The five pages tell the story in order:

| | Page | What you can do |
|---|---|---|
| 📘 | **Overview** | Read about the problem, see two example customers, the method and the math |
| 🗺️ | **How It Works** | Follow a diagram of the two phases: building the models and classifying a customer |
| 📊 | **Behavior Patterns** | Explore the two transition matrices and how they differ, cell by cell |
| 📞 | **Predict** | Build a customer's actions and get a prediction, with the strength of the evidence and the effect of each step |
| 📈 | **Performance** | See the results on 10,000 test customers and try different daily call budgets |

<table>
  <tr>
    <td width="50%"><img src="docs/images/predict.png" alt="The Predict page"><p align="center"><b>Predict:</b> will this customer call?</p></td>
    <td width="50%"><img src="docs/images/patterns.png" alt="The Behavior Patterns page"><p align="center"><b>Behavior Patterns:</b> where the two groups differ</p></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/images/how-it-works.png" alt="The How It Works page"><p align="center"><b>How It Works:</b> the process, step by step</p></td>
    <td width="50%"><img src="docs/images/performance.png" alt="The Performance page"><p align="center"><b>Performance:</b> how many callers you reach</p></td>
  </tr>
</table>

## 🚀 Run it

### What you need

| | Why |
|---|---|
| **Windows** 10 or 11 | For the one-click launcher |
| [**Python**](https://www.python.org/downloads/) 3.11 or newer | Runs the model and the server |
| [**Node.js**](https://nodejs.org) 22 LTS or newer | Builds the web pages. First run only |
| An internet connection | Downloads the packages. First run only |

### Start the app

1. Get the project: `git clone https://github.com/DimaGitHub33/MarkovChain.git`, or use **Code → Download ZIP** on GitHub.
2. Double-click **`run_app.bat`**.
3. Your browser opens **http://localhost:8900** when the app is ready.

To stop the app, close the black window.

> [!NOTE]
> The **first run** takes a few minutes: the launcher creates a Python environment, installs the packages and builds the web pages. After that, the app starts in about 10 seconds.
> The launcher works from any folder, so you can also start it from a shortcut or a terminal.

### If something goes wrong

| Message | What to do |
|---|---|
| *Python was not found* | Install Python 3.11 or newer, and select **Add python.exe to PATH** during setup. |
| *Node.js was not found* | Install Node.js 22 LTS, then run `run_app.bat` again. |
| *Port 8900 is already in use* | The app is probably already running. Open http://localhost:8900. |

## 📊 Results

On 10,000 synthetic test customers that the model has never seen (about 5% of them called):

- Calling the **top 100** customers reaches a real caller **61%** of the time. Calling at random reaches one only **5%** of the time.
- Ranking quality (AUC) is **0.735**, close to the best possible on this data, **0.750**.

## 📁 What's inside

```
backend/       the model (markov_calls/) and the web server (api/), with tests
frontend/      the web pages (React)
notebooks/     the analysis, step by step: data → transition matrices → evaluation
scripts/       helper scripts for building and testing
docs/images/   the screenshots on this page
run_app.bat    the one-click launcher
```

## 🛠️ For developers

<details>
<summary><b>Development mode, tests, API and notebooks</b></summary>

### Scripts

| Command | What it does |
|---|---|
| `scripts\dev.bat` | Starts the server with auto-reload on :8000 and the web pages with hot reload on :5173 |
| `scripts\check.bat` | Runs all tests, the type check and the production build |
| `scripts\build_frontend.bat` | Rebuilds the web pages after you change `frontend/` |

Before the first `check.bat`, install the test tools:

```
.venv\Scripts\python -m pip install -r backend\requirements-dev.txt
```

### API

The server runs on the same port as the app. Interactive docs: **http://localhost:8900/api/docs**

| Method | Path | Returns |
|---|---|---|
| GET | `/api/actions` | The 11 actions and their categories |
| GET | `/api/model` | Group sizes and training settings |
| GET | `/api/patterns` | Transition matrices (learned and true) and transition counts |
| POST | `/api/predict` | `{"actions": ["login", ...]}` → prediction, likelihoods, evidence, step-by-step explanation |
| GET | `/api/performance` | All the results shown on the Performance page |

### Notebooks

The notebooks show the same process in detail. Run them in order: 1, 2, 3.

```
pip install -r notebooks\requirements.txt
```

### Technology

Python, NumPy, FastAPI and pytest on the server. React, TypeScript, Vite, Tailwind CSS and Vitest for the web pages. The charts are plain SVG.

</details>

## 📝 Good to know

- The data is **synthetic**: 20,000 training customers and 10,000 test customers, created with fixed random seeds. Every run gives the same results.
- The model looks only at the **order** of actions. Each step depends only on the action before it, not on timing.
