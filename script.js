// ==== DOM REFS ====
const programDiv = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const memoryView = document.getElementById("logContent");

// ==== STATE ====
const program = [];
let nextId = 1;
const domById = new Map();

// ==== UI ====
function createOperandBlock() {
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
  updateSelectionOptions(variableSelect);

  const model = {
    kind: "const",
    value: "0",
    variable: variableSelect.value,
  };

  function syncVisibility() {
    const isConst = model.kind === "const";
    valueInput.style.display = isConst ? "" : "none";
    variableSelect.style.display = isConst ? "none" : "";
  }

  kind.addEventListener("change", function () {
    model.kind = kind.value;
    syncVisibility();
    touch();
  });

  valueInput.addEventListener("input", function () {
    model.value = valueInput.value;
    touch();
  });

  variableSelect.addEventListener("change", function () {
    model.variable = variableSelect.value;
    touch();
  });

  element.appendChild(kind);
  element.appendChild(valueInput);
  element.appendChild(variableSelect);
  syncVisibility();

  return {
    element,
    model,
    ui: { kind, valueInput, variableSelect, syncVisibility },
  };
}

// Кнопка RUN
runBtn.addEventListener("click", function () {
  run();
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

// ==== ENGINE ====
function operandToAst(operand) {
  if (operand.kind === "const")
    return new IntegerLiteral(Number(operand.value));
  return new VariableExpr(operand.variable);
}

function buildExpressionAst(assignBlock) {
  const expression = assignBlock.expression;
  const left = operandToAst(expression.left);

  if (expression.mode === "single") return left;

  const right = operandToAst(expression.right);
  return new ArithmeticExpr(expression.operator, left, right);
}

function buildAstFromProgram() {
  const statements = [];

  for (const block of program) {
    if (block.type === "varDecl") {
      const names = parseNames(block.raw);
      for (const name of names) {
        statements.push(new DeclareStatement(name));
      }
    }

    if (block.type === "assign") {
      statements.push(
        new AssignStatement(block.variable, buildExpressionAst(block)),
      );
    }
  }

  return new BlockStatement(statements);
}

function validateOperand(operand, declared, errors, sideName) {
  if (operand.kind === "const") {
    const n = Number(operand.value);
    if (operand.value === "") errors.push(`Пустое ${sideName} значение`);
    else if (Number.isNaN(n)) errors.push(`${sideName} должно быть числом`);
    else if (!Number.isInteger(n)) errors.push(`${sideName} должно быть целым`);
    return;
  }

  if (!operand.variable) {
    errors.push(`Не выбрана ${sideName} переменная`);
    return;
  }

  if (!declared.has(operand.variable)) {
    errors.push(`Не объявлена ${sideName} переменная: ${operand.variable}`);
  }
}

function validateProgram() {
  const errorsById = new Map();
  const declared = new Set();

  for (const block of program) {
    const errors = [];

    if (block.type === "varDecl") {
      const names = parseNames(block.raw);
      for (const name of names)
        if (!isValidVarName(name)) errors.push(`Некорректное имя: ${name}`);
        else if (declared.has(name)) errors.push(`Дубликат: ${name}`);
        else declared.add(name);
    }

    if (block.type === "assign") {
      if (!block.variable) errors.push("Не выбрана переменная");
      else if (!declared.has(block.variable))
        errors.push(`Не объявлена: ${block.variable}`);

      validateOperand(block.expression.left, declared, errors, "left");

      if (block.expression.mode === "binary") {
        validateOperand(block.expression.right, declared, errors, "right");

        if (
          (block.expression.operator === "/" ||
            block.expression.operator === "%") &&
          block.expression.right.kind === "const"
        ) {
          const rightValue = Number(block.expression.right.value);
          if (!Number.isNaN(rightValue) && rightValue === 0) {
            errors.push("Деление на ноль");
          }
        }
      } else if (block.expression.mode !== "single") {
        errors.push("Некорректный режим выражения");
      }
    }

    errorsById.set(block.id, errors);
  }

  return errorsById;
}

function validateAndStoreErrors() {
  const errorsById = validateProgram();
  for (const block of program) block.errors = errorsById.get(block.id) ?? [];
}

function render() {
  for (const blockObj of program) renderBlock(blockObj);
  syncCanvasOrder();
}

function run() {
  memoryView.innerHTML = "";

  validateAndStoreErrors()
  render()

  if (program.some((b) => b.errors.length > 0)) {
    appendLogs("Есть ошибки");
    return;
  }

  const ast = buildAstFromProgram();
  const compiler = new Tokenizer();
  const instructions = compiler.compile(ast);

  const executer = new Executer(instructions, {
    print: appendLogs,
    onMemory: (mem) => renderMemory(mem, memoryView),
  });

  executer.run();
}

function syncCanvasOrder() {
  for (const blockObj of program) {
    const ui = domById.get(blockObj.id);
    if (!ui) continue;

    programDiv.appendChild(ui.block);
  }
}

function touch() {
  validateAndStoreErrors()
  render()
}

function makeVarDeclModel() {
  return { id: nextId++, type: "varDecl", raw: "", errors: [] };
}

function makeAssignModel() {
  return {
    id: nextId++,
    type: "assign",
    variable: "",
    expression: {
      mode: "single",
      operator: "+",
      left: { kind: "const", value: "0", variable: "" },
      right: { kind: "const", value: "0", variable: "" },
    },
    errors: [],
  };
}

function addBlock(blockType) {
  if (blockType === "varDecl") program.push(makeVarDeclModel());
  else if (blockType == "assign") program.push(makeAssignModel());
  touch();
}

// ==== RENDER ====
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

    const leftOperand = createOperandBlock();
    const operator = document.createElement("select");
    operator.className = "exprOperator";
    operator.innerHTML = `
      <option value="+">+</option>
      <option value="-">-</option>
      <option value="*">*</option>
      <option value="/">/</option>
      <option value="%">%</option>
    `;
    const rightOperand = createOperandBlock();

    const errorBox = document.createElement("div");
    errorBox.className = "errorBox";

    block.appendChild(select);
    block.appendChild(span);
    block.appendChild(exprMode);
    block.appendChild(leftOperand.element);
    block.appendChild(operator);
    block.appendChild(rightOperand.element);
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
      leftOperandElement: leftOperand.element,
      rightOperandElement: rightOperand.element,
      leftOperandUi: leftOperand.ui,
      rightOperandUi: rightOperand.ui,
    };
    domById.set(blockObj.id, ui);
    return ui;
  }

  throw new Error("Неизвестный тип блока " + blockObj.type);
}

function renderBlock(blockObj) {
  const ui = ensureBlockDom(blockObj);

  if (blockObj.type === "varDecl") {
    ui.input.value = blockObj.raw;
  }

  if (blockObj.type === "assign") {
    blockObj.variable = updateSelectionOptions(ui.select, blockObj.variable);

    ui.exprMode.value = blockObj.expression.mode;

    ui.leftOperandUi.kind.value = blockObj.expression.left.kind;
    ui.leftOperandUi.valueInput.value = blockObj.expression.left.value;
    ui.leftOperandUi.variableSelect.value = blockObj.expression.left.variable;
    ui.leftOperandUi.syncVisibility();

    ui.rightOperandUi.kind.value = blockObj.expression.right.kind;
    ui.rightOperandUi.valueInput.value = blockObj.expression.right.value;
    ui.rightOperandUi.variableSelect.value = blockObj.expression.right.variable;
    ui.rightOperandUi.syncVisibility();

    updateOperandVariableSelection(blockObj.expression.left, ui.leftOperandUi);
    updateOperandVariableSelection(
      blockObj.expression.right,
      ui.rightOperandUi,
    );

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

function renderBlocks() {
  for (const blockObj of program) {
    renderBlock(blockObj);
  }
}

function renderMemory(memory, memoryView) {
  for (const variable of memory) {
    const item = document.createElement("div");
    item.innerHTML = `<b>${variable[0]}</b>: <b>${variable[1]}</b>`;
    memoryView.appendChild(item);
  }
}

// ==== UTILS ====
function isValidVarName(name) {
  const regex = /^[A-Za-z_][A-Za-z0-9_]*$/;
  return regex.test(name);
}

function parseNames(text) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function appendLogs(text) {
  const item = document.createElement("div");
  item.innerHTML = text;
  memoryView.appendChild(item);
}
