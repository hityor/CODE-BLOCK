import { program } from "./program.js";
import { programCanvasEl } from "./ui.js";
import { viewById } from "./blockViews.js";
import { parseNames, isValidVarName } from "./utils.js";

function forEachBlock(container, callback) {
  if (container === program) {
    for (const child of program.children) {
      forEachBlock(child, callback);
    }
    return;
  }

  callback(container);
  const children = container.getAllChildren ? container.getAllChildren() : [];
  for (const child of children) {
    forEachBlock(child, callback);
  }
}

function collectDeclaredNames(declaredNames) {
  forEachBlock(program, (block) => {
    if (block.type === "varDecl") {
      for (const name of parseNames(block.rawNames)) {
        if (isValidVarName(name)) declaredNames.add(name);
      }
    }
  });
}

function collectDeclaredArrayNames(declaredArrayNames) {
  forEachBlock(program, (block) => {
    if (block.type === "arrayDecl" && block.name) {
      declaredArrayNames.add(block.name);
    }
  });
}

function getDeclaredNames() {
  const declaredNames = new Set();
  collectDeclaredNames(declaredNames);
  return [...declaredNames];
}

function getDeclaredArrayNames() {
  const declaredArrayNames = new Set();
  collectDeclaredArrayNames(declaredArrayNames);
  return [...declaredArrayNames];
}

function syncVariableOptions(varSelectEl, preferredName) {
  const previousValue = preferredName ?? varSelectEl.value;

  const names = getDeclaredNames(program);
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

function syncArrayOptions(selectEl, preferredName) {
  const previousValue = preferredName ?? selectEl.value;

  const names = getDeclaredArrayNames();
  selectEl.innerHTML = "";

  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    selectEl.appendChild(option);
  }

  if (previousValue && names.includes(previousValue)) {
    selectEl.value = previousValue;
    return previousValue;
  }

  if (names.length > 0) {
    selectEl.value = names[0];
    return names[0];
  }

  return "";
}

function ensureBlockView(blockModel) {
  if (viewById.has(blockModel.id)) return viewById.get(blockModel.id);

  return blockModel.getView(blockModel);
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

  while (cursor) {
    const next = cursor.nextSibling;
    containerEl.removeChild(cursor);
    cursor = next;
  }
}

function renderOperandView(operandModel, operandView, childBlockModel) {
  if (operandView.literalInputEl) {
    if (operandView.literalInputEl.value !== operandModel.value) {
      operandView.literalInputEl.value = operandModel.value;
    }
  }

  const currentChildEl = operandView.childSlotEl.firstElementChild;

  if (childBlockModel) {
    renderBlockShell(childBlockModel);
    renderBlockBody(childBlockModel);
    if (operandView.literalInputEl) {
      operandView.literalInputEl.style.display = "none";
    }

    const expectedChildEl = viewById.get(childBlockModel.id).blockEl;
    if (currentChildEl !== expectedChildEl) {
      operandView.childSlotEl.innerHTML = "";
      operandView.childSlotEl.appendChild(expectedChildEl);
    }
  } else {
    if (operandView.literalInputEl) {
      operandView.literalInputEl.style.display = "";
    }
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

  if (blockModel.type === "arrayGet") {
    renderOperandView(
      blockModel.index,
      blockView.indexView,
      blockModel.children[0],
    );
    return;
  }

  if (blockModel.type === "arraySet") {
    renderOperandView(
      blockModel.index,
      blockView.indexView,
      blockModel.children[0],
    );
    renderOperandView(
      blockModel.value,
      blockView.valueView,
      blockModel.children[1],
    );
    return;
  }

  if (blockModel.type === "compare") {
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
    const currentChildEl = blockView.conditionSlotEl.firstElementChild;

    if (blockModel.conditionChild) {
      renderBlockShell(blockModel.conditionChild);
      renderBlockBody(blockModel.conditionChild);

      const expectedChildEl = viewById.get(
        blockModel.conditionChild.id,
      ).blockEl;
      if (currentChildEl !== expectedChildEl) {
        blockView.conditionSlotEl.innerHTML = "";
        blockView.conditionSlotEl.appendChild(expectedChildEl);
      }
    } else if (currentChildEl) {
      blockView.conditionSlotEl.innerHTML = "";
    }

    renderCustomStatementList(blockModel.children, blockView.thenCanvasEl);
    renderCustomStatementList(blockModel.elseChildren, blockView.elseCanvasEl);
  }

  if (blockModel.type === "while") {
    const currentChildEl = blockView.conditionSlotEl.firstElementChild;

    if (blockModel.conditionChild) {
      renderBlockShell(blockModel.conditionChild);
      renderBlockBody(blockModel.conditionChild);

      const expectedChildEl = viewById.get(
        blockModel.conditionChild.id,
      ).blockEl;
      if (currentChildEl !== expectedChildEl) {
        blockView.conditionSlotEl.innerHTML = "";
        blockView.conditionSlotEl.appendChild(expectedChildEl);
      }
    } else if (currentChildEl) {
      blockView.conditionSlotEl.innerHTML = "";
    }

    renderCustomStatementList(blockModel.children, blockView.bodyCanvasEl);
  }

  if (blockModel.type === "logic") {
    renderOperandView(null, blockView.leftOperandView, blockModel.children[0]);
    renderOperandView(null, blockView.rightOperandView, blockModel.children[1]);
    return;
  }
  if (blockModel.type === "not") {
    renderOperandView(null, blockView.operandView, blockModel.children[0]);
    return;
  }
  if (blockModel.type === "boolean") {
    return;
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

function renderCustomStatementList(blocksContainer, listEl) {
  const desired = [];

  for (const blockModel of blocksContainer) {
    renderBlockShell(blockModel);
    desired.push(viewById.get(blockModel.id).blockEl);
  }

  reorderChildren(listEl, desired);

  for (const blockModel of blocksContainer) {
    renderBlockBody(blockModel);
  }
}

function renderBlockShell(blockModel) {
  const blockView = ensureBlockView(blockModel);

  if (blockModel.type === "varDecl") {
    blockView.inputEl.value = blockModel.rawNames;
  } else if (blockModel.type === "assign") {
    blockModel.variable = syncVariableOptions(
      blockView.selectEl,
      blockModel.variable,
    );
  } else if (blockModel.type === "arith")
    blockView.operatorEl.value = blockModel.operator;
  else if (blockModel.type === "varGet") {
    blockModel.variable = syncVariableOptions(
      blockView.selectEl,
      blockModel.variable,
    );
  } else if (blockModel.type === "arrayDecl") {
    blockView.nameInputEl.value = blockModel.name;
    blockView.sizeInputEl.value = blockModel.size;
  } else if (blockModel.type === "arrayGet") {
    blockModel.arrayName = syncArrayOptions(
      blockView.selectEl,
      blockModel.arrayName,
    );
  } else if (blockModel.type === "arraySet") {
    blockModel.arrayName = syncArrayOptions(
      blockView.selectEl,
      blockModel.arrayName,
    );
  } else if (blockModel.type === "compare")
    blockView.operatorEl.value = blockModel.operator;
  else if (blockModel.type === "boolean")
    blockView.selectEl.value = blockModel.value ? "true" : "false";
  else if (blockModel.type === "logic")
    blockView.operatorEl.value = blockModel.operator;
  else if (blockModel.type === "not") {
  }

  if (blockModel.errors.length > 0) {
    const tooltip = blockView.errorBoxEl.querySelector(".errorTooltip");
    tooltip.textContent = blockModel.errors.join("\n");

    blockView.errorBoxEl.style.display = "inline-flex";
    blockView.blockEl.className = "block blockError";
  } else {
    const tooltip = blockView.errorBoxEl.querySelector(".errorTooltip");
    tooltip.textContent = "";

    blockView.errorBoxEl.style.display = "none";
    blockView.blockEl.className = "block blockSuccess";
  }
}

export function renderProgram() {
  renderStatementList(program, programCanvasEl);
}
