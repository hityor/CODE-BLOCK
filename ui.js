import { program } from "./state.js";
import { validateProgram } from "./validate.js";
import { runProgram } from "./engine.js";
import { initDnD } from "./dnd.js";
import { parseNames, isValidVarName } from "./utils.js";

const programDiv = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const memoryView = document.getElementById("logContent");

const domById = new Map();

function makeOperandDom(operandModel) {
  const element = document.createElement("div");
  element.className = "operandBlock";

  const kind = document.createElement("select");
  kind.innerHTML = `
    <option value="const">num</option>
    <option value="var">var</option>
  `;

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.placeholder = "0";
  valueInput.value = "0";

  const variableSelect = document.createElement("select");

  function syncVisibility() {
    const isConst = operandModel.kind === "const";
    valueInput.style.display = isConst ? "" : "none";
    variableSelect.style.display = isConst ? "none" : "";
  }

  kind.addEventListener("change", function () {
    operandModel.kind = kind.value;
    touch();
  });

  valueInput.addEventListener("input", function () {
    operandModel.value = valueInput.value;
    touch();
  });

  variableSelect.addEventListener("change", function () {
    operandModel.variable = variableSelect.value;
    touch();
  });

  element.appendChild(kind);
  element.appendChild(valueInput);
  element.appendChild(variableSelect);

  return { element, kind, valueInput, variableSelect, syncVisibility };
}

runBtn.addEventListener("click", function () {
  runProgram(program, {
    parseNames,
    validateAndStoreErrors,
    render,
    appendLogs,
    renderMemory,
    memoryView,
  });
});

function getDeclaredNames() {
  const options = new Set();
  for (const block of program)
    if (block.type === "varDecl")
      for (const name of parseNames(block.raw))
        if (isValidVarName(name)) options.add(name);

  return [...options];
}

function updateSelectionOptions(select, preferredValue) {
  const previousValue = preferredValue ?? select.value;

  const names = getDeclaredNames();
  select.innerHTML = "";

  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }

  if (previousValue && names.includes(previousValue)) {
    select.value = previousValue;
    return previousValue;
  }

  if (names.length > 0) {
    select.value = names[0];
    return names[0];
  }

  select.value = "";
  return "";
}

function updateOperandVariableSelection(operandModel, operandUi) {
  operandUi.variableSelect.value = operandModel.variable;
  operandModel.variable = updateSelectionOptions(
    operandUi.variableSelect,
    operandModel.variable,
  );
}

function validateAndStoreErrors() {
  const errorsById = validateProgram(program);
  for (const block of program) block.errors = errorsById.get(block.id) ?? [];
}

function render() {
  for (const blockObj of program) renderBlock(blockObj);
  syncCanvasOrder();
}

function syncCanvasOrder() {
  const desired = [];

  for (const blockObj of program) {
    const ui = domById.get(blockObj.id);
    if (ui?.block) desired.push(ui.block);
  }

  let cursor = programDiv.firstChild;

  for (const blockEl of desired) {
    if (blockEl === cursor) {
      cursor = cursor.nextSibling;
      continue;
    }
    programDiv.insertBefore(blockEl, cursor);
  }
}

function touch() {
  validateAndStoreErrors();
  render();
}

function ensureBlockDom(blockObj) {
  if (domById.has(blockObj.id)) return domById.get(blockObj.id);

  if (blockObj.type === "varDecl") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

    const type = document.createElement("span");
    type.textContent = "int ";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "a, b, c";

    const errorBox = document.createElement("div");
    errorBox.className = "errorBox";

    block.appendChild(type);
    block.appendChild(input);
    block.appendChild(errorBox);

    input.addEventListener("input", function () {
      blockObj.raw = input.value;
      touch();
    });

    block.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", `move:${blockObj.id}`);
      e.dataTransfer.effectAllowed = "move";
    });

    const ui = { block, input, errorBox };
    domById.set(blockObj.id, ui);

    return ui;
  }

  if (blockObj.type === "assign") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

    const select = document.createElement("select");

    const span = document.createElement("span");
    span.textContent = " = ";

    const exprMode = document.createElement("select");
    exprMode.className = "exprMode";
    exprMode.innerHTML = `
      <option value="single">value</option>
      <option value="binary">binary</option>
    `;

    const leftOperandUi = makeOperandDom(blockObj.expression.left);
    const operator = document.createElement("select");
    operator.className = "exprOperator";
    operator.innerHTML = `
      <option value="+">+</option>
      <option value="-">-</option>
      <option value="*">*</option>
      <option value="/">/</option>
      <option value="%">%</option>
    `;
    const rightOperandUi = makeOperandDom(blockObj.expression.right);

    const errorBox = document.createElement("div");
    errorBox.className = "errorBox";

    block.appendChild(select);
    block.appendChild(span);
    block.appendChild(exprMode);
    block.appendChild(leftOperandUi.element);
    block.appendChild(operator);
    block.appendChild(rightOperandUi.element);
    block.appendChild(errorBox);

    select.addEventListener("change", function () {
      blockObj.variable = select.value;
      touch();
    });

    exprMode.addEventListener("change", function () {
      blockObj.expression.mode = exprMode.value;
      touch();
    });

    operator.addEventListener("change", function () {
      blockObj.expression.operator = operator.value;
      touch();
    });

    block.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", `move:${blockObj.id}`);
      e.dataTransfer.effectAllowed = "move";
    });

    const ui = {
      block,
      errorBox,
      select,
      exprMode,
      operator,
      leftOperandElement: leftOperandUi.element,
      rightOperandElement: rightOperandUi.element,
      leftOperandUi,
      rightOperandUi,
    };
    domById.set(blockObj.id, ui);
    return ui;
  }

  throw new Error("Неизвестный тип блока " + blockObj.type);
}

function renderOperand(operandModel, operandUi) {
  operandUi.kind.value = operandModel.kind;
  operandUi.valueInput.value = operandModel.value;
  operandUi.variableSelect.value = operandModel.variable;

  updateOperandVariableSelection(operandModel, operandUi);
  operandUi.syncVisibility();
}

function renderBlock(blockObj) {
  const ui = ensureBlockDom(blockObj);

  if (blockObj.type === "varDecl") {
    ui.input.value = blockObj.raw;
  }

  if (blockObj.type === "assign") {
    blockObj.variable = updateSelectionOptions(ui.select, blockObj.variable);

    ui.exprMode.value = blockObj.expression.mode;

    renderOperand(blockObj.expression.left, ui.leftOperandUi);
    renderOperand(blockObj.expression.right, ui.rightOperandUi);

    const isBinary = blockObj.expression.mode === "binary";
    ui.operator.style.display = isBinary ? "" : "none";
    ui.rightOperandElement.style.display = isBinary ? "" : "none";
  }

  if (blockObj.errors.length > 0) {
    ui.errorBox.textContent = blockObj.errors.join(", ");
    ui.block.className = "blockError";
  } else {
    ui.errorBox.textContent = "";
    ui.block.className = "blockSuccess";
  }
}

function renderMemory(memory, memoryView) {
  for (const variable of memory) {
    const item = document.createElement("div");
    item.innerHTML = `<b>${variable[0]}</b>: <b>${variable[1]}</b>`;
    memoryView.appendChild(item);
  }
}

function appendLogs(text) {
  const item = document.createElement("div");
  item.innerHTML = text;
  memoryView.appendChild(item);
}

export function initUI() {
  initDnD(programDiv, touch)
  validateAndStoreErrors();
  render();
}
