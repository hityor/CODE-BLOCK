import { program } from "./state.js";
import { validateProgram } from "./validate.js";
import { runProgram } from "./engine.js";
import { DnD } from "./dnd.js";
import { parseNames, isValidVarName } from "./utils.js";

const programDiv = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const memoryView = document.getElementById("logContent");
const dnd = new DnD(programDiv, touch);

const domById = new Map();

function walkBlock(block, visit) {
  visit(block);

  if (block.type === "assign" && block.children[0]) {
    walkBlock(block.children[0], visit);
  }

  if (block.type === "arith") {
    if (block.children[0]) walkBlock(block.children[0], visit);
    if (block.children[1]) walkBlock(block.children[1], visit);
  }

  if (block.type === "if") {
    if (block.conditionChildren[0]) walkBlock(block.conditionChildren[0], visit);
    if (block.conditionChildren[1]) walkBlock(block.conditionChildren[1], visit);
    for (const child of block.children) walkBlock(child, visit);
  }
}

function walkProgram(visit) {
  for (const block of program.children) walkBlock(block, visit);
}

export function makeOperandDom(operandModel, parent, operandType) {
  const element = document.createElement("div");
  element.className = "operandBlock";
  dnd.makeArithDropZone(element, parent, operandType);

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.placeholder = "0";
  valueInput.value = "";

  const childHost = document.createElement("div");

  valueInput.addEventListener("input", function () {
    operandModel.value = valueInput.value;
    touch();
  });

  element.appendChild(valueInput);
  element.appendChild(childHost);

  return { element, valueInput, childHost };
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

function collectDeclaredNames(container, names) {
  for (const block of container.children) {
    if (block.type === "varDecl") {
      for (const name of parseNames(block.raw)) {
        if (isValidVarName(name)) names.add(name);
      }
    }

    if (block.type === "if") {
      collectDeclaredNames(block, names);
    }
  }
}

function getDeclaredNames() {
  const names = new Set();
  collectDeclaredNames(program, names);
  return [...names];
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

function validateAndStoreErrors() {
  const errorsById = validateProgram(program);
  walkProgram((block) => {
    block.errors = errorsById.get(block.id) ?? [];
  });
}

function syncDomOrder(container, desiredElements) {
  let cursor = container.firstChild;
  for (const blockEl of desiredElements) {
    if (cursor === blockEl) {
      cursor = cursor.nextSibling;
    } else {
      container.insertBefore(blockEl, cursor);
    }
  }
}

function renderOperand(operandModel, operandUi, childBlock) {
  if (operandUi.valueInput.value !== operandModel.value) {
    operandUi.valueInput.value = operandModel.value;
  }

  const currentChildElement = operandUi.childHost.firstElementChild;

  if (childBlock) {
    renderBlock(childBlock);
    renderBlockContent(childBlock);
    operandUi.valueInput.style.display = "none";

    const expectedChildElement = domById.get(childBlock.id).block;
    if (currentChildElement !== expectedChildElement) {
      operandUi.childHost.innerHTML = "";
      operandUi.childHost.appendChild(expectedChildElement);
    }
  } else {
    operandUi.valueInput.style.display = "";
    if (currentChildElement) {
      operandUi.childHost.innerHTML = "";
    }
  }
}

function renderBlockContent(blockObj) {
  const ui = domById.get(blockObj.id);

  if (blockObj.type === "assign") {
    renderOperand(blockObj.expression, ui.operandUi, blockObj.children[0]);
    return;
  }

  if (blockObj.type === "arith") {
    renderOperand(blockObj.left, ui.leftOperandUi, blockObj.children[0]);
    renderOperand(blockObj.right, ui.rightOperandUi, blockObj.children[1]);
    return;
  }

  if (blockObj.type === "if") {
    renderOperand(
      blockObj.left,
      ui.leftOperandUi,
      blockObj.conditionChildren[0],
    );
    renderOperand(
      blockObj.right,
      ui.rightOperandUi,
      blockObj.conditionChildren[1],
    );
    syncStatementsOrder(blockObj, ui.thenCanvas);
  }
}

function syncStatementsOrder(containerModel, containerElement) {
  const desired = [];

  for (const blockObj of containerModel.children) {
    renderBlock(blockObj);
    desired.push(domById.get(blockObj.id).block);
  }

  syncDomOrder(containerElement, desired);

  for (const blockObj of containerModel.children) {
    renderBlockContent(blockObj);
  }
}

function render() {
  syncStatementsOrder(program, programDiv);
}

function touch() {
  validateAndStoreErrors();
  render();
}

function makeDragStart(blockObj, blockEl) {
  blockEl.addEventListener("dragstart", function (e) {
    e.dataTransfer.setData("text/plain", `move:${blockObj.id}`);
    e.dataTransfer.effectAllowed = "move";
  });
}

function makeErrorBox() {
  const errorBox = document.createElement("div");
  errorBox.className = "errorBox";
  return errorBox;
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

    const errorBox = makeErrorBox();

    block.appendChild(type);
    block.appendChild(input);
    block.appendChild(errorBox);

    input.addEventListener("input", function () {
      blockObj.raw = input.value;
      touch();
    });

    makeDragStart(blockObj, block);

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

    const operandUi = makeOperandDom(blockObj.expression, blockObj, "expression");
    const errorBox = makeErrorBox();

    block.appendChild(select);
    block.appendChild(span);
    block.appendChild(operandUi.element);
    block.appendChild(errorBox);

    select.addEventListener("change", function () {
      blockObj.variable = select.value;
      touch();
    });

    makeDragStart(blockObj, block);

    const ui = { block, errorBox, select, operandUi };
    domById.set(blockObj.id, ui);
    return ui;
  }

  if (blockObj.type === "arith") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

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
    const errorBox = makeErrorBox();

    block.appendChild(leftOperandUi.element);
    block.appendChild(operator);
    block.appendChild(rightOperandUi.element);
    block.appendChild(errorBox);

    operator.addEventListener("change", function () {
      blockObj.operator = operator.value;
      touch();
    });

    makeDragStart(blockObj, block);

    const ui = { block, errorBox, operator, leftOperandUi, rightOperandUi };
    domById.set(blockObj.id, ui);
    return ui;
  }

  if (blockObj.type === "varGet") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

    const select = document.createElement("select");
    const errorBox = makeErrorBox();

    block.appendChild(select);
    block.appendChild(errorBox);

    select.addEventListener("change", function () {
      blockObj.variable = select.value;
      touch();
    });

    makeDragStart(blockObj, block);

    const ui = { block, select, errorBox };
    domById.set(blockObj.id, ui);
    return ui;
  }

  if (blockObj.type === "if") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

    const header = document.createElement("div");
    header.className = "ifHeader";

    const ifLabel = document.createElement("span");
    ifLabel.textContent = "if";

    const leftOperandUi = makeOperandDom(blockObj.left, blockObj, "condLeft");

    const comparator = document.createElement("select");
    comparator.className = "exprOperator";
    comparator.innerHTML = `
      <option value=">">&gt;</option>
      <option value="<">&lt;</option>
      <option value="==">==</option>
      <option value="!=">!=</option>
      <option value=">=">&gt;=</option>
      <option value="<=">&lt;=</option>`;

    const rightOperandUi = makeOperandDom(blockObj.right, blockObj, "condRight");

    const thenLabel = document.createElement("span");
    thenLabel.textContent = "then";

    header.appendChild(ifLabel);
    header.appendChild(leftOperandUi.element);
    header.appendChild(comparator);
    header.appendChild(rightOperandUi.element);
    header.appendChild(thenLabel);

    const thenCanvas = document.createElement("div");
    thenCanvas.className = "ifBodyCanvas";
    dnd.makeDropZone(thenCanvas, blockObj);

    const errorBox = makeErrorBox();

    block.appendChild(header);
    block.appendChild(thenCanvas);
    block.appendChild(errorBox);

    comparator.addEventListener("change", function () {
      blockObj.comparator = comparator.value;
      touch();
    });

    makeDragStart(blockObj, block);

    const ui = {
      block,
      errorBox,
      comparator,
      leftOperandUi,
      rightOperandUi,
      thenCanvas,
    };
    domById.set(blockObj.id, ui);
    return ui;
  }

  throw new Error("Unknown block type " + blockObj.type);
}

function renderBlock(blockObj) {
  const ui = ensureBlockDom(blockObj);

  if (blockObj.type === "varDecl") {
    ui.input.value = blockObj.raw;
  } else if (blockObj.type === "assign") {
    blockObj.variable = updateSelectionOptions(ui.select, blockObj.variable);
  } else if (blockObj.type === "arith") {
    ui.operator.value = blockObj.operator;
  } else if (blockObj.type === "varGet") {
    blockObj.variable = updateSelectionOptions(ui.select, blockObj.variable);
  } else if (blockObj.type === "if") {
    ui.comparator.value = blockObj.comparator;
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
  dnd.makeDropZone(programDiv, program);
  validateAndStoreErrors();
  render();
}
