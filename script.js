// ==== DOM REFS ====
const programDiv = document.getElementById("canvas");
const runBtn = document.getElementById("runBtn");
const memoryView = document.getElementById("logContent");

// ==== STATE ====
const program = [];
let memory = {};
let nextId = 1;

// ==== UI ====
function createVarBlock() {
  const block = document.createElement("div");
  block.className = "blockSuccess";
  block.draggable = true;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "a, b, c";

  const type = document.createElement("span");
  type.textContent = "int ";

  const errorBox = document.createElement("div");
  errorBox.className = "errorBox";

  const blockObj = {
    id: nextId++,
    type: "varDecl",
    raw: "",
    errors: [],
    ui: { block, errorBox, input },
  };

  program.push(blockObj);
  input.addEventListener("input", function () {
    blockObj.raw = input.value;

    run();
  });

  block.appendChild(type);
  block.appendChild(input);
  block.appendChild(errorBox);
  programDiv.appendChild(block);

  block.addEventListener("dragstart", function (e) {
    e.dataTransfer.setData("text/plain", `move:${blockObj.id}`);
    e.dataTransfer.effectAllowed = "move";
  });

  return block;
}

function createAssignBlock() {
  const block = document.createElement("div");
  block.className = "blockSuccess";
  block.draggable = true;

  const select = document.createElement("select");
  updateSelectionOptions(select);

  const span = document.createElement("span");
  span.textContent = " = ";

  const input = document.createElement("input");
  input.placeholder = 2;

  const errorBox = document.createElement("div");
  errorBox.className = "errorBox";

  const blockObj = {
    id: nextId++,
    type: "assign",
    variable: select.value,
    value: "",
    errors: [],
    ui: { block, errorBox, select, input },
  };
  program.push(blockObj);

  select.addEventListener("change", function () {
    blockObj.variable = select.value;
  });

  input.addEventListener("input", function () {
    blockObj.value = input.value;
  });

  block.appendChild(select);
  block.appendChild(span);
  block.appendChild(input);
  block.appendChild(errorBox);
  programDiv.appendChild(block);

  block.addEventListener("dragstart", function (e) {
    e.dataTransfer.setData("text/plain", `move:${blockObj.id}`);
    e.dataTransfer.effectAllowed = "move";
  });

  return block;
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

function updateSelectionOptions(select) {
  const previousValue = select.value;

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

function updateAllAssignSelections() {
  for (const blockObj of program) {
    if (blockObj.type == "assign") {
      const newVal = updateSelectionOptions(blockObj.ui.select);
      blockObj.variable = newVal;
    }
  }
}

// ==== ENGINE ====
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
      const n = Number(block.value);
      statements.push(
        new AssignStatement(block.variable, new IntegerLiteral(n)),
      );
    }
  }

  return new BlockStatement(statements);
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

      const n = Number(block.value);
      if (block.value === "") errors.push("Пустое значение");
      else if (Number.isNaN(n)) errors.push("Значение должно быть числом");
      else if (!Number.isInteger(n)) errors.push("Число должно быть целым");
    }

    errorsById.set(block.id, errors);
  }

  return errorsById;
}

function run() {
  memoryView.innerHTML = "";

  updateAllAssignSelections();

  const errorsById = validateProgram();
  for (const block of program) block.errors = errorsById.get(block.id) ?? [];

  renderBlocks();

  const hasErrors = program.some((b) => b.errors.length > 0);
  if (hasErrors) {
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

// ==== RENDER ====
function renderBlocks() {
  for (const blockObj of program) {
    if (blockObj.errors.length > 0) {
      blockObj.ui.errorBox.textContent = blockObj.errors.join(", ");
      blockObj.ui.block.className = "blockError";
    } else {
      blockObj.ui.errorBox.textContent = "";
      blockObj.ui.block.className = "blockSuccess";
    }
  }
}

function renderMemory(memory, memoryView) {
  memoryView.innerHTML = "";

  for (const variable in memory) {
    const item = document.createElement("div");
    item.textContent = `${variable} : ${memory[variable]}`;
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
  item.textContent = text;
  memoryView.appendChild(item);
}
