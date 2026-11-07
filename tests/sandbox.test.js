// Run with: node --test
// tests/runtime/sandbox.mjs: the guard every script spawn's HERDR_APP_HOME goes through.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { TMP, tmpdir, tempHome, sh } from "./runtime/sandbox.mjs";

test("the guard refuses a HERDR_APP_HOME that is empty, not a string or not under the temp folder", () => {
  for (const home of [undefined, null, 42, "", "/home/someone/.config/herdr-app", TMP, TMP + "/../x"]) {
    assert.throws(() => tempHome(home), /refusing to run a script/, String(home));
    assert.throws(() => sh(home, ["-c", "exit 0"]), /refusing to run a script/, String(home));
  }
});

test("the guard passes a temp path through, resolved, and sh hands it to the script", () => {
  const home = tmpdir();
  assert.equal(tempHome(home + "/./x/.."), home);
  const r = sh(path.join(home, "missing"), ["-c", 'printf %s "$HERDR_APP_HOME"']);
  assert.equal(r.stdout, path.join(home, "missing"));
});
