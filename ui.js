import { program } from "./state.js";
import { validateProgram } from "./validate.js";
import { runProgram } from "./engine.js";
import { DnD } from "./dnd.js";
import { parseNames, isValidVarName } from "./utils.js";

const programDiv = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const memoryView = document.getElementById("logContent");
const dnd = new DnD(programDiv, validateAndRender);

const viewById = new Map();

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
    validateAndRender();
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

    const expectedChildElement = viewById.get(childBlock.id).block;
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

function renderBlockContent(blockModel) {
  const blockView = viewById.get(blockModel.id);

  if (blockModel.type === "assign") {
    renderOperand(blockModel.expression, blockView.operandUi, blockModel.children[0]);
    return;
  }

  if (blockModel.type === "arith") {
    renderOperand(blockModel.left, blockView.leftOperandUi, blockModel.children[0]);
    renderOperand(blockModel.right, blockView.rightOperandUi, blockModel.children[1]);
    return;
  }

  if (blockModel.type === "if") {
    renderOperand(
      blockModel.left,
      blockView.leftOperandUi,
      blockModel.conditionChildren[0],
    );
    renderOperand(
      blockModel.right,
      blockView.rightOperandUi,
      blockModel.conditionChildren[1],
    );
    syncStatementsOrder(blockModel, blockView.thenCanvas);
  }
}

function syncStatementsOrder(containerModel, containerElement) {
  const desired = [];

  for (const blockModel of containerModel.children) {
    renderBlock(blockModel);
    desired.push(viewById.get(blockModel.id).block);
  }

  syncDomOrder(containerElement, desired);

  for (const blockModel of containerModel.children) {
    renderBlockContent(blockModel);
  }
}

function render() {
  syncStatementsOrder(program, programDiv);
}

function validateAndRender() {
  validateAndStoreErrors();
  render();
}

function makeDragStart(blockModel, blockEl) {
  blockEl.addEventListener("dragstart", function (e) {
    e.dataTransfer.setData("text/plain", `move:${blockModel.id}`);
    e.dataTransfer.effectAllowed = "move";
  });
}

function makeErrorBox() {
  const errorBox = document.createElement("div");
  errorBox.className = "errorBox";
  return errorBox;
}

function ensureBlockDom(blockModel) {
  if (viewById.has(blockModel.id)) return viewById.get(blockModel.id);

  if (blockModel.type === "varDecl") {
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
      blockModel.raw = input.value;
      validateAndRender();
    });

    makeDragStart(blockModel, block);

    const blockView = { block, input, errorBox };
    viewById.set(blockModel.id, blockView);
    return blockView;
  }

  if (blockModel.type === "assign") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

    const select = document.createElement("select");
    const span = document.createElement("span");
    span.textContent = " = ";

    const operandUi = makeOperandDom(blockModel.expression, blockModel, "expression");
    const errorBox = makeErrorBox();

    block.appendChild(select);
    block.appendChild(span);
    block.appendChild(operandUi.element);
    block.appendChild(errorBox);

    select.addEventListener("change", function () {
      blockModel.variable = select.value;
      validateAndRender();
    });

    makeDragStart(blockModel, block);

    const blockView = { block, errorBox, select, operandUi };
    viewById.set(blockModel.id, blockView);
    return blockView;
  }

  if (blockModel.type === "arith") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

    const leftOperandUi = makeOperandDom(blockModel.left, blockModel, "left");

    const operator = document.createElement("select");
    operator.className = "exprOperator";
    operator.innerHTML = `
      <option value="+">+</option>
      <option value="-">-</option>
      <option value="*">*</option>
      <option value="/">/</option>
      <option value="%">%</option>`;

    const rightOperandUi = makeOperandDom(blockModel.right, blockModel, "right");
    const errorBox = makeErrorBox();

    block.appendChild(leftOperandUi.element);
    block.appendChild(operator);
    block.appendChild(rightOperandUi.element);
    block.appendChild(errorBox);

    operator.addEventListener("change", function () {
      blockModel.operator = operator.value;
      validateAndRender();
    });

    makeDragStart(blockModel, block);

    const blockView = { block, errorBox, operator, leftOperandUi, rightOperandUi };
    viewById.set(blockModel.id, blockView);
    return blockView;
  }

  if (blockModel.type === "varGet") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

    const select = document.createElement("select");
    const errorBox = makeErrorBox();

    block.appendChild(select);
    block.appendChild(errorBox);

    select.addEventListener("change", function () {
      blockModel.variable = select.value;
      validateAndRender();
    });

    makeDragStart(blockModel, block);

    const blockView = { block, select, errorBox };
    viewById.set(blockModel.id, blockView);
    return blockView;
  }

  if (blockModel.type === "if") {
    const block = document.createElement("div");
    block.className = "blockSuccess";
    block.draggable = true;

    const header = document.createElement("div");
    header.className = "ifHeader";

    const ifLabel = document.createElement("span");
    ifLabel.textContent = "if";

    const leftOperandUi = makeOperandDom(blockModel.left, blockModel, "condLeft");

    const comparator = document.createElement("select");
    comparator.className = "exprOperator";
    comparator.innerHTML = `
      <option value=">">&gt;</option>
      <option value="<">&lt;</option>
      <option value="==">==</option>
      <option value="!=">!=</option>
      <option value=">=">&gt;=</option>
      <option value="<=">&lt;=</option>`;

    const rightOperandUi = makeOperandDom(blockModel.right, blockModel, "condRight");

    const thenLabel = document.createElement("span");
    thenLabel.textContent = "then";

    header.appendChild(ifLabel);
    header.appendChild(leftOperandUi.element);
    header.appendChild(comparator);
    header.appendChild(rightOperandUi.element);
    header.appendChild(thenLabel);

    const thenCanvas = document.createElement("div");
    thenCanvas.className = "ifBodyCanvas";
    dnd.makeDropZone(thenCanvas, blockModel);

    const errorBox = makeErrorBox();

    block.appendChild(header);
    block.appendChild(thenCanvas);
    block.appendChild(errorBox);

    comparator.addEventListener("change", function () {
      blockModel.comparator = comparator.value;
      validateAndRender();
    });

    makeDragStart(blockModel, block);

    const blockView = {
      block,
      errorBox,
      comparator,
      leftOperandUi,
      rightOperandUi,
      thenCanvas,
    };
    viewById.set(blockModel.id, blockView);
    return blockView;
  }

  throw new Error("Unknown block type " + blockModel.type);
}

function renderBlock(blockModel) {
  const blockView = ensureBlockDom(blockModel);

  if (blockModel.type === "varDecl") {
    blockView.input.value = blockModel.raw;
  } else if (blockModel.type === "assign") {
    blockModel.variable = updateSelectionOptions(blockView.select, blockModel.variable);
  } else if (blockModel.type === "arith") {
    blockView.operator.value = blockModel.operator;
  } else if (blockModel.type === "varGet") {
    blockModel.variable = updateSelectionOptions(blockView.select, blockModel.variable);
  } else if (blockModel.type === "if") {
    blockView.comparator.value = blockModel.comparator;
  }

  if (blockModel.errors.length > 0) {
    blockView.errorBox.textContent = blockModel.errors.join(", ");
    blockView.block.className = "blockError";
  } else {
    blockView.errorBox.textContent = "";
    blockView.block.className = "blockSuccess";
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
