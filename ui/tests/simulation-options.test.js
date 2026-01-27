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

test("createSimulationOptions supports an optional checkbox", () => {
  let checked = null;
  const { wrapper } = createSimulationOptions({
    id: "sim_years_checkbox",
    value: "10",
    checkbox: {
      id: "ignore_snowmelt",
      label: "Ignore snowmelt",
      help: "Test help",
      checked: true,
      onInput: (input) => {
        checked = input.checked;
      },
    },
  });

  document.body.appendChild(wrapper);
  const checkbox = document.getElementById("ignore_snowmelt");
  expect(checkbox).not.toBeNull();
  expect(checkbox?.getAttribute("type")).toBe("checkbox");
  expect(checkbox?.checked).toBe(true);

  checkbox.checked = false;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  expect(checked).toBe(false);
});

test("createSimulationOptions supports an optional wepp version selector", () => {
  let selected = null;
  const { wrapper } = createSimulationOptions({
    id: "sim_years_wepp",
    value: "10",
    weppVersion: {
      id: "wepp_version_select",
      label: "WEPP Version",
      options: [
        { value: "wepp2010", label: "WEPP 2010" },
        { value: "wepp_dcc52a6_hill", label: "WEPP dcc52a6 hill" },
      ],
      value: "wepp2010",
      onInput: (select) => {
        selected = select.value;
      },
    },
  });

  document.body.appendChild(wrapper);
  const select = document.getElementById("wepp_version_select");
  expect(select).not.toBeNull();
  expect(select?.tagName).toBe("SELECT");
  expect(select?.value).toBe("wepp2010");

  select.value = "wepp_dcc52a6_hill";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  expect(selected).toBe("wepp_dcc52a6_hill");
});
