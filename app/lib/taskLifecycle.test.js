import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDeadlineAwareTaskState,
  deriveDeadlineAwareTaskState,
  isAbsoluteDeadlinePassed
} from "./taskLifecycle.js";

const now = Date.parse("2026-06-18T00:00:00.000Z");

test("absolute ISO deadlines close open tasks after the deadline", () => {
  assert.equal(
    deriveDeadlineAwareTaskState(
      { taskState: "open", deadline: "2026-06-17T15:59:00.000Z" },
      now
    ),
    "closed"
  );
});

test("future deadlines keep open tasks open", () => {
  assert.equal(
    deriveDeadlineAwareTaskState(
      { taskState: "open", deadline: "2026-06-24T15:59:00.000Z" },
      now
    ),
    "open"
  );
});

test("terminal task states are not changed by deadline derivation", () => {
  for (const taskState of ["closed", "full", "refunded"]) {
    assert.equal(
      deriveDeadlineAwareTaskState(
        { taskState, deadline: "2026-06-17T15:59:00.000Z" },
        now
      ),
      taskState
    );
  }
});

test("relative or missing deadlines are ignored", () => {
  assert.equal(isAbsoluteDeadlinePassed("24h", now), false);
  assert.equal(isAbsoluteDeadlinePassed("", now), false);
  assert.equal(isAbsoluteDeadlinePassed("TBD", now), false);
});

test("applyDeadlineAwareTaskState returns a task with derived closed state", () => {
  const task = { id: "task-1", taskState: "open", deadline: "2026-06-17T15:59:00.000Z" };
  assert.deepEqual(applyDeadlineAwareTaskState(task, now), {
    id: "task-1",
    taskState: "closed",
    deadline: "2026-06-17T15:59:00.000Z"
  });
});
