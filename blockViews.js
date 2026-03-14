import { dnd, validateAndRender } from "./ui.js";

export const viewById = new Map();

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
  errorBox.style.display = "none";

  const icon = document.createElement("span");
  icon.textContent = "!";

  const tooltip = document.createElement("div");
  tooltip.className = "errorTooltip";

  errorBox.appendChild(icon);
  errorBox.appendChild(tooltip);

  return errorBox;
}

function makeOperandView(operandModel, parentBlockModel, operandType) {
  const rootEl = document.createElement("div");
  rootEl.className = "operandBlock";
  dnd.makeExpressionDropZone(rootEl, parentBlockModel, operandType);

  const literalInputEl = document.createElement("input");
  literalInputEl.type = "number";
  literalInputEl.placeholder = "0";
  literalInputEl.value = "";

  const childSlotEl = document.createElement("div");

  literalInputEl.addEventListener("input", () => {
    operandModel.value = literalInputEl.value;
    validateAndRender();
  });

  rootEl.appendChild(literalInputEl);
  rootEl.appendChild(childSlotEl);

  return { rootEl, literalInputEl, childSlotEl };
}

function makeLogicOperandView(parentBlockModel, operandType) {
  const rootEl = document.createElement("div");
  rootEl.className = "operandBlock";
  dnd.makeExpressionDropZone(rootEl, parentBlockModel, operandType);

  const childSlotEl = document.createElement("div");
  rootEl.appendChild(childSlotEl);
  return { rootEl, childSlotEl };
}

export const Views = {
  varDeclView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
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

    inputEl.addEventListener("input", () => {
      this.rawNames = inputEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = { blockEl, inputEl, errorBoxEl };
    viewById.set(this.id, blockView);
    return blockView;
  },

  assignView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const selectEl = document.createElement("select");
    const spanEl = document.createElement("span");
    spanEl.textContent = " = ";

    const operandView = makeOperandView(this.expression, this, "expression");
    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(selectEl);
    blockEl.appendChild(spanEl);
    blockEl.appendChild(operandView.rootEl);
    blockEl.appendChild(errorBoxEl);

    selectEl.addEventListener("change", () => {
      this.variable = selectEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = { blockEl, errorBoxEl, selectEl, operandView };
    viewById.set(this.id, blockView);
    return blockView;
  },

  arithView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const leftOperandView = makeOperandView(this.left, this, "left");

    const operatorEl = document.createElement("select");
    operatorEl.className = "exprOperator";
    operatorEl.innerHTML = `
      <option value="+">+</option>
      <option value="-">-</option>
      <option value="*">*</option>
      <option value="/">/</option>
      <option value="%">%</option>`;

    const rightOperandView = makeOperandView(this.right, this, "right");
    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(leftOperandView.rootEl);
    blockEl.appendChild(operatorEl);
    blockEl.appendChild(rightOperandView.rootEl);
    blockEl.appendChild(errorBoxEl);

    operatorEl.addEventListener("change", () => {
      this.operator = operatorEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = {
      blockEl,
      errorBoxEl,
      operatorEl,
      leftOperandView,
      rightOperandView,
    };
    viewById.set(this.id, blockView);
    return blockView;
  },

  varGetView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const selectEl = document.createElement("select");
    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(selectEl);
    blockEl.appendChild(errorBoxEl);

    selectEl.addEventListener("change", () => {
      this.variable = selectEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = { blockEl, selectEl, errorBoxEl };
    viewById.set(this.id, blockView);
    return blockView;
  },

  arrayDeclView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const labelEl = document.createElement("span");
    labelEl.textContent = "array ";

    const nameInputEl = document.createElement("input");
    nameInputEl.placeholder = "arr";

    const openBracketEl = document.createElement("span");
    openBracketEl.textContent = " [ ";

    const sizeInputEl = document.createElement("input");
    sizeInputEl.placeholder = "5";

    const closeBracketEl = document.createElement("span");
    closeBracketEl.textContent = " ] ";

    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(labelEl);
    blockEl.appendChild(nameInputEl);
    blockEl.appendChild(openBracketEl);
    blockEl.appendChild(sizeInputEl);
    blockEl.appendChild(closeBracketEl);
    blockEl.appendChild(errorBoxEl);

    nameInputEl.addEventListener("input", () => {
      this.name = nameInputEl.value.trim();
      validateAndRender();
    });

    sizeInputEl.addEventListener("input", () => {
      this.size = sizeInputEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = { blockEl, nameInputEl, sizeInputEl, errorBoxEl };
    viewById.set(this.id, blockView);
    return blockView;
  },

  arrayGetView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const selectEl = document.createElement("select");

    const openBracketEl = document.createElement("span");
    openBracketEl.textContent = " [ ";

    const indexView = makeOperandView(this.index, this, "index");

    const closeBracketEl = document.createElement("span");
    closeBracketEl.textContent = " ] ";

    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(selectEl);
    blockEl.appendChild(openBracketEl);
    blockEl.appendChild(indexView.rootEl);
    blockEl.appendChild(closeBracketEl);
    blockEl.appendChild(errorBoxEl);

    selectEl.addEventListener("change", () => {
      this.arrayName = selectEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = { blockEl, selectEl, indexView, errorBoxEl };
    viewById.set(this.id, blockView);
    return blockView;
  },

  arraySetView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const selectEl = document.createElement("select");

    const openBracketEl = document.createElement("span");
    openBracketEl.textContent = " [ ";

    const indexView = makeOperandView(this.index, this, "index");

    const closeBracketEl = document.createElement("span");
    closeBracketEl.textContent = " ] ";

    const equalsEl = document.createElement("span");
    equalsEl.textContent = " = ";

    const valueView = makeOperandView(this.value, this, "value");

    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(selectEl);
    blockEl.appendChild(openBracketEl);
    blockEl.appendChild(indexView.rootEl);
    blockEl.appendChild(closeBracketEl);
    blockEl.appendChild(equalsEl);
    blockEl.appendChild(valueView.rootEl);
    blockEl.appendChild(errorBoxEl);

    selectEl.addEventListener("change", () => {
      this.arrayName = selectEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = { blockEl, selectEl, indexView, valueView, errorBoxEl };
    viewById.set(this.id, blockView);
    return blockView;
  },

  compareView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const leftOperandView = makeOperandView(this.left, this, "left");

    const operatorEl = document.createElement("select");
    operatorEl.className = "exprOperator";
    operatorEl.innerHTML = `
      <option value=">">&gt;</option>
      <option value="<">&lt;</option>
      <option value="==">==</option>
      <option value="!=">!=</option>
      <option value=">=">&gt;=</option>
      <option value="<=">&lt;=</option>`;

    const rightOperandView = makeOperandView(this.right, this, "right");
    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(leftOperandView.rootEl);
    blockEl.appendChild(operatorEl);
    blockEl.appendChild(rightOperandView.rootEl);
    blockEl.appendChild(errorBoxEl);

    operatorEl.addEventListener("change", () => {
      this.operator = operatorEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = {
      blockEl,
      errorBoxEl,
      operatorEl,
      leftOperandView,
      rightOperandView,
    };

    viewById.set(this.id, blockView);
    return blockView;
  },

  ifView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const headerEl = document.createElement("div");
    headerEl.className = "whileIfHeader";

    const ifLabelEl = document.createElement("span");
    ifLabelEl.textContent = "if";

    const conditionSlotEl = document.createElement("div");
    conditionSlotEl.className = "whileIfBodyCanvas";
    dnd.makeConditionDropZone(conditionSlotEl, this);

    const thenLabelEl = document.createElement("span");
    thenLabelEl.textContent = "then";

    headerEl.appendChild(ifLabelEl);
    headerEl.appendChild(conditionSlotEl);
    headerEl.appendChild(thenLabelEl);

    const errorBoxEl = makeErrorBox();
    headerEl.appendChild(errorBoxEl);

    const thenCanvasEl = document.createElement("div");
    thenCanvasEl.className = "whileIfBodyCanvas";
    dnd.makeDropZone(thenCanvasEl, this);

    const elseLabelEl = document.createElement("div");
    elseLabelEl.textContent = "else";

    const elseCanvasEl = document.createElement("div");
    elseCanvasEl.className = "whileIfBodyCanvas";
    dnd.makeElseDropZone(elseCanvasEl, this);

    blockEl.appendChild(headerEl);
    blockEl.appendChild(thenCanvasEl);
    blockEl.appendChild(elseLabelEl);
    blockEl.appendChild(elseCanvasEl);

    makeDragStart(this, blockEl);

    const blockView = {
      blockEl,
      errorBoxEl,
      conditionSlotEl,
      thenCanvasEl,
      elseCanvasEl,
    };
    viewById.set(this.id, blockView);
    return blockView;
  },

  whileView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const headerEl = document.createElement("div");
    headerEl.className = "whileIfHeader";

    const whileLabelEl = document.createElement("span");
    whileLabelEl.textContent = "while";

    const conditionSlotEl = document.createElement("div");
    conditionSlotEl.className = "whileIFConditionSlot";
    dnd.makeConditionDropZone(conditionSlotEl, this);

    const doLabelEl = document.createElement("span");
    doLabelEl.textContent = "do";

    headerEl.appendChild(whileLabelEl);
    headerEl.appendChild(conditionSlotEl);
    headerEl.appendChild(doLabelEl);

    const errorBoxEl = makeErrorBox();
    headerEl.appendChild(errorBoxEl);

    const bodyCanvasEl = document.createElement("div");
    bodyCanvasEl.className = "whileIfBodyCanvas";
    dnd.makeDropZone(bodyCanvasEl, this);

    blockEl.appendChild(headerEl);
    blockEl.appendChild(bodyCanvasEl);

    makeDragStart(this, blockEl);

    const blockView = {
      blockEl,
      errorBoxEl,
      conditionSlotEl,
      bodyCanvasEl,
    };
    viewById.set(this.id, blockView);
    return blockView;
  },

  forView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const headerEl = document.createElement("div");
    headerEl.className = "forHeader";

    const initPartEl = document.createElement("span");
    initPartEl.className = "forInitPart";

    const varInputEl = document.createElement("input");
    varInputEl.type = "text";
    varInputEl.placeholder = "i";
    varInputEl.style.width = "50px";

    varInputEl.addEventListener("input", () => {
      this.initialVarName = varInputEl.value;
      validateAndRender();
    });

    const equalsSpanEl = document.createElement("span");
    equalsSpanEl.textContent = " = ";

    const initOperandViewEl = makeOperandView(
      this.initialValue,
      this,
      "initialValue",
    );

    initPartEl.appendChild(varInputEl);
    initPartEl.appendChild(equalsSpanEl);
    initPartEl.appendChild(initOperandViewEl.rootEl);

    const conditionSlotEl = document.createElement("div");
    conditionSlotEl.className = "forConditionSlot";
    dnd.makeConditionDropZone(conditionSlotEl, this);

    const incrementSlotEl = document.createElement("div");
    incrementSlotEl.className = "forIncrementSlot";
    dnd.makeStatementSlotDropZone(incrementSlotEl, this, "incrementChild");

    const forLabelEl = document.createElement("span");
    forLabelEl.textContent = "for";
    forLabelEl.className = "forSeparator";

    const separator1 = document.createElement("span");
    separator1.textContent = ";";
    separator1.className = "forSeparator";

    const separator2 = document.createElement("span");
    separator2.textContent = ";";
    separator2.className = "forSeparator";

    headerEl.appendChild(forLabelEl);
    headerEl.appendChild(initPartEl);
    headerEl.appendChild(separator1);
    headerEl.appendChild(conditionSlotEl);
    headerEl.appendChild(separator2);
    headerEl.appendChild(incrementSlotEl);

    const errorBoxEl = makeErrorBox();
    headerEl.appendChild(errorBoxEl);

    const bodyCanvasEl = document.createElement("div");
    bodyCanvasEl.className = "whileIfBodyCanvas";
    dnd.makeDropZone(bodyCanvasEl, this);

    blockEl.appendChild(headerEl);
    blockEl.appendChild(bodyCanvasEl);

    makeDragStart(this, blockEl);

    const blockView = {
      blockEl,
      errorBoxEl,
      varInput: varInputEl,
      initOperandView: initOperandViewEl,
      conditionSlot: conditionSlotEl,
      incrementSlot: incrementSlotEl,
      bodyCanvas: bodyCanvasEl,
    };
    viewById.set(this.id, blockView);
    return blockView;
  },

  booleanView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const selectEl = document.createElement("select");
    selectEl.innerHTML = `
    <option value="true">true</option>
    <option value="false">false</option>
  `;
    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(selectEl);
    blockEl.appendChild(errorBoxEl);

    selectEl.addEventListener("change", () => {
      this.value = selectEl.value === "true";
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = { blockEl, selectEl, errorBoxEl };
    viewById.set(this.id, blockView);
    return blockView;
  },

  logicView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const leftOperandView = makeLogicOperandView(this, "left");
    const operatorEl = document.createElement("select");
    operatorEl.className = "exprOperator";
    operatorEl.innerHTML = `
    <option value="&&">and</option>
    <option value="||">or</option>
  `;
    const rightOperandView = makeLogicOperandView(this, "right");
    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(leftOperandView.rootEl);
    blockEl.appendChild(operatorEl);
    blockEl.appendChild(rightOperandView.rootEl);
    blockEl.appendChild(errorBoxEl);

    operatorEl.addEventListener("change", () => {
      this.operator = operatorEl.value;
      validateAndRender();
    });

    makeDragStart(this, blockEl);

    const blockView = {
      blockEl,
      errorBoxEl,
      operatorEl,
      leftOperandView,
      rightOperandView,
    };
    viewById.set(this.id, blockView);
    return blockView;
  },

  notView() {
    const blockEl = document.createElement("div");
    blockEl.className = "block blockSuccess";
    blockEl.draggable = true;

    const spanEl = document.createElement("span");
    spanEl.textContent = "NOT";

    const operandView = makeLogicOperandView(this, "operand");
    const errorBoxEl = makeErrorBox();

    blockEl.appendChild(spanEl);
    blockEl.appendChild(operandView.rootEl);
    blockEl.appendChild(errorBoxEl);

    makeDragStart(this, blockEl);

    const blockView = { blockEl, errorBoxEl, operandView };
    viewById.set(this.id, blockView);
    return blockView;
  },
};
