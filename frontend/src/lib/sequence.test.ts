import { describe, expect, it } from "vitest";
import { createSequence, decodeSequence, encodeSequence, sequenceActions, sequenceReducer } from "./sequence";

const actionsOf = (state: ReturnType<typeof createSequence>) => sequenceActions(state);

describe("sequenceReducer", () => {
  it("adds, removes, moves and replaces actions", () => {
    let state = createSequence();
    for (const action of ["a", "b", "c"]) state = sequenceReducer(state, { type: "add", action });
    expect(actionsOf(state)).toEqual(["a", "b", "c"]);
    state = sequenceReducer(state, { type: "move", index: 0, offset: 1 });
    expect(actionsOf(state)).toEqual(["b", "a", "c"]);
    state = sequenceReducer(state, { type: "replace", index: 2, action: "d" });
    expect(actionsOf(state)).toEqual(["b", "a", "d"]);
    state = sequenceReducer(state, { type: "remove", index: 1 });
    expect(actionsOf(state)).toEqual(["b", "d"]);
  });

  it("keeps ids stable and unique", () => {
    let state = createSequence(["a"]);
    state = sequenceReducer(state, { type: "add", action: "b" });
    state = sequenceReducer(state, { type: "remove", index: 0 });
    state = sequenceReducer(state, { type: "add", action: "c" });
    const ids = state.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("undoes every kind of change, including reset", () => {
    let state = createSequence(["a", "b"]);
    state = sequenceReducer(state, { type: "reset" });
    expect(actionsOf(state)).toEqual([]);
    state = sequenceReducer(state, { type: "undo" });
    expect(actionsOf(state)).toEqual(["a", "b"]);
    state = sequenceReducer(state, { type: "move", index: 1, offset: -1 });
    state = sequenceReducer(state, { type: "undo" });
    expect(actionsOf(state)).toEqual(["a", "b"]);
    expect(sequenceReducer(state, { type: "undo" })).toBe(state);
  });

  it("ignores no-op commands without adding history", () => {
    const state = createSequence(["a"]);
    expect(sequenceReducer(state, { type: "move", index: 0, offset: -1 })).toBe(state);
    expect(sequenceReducer(state, { type: "remove", index: 5 })).toBe(state);
    expect(sequenceReducer(state, { type: "replace", index: 0, action: "a" })).toBe(state);
    expect(sequenceReducer(createSequence(), { type: "reset" }).history).toHaveLength(0);
  });

  it("respects the maximum length", () => {
    let state = createSequence(["a", "b"], 2);
    state = sequenceReducer(state, { type: "add", action: "c" });
    expect(actionsOf(state)).toEqual(["a", "b"]);
    state = sequenceReducer(state, { type: "load", actions: ["x", "y", "z"] });
    expect(actionsOf(state)).toEqual(["x", "y"]);
  });
});

describe("share links", () => {
  const known = new Set(["login", "check_balance"]);

  it("round-trips a sequence", () => {
    const actions = ["login", "check_balance", "login"];
    expect(decodeSequence(encodeSequence(actions), known, 30)).toEqual(actions);
  });

  it("drops unknown actions and limits the length", () => {
    expect(decodeSequence("login,hack, check_balance,login", known, 2)).toEqual(["login", "check_balance"]);
    expect(decodeSequence(null, known, 30)).toEqual([]);
  });
});
