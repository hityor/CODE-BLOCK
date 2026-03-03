import { makeArithmeticModel, program } from "./state.js";
import { validateProgram } from "./validate.js";
import { runProgram } from "./engine.js";
import { DnD } from "./dnd.js";
import { parseNames, isValidVarName } from "./utils.js";

const programDiv = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const memoryView = document.getElementById("logContent");
const dnd = new DnD(programDiv, touch);

const domById = new Map();

export function makeOperandDom(operandModel, parent, operandType) {
  const element = document.createElement("div");
  element.className = "operandBlock";

  dnd.makeArithDropZone(element, parent, operandType);

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.placeholder = "0";
  valueInput.value = "";

  //const variableSelect = document.createElement("select");

  valueInput.addEventListener("input", function () {
    operandModel.value = valueInput.value;
    touch();
  });

  // variableSelect.addEventListener("change", function () {
  //   operandModel.variable = variableSelect.value;
  //   touch();
  // });

  element.appendChild(valueInput);
  //element.appendChild(variableSelect);

  return { element, valueInput };
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
  for (const block of program.children)
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
  for (const block of program.children)
    block.errors = errorsById.get(block.id) ?? [];
}

function render() {
  for (const blockObj of program.children) {
    renderBlock(blockObj);
    for (const child of blockObj.children) renderBlock(child);
  }
  syncBlocksOrder(program, programDiv);
}

function syncBlocksOrder(blocks, blocksDiv) {
  const desired = [];

  for (const blockObj of blocks.children) {
    const ui = domById.get(blockObj.id);
    if (ui?.block) desired.push(ui.block);

    if (blockObj.children.length != 0) {
      if (blockObj.type === "assign") {
        ui.operandElement.innerHTML = "";
        syncBlocksOrder(blockObj, ui.operandElement);
      } else if (blockObj.type === "arith") {
        if (blockObj.children.length > 0) {
          if (blockObj.children[0]) {
            const leftChild = blockObj.children[0];
            renderBlock(leftChild);
            ui.leftOperandElement.innerHTML = "";
            ui.leftOperandElement.appendChild(domById.get(leftChild.id).block);
          }
        }
        if (blockObj.children.length > 1) {
          if (blockObj.children[1]) {
            const rightChild = blockObj.children[1];
            renderBlock(rightChild);
            ui.rightOperandElement.innerHTML = "";
            ui.rightOperandElement.appendChild(
              domById.get(rightChild.id).block,
            );
          }
        }
      }
    }

    let cursor = blocksDiv.firstChild;

    for (const blockEl of desired) {
      if (cursor === blockEl) cursor = cursor.nextSibling;
      else blocksDiv.insertBefore(blockEl, cursor);
    }
  }
}

function touch() {
  validateAndStoreErrors();
  render();
}

function ensureBlockDom(blockObj) {
  if (domById.has(blockObj.id)) return domById.get(blockObj.id);

  switch (blockObj.type) {
    case "varDecl": {
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
    case "assign": {
      const block = document.createElement("div");
      block.className = "blockSuccess";
      block.draggable = true;

      const select = document.createElement("select");

      const span = document.createElement("span");
      span.textContent = " = ";

      const operandUi = makeOperandDom(
        blockObj.expression,
        blockObj,
        "expression",
      );

      const errorBox = document.createElement("div");
      errorBox.className = "errorBox";

      block.appendChild(select);
      block.appendChild(span);
      block.appendChild(operandUi.element);
      block.appendChild(errorBox);

      select.addEventListener("change", function () {
        blockObj.variable = select.value;
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
        operandElement: operandUi.element,
        operandUi,
      };
      domById.set(blockObj.id, ui);
      return ui;
    }
    case "arith": {
      const block = document.createElement("div");
      block.className = "blockSuccess";
      block.draggable = true;

      const exprMode = document.createElement("select");
      exprMode.className = "exprMode";
      exprMode.innerHTML = `
      <option value="single">value</option>
      <option value="binary">binary</option>`;

      const leftOperandUi = makeOperandDom(blockObj.left, blockObj, "left");
      const operator = document.createElement("select");
      operator.className = "exprOperator";
      operator.innerHTML = `
      <option value="+">+</option>
      <option value="-">-</option>
      <option value="*">*</option>
      <option value="/">/</option>
      <option value="%">%</option>`;

      const rightOperandUi = makeOperandDom(blockObj.right, blockObj, "right");

      const errorBox = document.createElement("div");
      errorBox.className = "errorBox";

      block.appendChild(leftOperandUi.element);
      block.appendChild(operator);
      block.appendChild(rightOperandUi.element);
      block.appendChild(errorBox);

      operator.addEventListener("change", function () {
        blockObj.operator = operator.value;
        touch();
      });

      block.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", `move:${blockObj.id}`);
        e.dataTransfer.effectAllowed = "move";
      });

      const ui = {
        block,
        errorBox,
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
  }

  throw new Error("Неизвестный тип блока " + blockObj.type);
}

function renderOperand(operandModel, operandUi) {
  if (operandUi.valueInput.value !== operandModel.value) {
    operandUi.valueInput.value = operandModel.value;
  }
  //operandUi.variableSelect.value = operandModel.variable;

  //updateOperandVariableSelection(operandModel, operandUi);
}

function renderBlock(blockObj) {
  const ui = ensureBlockDom(blockObj);

  switch (blockObj.type) {
    case "varDecl": {
      ui.input.value = blockObj.raw;
      break;
    }
    case "assign": {
      blockObj.variable = updateSelectionOptions(ui.select, blockObj.variable);
      break;
    }
    case "arith": {
      renderOperand(blockObj.left, ui.leftOperandUi);
      renderOperand(blockObj.right, ui.rightOperandUi);
      break;
    }
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
  dnd.init();
  dnd.makeDropZone(programDiv);
  validateAndStoreErrors();
  render();
}
