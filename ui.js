import { program } from "./state.js";
import { validateProgram } from "./validate.js";
import { runProgram } from "./engine.js";
import { DnD } from "./dnd.js";
import { parseNames, isValidVarName } from "./utils.js";

const programCanvasEl = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const memoryView = document.getElementById("logContent");
const dnd = new DnD(programCanvasEl, validateAndRender);

const viewById = new Map();

function getChildBlocks(blockModel) {
  const children = [];

  if (blockModel.type === "assign") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
  }

  if (blockModel.type === "arith") {
    if (blockModel.children[0]) children.push(blockModel.children[0]);
    if (blockModel.children[1]) children.push(blockModel.children[1]);
  }

  if (blockModel.type === "if") {
    if (blockModel.conditionChildren[0])
      children.push(blockModel.conditionChildren[0]);
    if (blockModel.conditionChildren[1])
      children.push(blockModel.conditionChildren[1]);

    for (const child of blockModel.children) children.push(child);
  }

  return children;
}

function walkBlockTree(blockModel, visit) {
  visit(blockModel);

  for (const child of getChildBlocks(blockModel)) {
    walkBlockTree(child, visit);
  }
}

function walkProgramTree(visit) {
  for (const blockModel of program.children) walkBlockTree(blockModel, visit);
}

export function makeOperandView(operandModel, parentBlockModel, operandType) {
  const rootEl = document.createElement("div");
  rootEl.className = "operandBlock";
  dnd.makeExpressionDropZone(rootEl, parentBlockModel, operandType);

  const literalInputEl = document.createElement("input");
  literalInputEl.type = "text";
  literalInputEl.placeholder = "0";
  literalInputEl.value = "";

  const childSlotEl = document.createElement("div");

  literalInputEl.addEventListener("input", function () {
    operandModel.value = literalInputEl.value;
    validateAndRender();
  });

  rootEl.appendChild(literalInputEl);
  rootEl.appendChild(childSlotEl);

  return { rootEl, literalInputEl, childSlotEl };
}

runBtn.addEventListener("click", function () {
  runProgram(program, {
    parseNames,
    validateAndStoreErrors,
    render: renderProgram,
    appendLogs,
    renderMemory,
    memoryView,
  });
});

function collectDeclaredNames(containerModel, declaredNames) {
  for (const blockModel of containerModel.children) {
    if (blockModel.type === "varDecl") {
      for (const name of parseNames(blockModel.raw)) {
        if (isValidVarName(name)) declaredNames.add(name);
      }
    }

    if (blockModel.type === "if") {
      collectDeclaredNames(blockModel, declaredNames);
    }
  }
}

function getDeclaredNames() {
  const declaredNames = new Set();
  collectDeclaredNames(program, declaredNames);
  return [...declaredNames];
}

function syncVariableOptions(varSelectEl, preferredName) {
  const previousValue = preferredName ?? varSelectEl.value;

  const names = getDeclaredNames();
  varSelectEl.innerHTML = "";

  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    varSelectEl.appendChild(option);
  }

  if (previousValue && names.includes(previousValue)) {
    varSelectEl.value = previousValue;
    return previousValue;
  }

  if (names.length > 0) {
    varSelectEl.value = names[0];
    return names[0];
  }

  return "";
}

function validateAndStoreErrors() {
  const errorsById = validateProgram(program);
  walkProgramTree((blockModel) => {
    blockModel.errors = errorsById.get(blockModel.id) ?? [];
  });
}

function reorderChildren(containerEl, orderedChildEls) {
  let cursor = containerEl.firstChild;
  for (const blockEl of orderedChildEls) {
    if (cursor === blockEl) {
      cursor = cursor.nextSibling;
    } else {
      containerEl.insertBefore(blockEl, cursor);
    }
  }
}

function renderOperandView(operandModel, operandView, childBlockModel) {
  if (operandView.literalInputEl.value !== operandModel.value) {
    operandView.literalInputEl.value = operandModel.value;
  }

  const currentChildEl = operandView.childSlotEl.firstElementChild;

  if (childBlockModel) {
    renderBlockShell(childBlockModel);
    renderBlockBody(childBlockModel);
    operandView.literalInputEl.style.display = "none";

    const expectedChildEl = viewById.get(childBlockModel.id).blockEl;
    if (currentChildEl !== expectedChildEl) {
      operandView.childSlotEl.innerHTML = "";
      operandView.childSlotEl.appendChild(expectedChildEl);
    }
  } else {
    operandView.literalInputEl.style.display = "";
    if (currentChildEl) {
      operandView.childSlotEl.innerHTML = "";
    }
  }
}

function renderBlockBody(blockModel) {
  const blockView = viewById.get(blockModel.id);

  if (blockModel.type === "assign") {
    renderOperandView(
      blockModel.expression,
      blockView.operandView,
      blockModel.children[0],
    );
    return;
  }

  if (blockModel.type === "arith") {
    renderOperandView(
      blockModel.left,
      blockView.leftOperandView,
      blockModel.children[0],
    );
    renderOperandView(
      blockModel.right,
      blockView.rightOperandView,
      blockModel.children[1],
    );
    return;
  }

  if (blockModel.type === "if") {
    renderOperandView(
      blockModel.left,
      blockView.leftOperandView,
      blockModel.conditionChildren[0],
    );
    renderOperandView(
      blockModel.right,
      blockView.rightOperandView,
      blockModel.conditionChildren[1],
    );
    renderStatementList(blockModel, blockView.thenCanvasEl);
  }
}

function renderStatementList(containerModel, listEl) {
  const desired = [];

  for (const blockModel of containerModel.children) {
    renderBlockShell(blockModel);
    desired.push(viewById.get(blockModel.id).blockEl);
  }

  reorderChildren(listEl, desired);

  for (const blockModel of containerModel.children) {
    renderBlockBody(blockModel);
  }
}

function renderProgram() {
  renderStatementList(program, programCanvasEl);
}

function validateAndRender() {
  validateAndStoreErrors();
  renderProgram();
}

function makeDragStart(blockModel, blockEl) {
  blockEl.addEventListener("dragstart", function (e) {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", `move:${blockModel.id}`);
    e.dataTransfer.effectAllowed = "move";
  });
}

function makeErrorBox() {
  const errorBox = document.createElement("div");
  errorBox.className = "errorBox";
  return errorBox;
}

function makeVarDeclView(blockModel) {
  const blockEl = document.createElement("div");
  blockEl.className = "blockSuccess";
  blockEl.draggable = true;

  const typeEl = document.createElement("span");
  typeEl.textContent = "int ";

  const inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.placeholder = "a, b, c";

  const errorBoxEl = makeErrorBox();

  blockEl.appendChild(typeEl);
  blockEl.appendChild(inputEl);
  blockEl.appendChild(errorBoxEl);

  inputEl.addEventListener("input", function () {
    blockModel.raw = inputEl.value;
    validateAndRender();
  });

  makeDragStart(blockModel, blockEl);

  const blockView = { blockEl, inputEl, errorBoxEl };
  viewById.set(blockModel.id, blockView);
  return blockView;
}

function makeAssignView(blockModel) {
  const blockEl = document.createElement("div");
  blockEl.className = "blockSuccess";
  blockEl.draggable = true;

  const selectEl = document.createElement("select");
  const spanEl = document.createElement("span");
  spanEl.textContent = " = ";

  const operandView = makeOperandView(
    blockModel.expression,
    blockModel,
    "expression",
  );
  const errorBoxEl = makeErrorBox();

  blockEl.appendChild(selectEl);
  blockEl.appendChild(spanEl);
  blockEl.appendChild(operandView.rootEl);
  blockEl.appendChild(errorBoxEl);

  selectEl.addEventListener("change", function () {
    blockModel.variable = selectEl.value;
    validateAndRender();
  });

  makeDragStart(blockModel, blockEl);

  const blockView = { blockEl, errorBoxEl, selectEl, operandView };
  viewById.set(blockModel.id, blockView);
  return blockView;
}

function makeArithmeticView(blockModel) {
  const blockEl = document.createElement("div");
  blockEl.className = "blockSuccess";
  blockEl.draggable = true;

  const leftOperandView = makeOperandView(blockModel.left, blockModel, "left");

  const operatorEl = document.createElement("select");
  operatorEl.className = "exprOperator";
  operatorEl.innerHTML = `
    <option value="+">+</option>
    <option value="-">-</option>
    <option value="*">*</option>
    <option value="/">/</option>
    <option value="%">%</option>`;

  const rightOperandView = makeOperandView(
    blockModel.right,
    blockModel,
    "right",
  );
  const errorBoxEl = makeErrorBox();

  blockEl.appendChild(leftOperandView.rootEl);
  blockEl.appendChild(operatorEl);
  blockEl.appendChild(rightOperandView.rootEl);
  blockEl.appendChild(errorBoxEl);

  operatorEl.addEventListener("change", function () {
    blockModel.operator = operatorEl.value;
    validateAndRender();
  });

  makeDragStart(blockModel, blockEl);

  const blockView = {
    blockEl,
    errorBoxEl,
    operatorEl,
    leftOperandView,
    rightOperandView,
  };
  viewById.set(blockModel.id, blockView);
  return blockView;
}

function makeVarGetView(blockModel) {
  const blockEl = document.createElement("div");
  blockEl.className = "blockSuccess";
  blockEl.draggable = true;

  const selectEl = document.createElement("select");
  const errorBoxEl = makeErrorBox();

  blockEl.appendChild(selectEl);
  blockEl.appendChild(errorBoxEl);

  selectEl.addEventListener("change", function () {
    blockModel.variable = selectEl.value;
    validateAndRender();
  });

  makeDragStart(blockModel, blockEl);

  const blockView = { blockEl, selectEl, errorBoxEl };
  viewById.set(blockModel.id, blockView);
  return blockView;
}

function makeIfView(blockModel) {
  const blockEl = document.createElement("div");
  blockEl.className = "blockSuccess";
  blockEl.draggable = true;

  const headerEl = document.createElement("div");
  headerEl.className = "ifHeader";

  const ifLabelEl = document.createElement("span");
  ifLabelEl.textContent = "if";

  const leftOperandView = makeOperandView(
    blockModel.left,
    blockModel,
    "condLeft",
  );

  const comparatorEl = document.createElement("select");
  comparatorEl.className = "exprOperator";
  comparatorEl.innerHTML = `
    <option value=">">&gt;</option>
    <option value="<">&lt;</option>
    <option value="==">==</option>
    <option value="!=">!=</option>
    <option value=">=">&gt;=</option>
    <option value="<=">&lt;=</option>`;

  const rightOperandView = makeOperandView(
    blockModel.right,
    blockModel,
    "condRight",
  );

  const thenLabelEl = document.createElement("span");
  thenLabelEl.textContent = "then";

  headerEl.appendChild(ifLabelEl);
  headerEl.appendChild(leftOperandView.rootEl);
  headerEl.appendChild(comparatorEl);
  headerEl.appendChild(rightOperandView.rootEl);
  headerEl.appendChild(thenLabelEl);

  const thenCanvasEl = document.createElement("div");
  thenCanvasEl.className = "ifBodyCanvas";
  dnd.makeDropZone(thenCanvasEl, blockModel);

  const errorBoxEl = makeErrorBox();

  blockEl.appendChild(headerEl);
  blockEl.appendChild(thenCanvasEl);
  blockEl.appendChild(errorBoxEl);

  comparatorEl.addEventListener("change", function () {
    blockModel.comparator = comparatorEl.value;
    validateAndRender();
  });

  makeDragStart(blockModel, blockEl);

  const blockView = {
    blockEl,
    errorBoxEl,
    comparatorEl,
    leftOperandView,
    rightOperandView,
    thenCanvasEl,
  };
  viewById.set(blockModel.id, blockView);
  return blockView;
}

function ensureBlockView(blockModel) {
  if (viewById.has(blockModel.id)) return viewById.get(blockModel.id);

  if (blockModel.type === "varDecl") {
    return makeVarDeclView(blockModel);
  }

  if (blockModel.type === "assign") {
    return makeAssignView(blockModel);
  }

  if (blockModel.type === "arith") {
    return makeArithmeticView(blockModel);
  }

  if (blockModel.type === "varGet") {
    return makeVarGetView(blockModel);
  }

  if (blockModel.type === "if") {
    return makeIfView(blockModel);
  }

  throw new Error("Unknown block type " + blockModel.type);
}

function renderBlockShell(blockModel) {
  const blockView = ensureBlockView(blockModel);

  if (blockModel.type === "varDecl") {
    blockView.inputEl.value = blockModel.raw;
  } else if (blockModel.type === "assign") {
    blockModel.variable = syncVariableOptions(
      blockView.selectEl,
      blockModel.variable,
    );
  } else if (blockModel.type === "arith") {
    blockView.operatorEl.value = blockModel.operator;
  } else if (blockModel.type === "varGet") {
    blockModel.variable = syncVariableOptions(
      blockView.selectEl,
      blockModel.variable,
    );
  } else if (blockModel.type === "if") {
    blockView.comparatorEl.value = blockModel.comparator;
  }

  if (blockModel.errors.length > 0) {
    blockView.errorBoxEl.textContent = blockModel.errors.join(", ");
    blockView.blockEl.className = "blockError";
  } else {
    blockView.errorBoxEl.textContent = "";
    blockView.blockEl.className = "blockSuccess";
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
  dnd.makeDropZone(programCanvasEl, program);
  validateAndStoreErrors();
  renderProgram();
}
