export type GroupId = "non_callers" | "callers";
export type ActionKind = "regular" | "failure" | "help";
export type Evidence = "weak" | "moderate" | "strong";

export interface Category {
  id: string;
  label: string;
}

export interface Action {
  id: string;
  label: string;
  description: string;
  category: string;
  kind: ActionKind;
}

export interface Catalog {
  categories: Category[];
  actions: Action[];
}

export interface ModelSummary {
  groups: { id: GroupId; label: string; training_users: number }[];
  training: { users: number; call_rate: number; min_actions: number; max_actions: number; seed: number };
  smoothing: { alpha: number; beta: number };
  max_sequence_length: number;
}

export interface Chain {
  initial: number[];
  transitions: number[][];
  stationary: number[];
  transition_counts?: number[][];
}

export interface Patterns {
  actions: string[];
  true: Record<GroupId, Chain>;
  learned: Record<GroupId, Chain>;
  typical_for: Record<string, GroupId | "both">;
}

export interface Step {
  position: number;
  from: string | null;
  to: string;
  log_probability: Record<GroupId, number>;
  cumulative: Record<GroupId, number>;
  favours: GroupId;
  leader: GroupId;
  training_count: Record<GroupId, number>;
  rare: boolean;
}

export interface Prediction {
  actions: string[];
  predicted: GroupId;
  log_likelihood: Record<GroupId, number>;
  likelihood_ratio: number;
  evidence: Evidence;
  steps: Step[];
}

export interface MethodMetrics {
  id: string;
  label: string;
  flagged: number;
  callers_caught: number;
  precision: number | null;
  recall: number;
  accuracy: number;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
}

export interface Performance {
  test_set: { users: number; callers: number; call_rate: number };
  methods: MethodMetrics[];
  confusion: { true_positive: number; false_positive: number; false_negative: number; true_negative: number };
  auc: { model: number; oracle: number; rule: number; random: number };
  roc: { model: RocPoint[]; oracle: RocPoint[] };
  budget: {
    max_k: number;
    captured_model: number[];
    captured_oracle: number[];
    table: { k: number; precision_model: number; precision_oracle: number; callers_caught: number }[];
  };
  score_histogram: { edges: number[] } & Record<GroupId, number[]>;
  by_length: { label: string; users: number; callers: number; auc_model: number; auc_oracle: number }[];
}
