import { expect, test, beforeEach } from "bun:test";
import { createSimulationOptions } from "../public/js/components/simulation-options.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

test("createSimulationOptions renders a labeled years field", () => {
  const { wrapper, field } = createSimulationOptions({
    id: "sim_years_test",
    value: "25",
  });

  document.body.appendChild(wrapper);

  const input = document.getElementById("sim_years_test");
  expect(input).not.toBeNull();
  expect(input?.getAttribute("type")).toBe("number");
  expect(input?.value).toBe("25");
  expect(field.input).toBe(input);
});

test("createSimulationOptions wires onInput handler", () => {
  let calledWith = null;
  const { wrapper } = createSimulationOptions({
    id: "sim_years_handler",
    value: "10",
    onInput: (input) => {
      calledWith = input;
    },
  });

  document.body.appendChild(wrapper);
  const input = document.getElementById("sim_years_handler");
  input.value = "15";
  input.dispatchEvent(new Event("input", { bubbles: true }));

  expect(calledWith).toBe(input);
});
