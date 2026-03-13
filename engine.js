import { parseNames } from "./utils.js";

function operandToAst(operand) {
  if (operand.variable) {
    return new VariableExpr(operand.variable);
  }

  return new IntegerLiteral(Number(operand.value));
}

function buildExprFromBlock(block) {
  if (block.type === "arith") {
    const left = block.children[0]
      ? buildExprFromBlock(block.children[0])
      : operandToAst(block.left);
    const right = block.children[1]
      ? buildExprFromBlock(block.children[1])
      : operandToAst(block.right);
    return new ArithmeticExpr(block.operator, left, right);
  }

  if (block.type === "varGet") {
    return new VariableExpr(block.variable);
  }

  if (block.type === "arrayGet") {
    const indexExpr = block.children[0]
      ? buildExprFromBlock(block.children[0])
      : operandToAst(block.index);

    return new ArrayGetExpr(block.arrayName, indexExpr);
  }

  throw new Error("Unsupported expression block type: " + block.type);
}

function expressionFromTarget(childBlock, operandModel) {
  if (childBlock) return buildExprFromBlock(childBlock);
  return operandToAst(operandModel);
}

function buildLogicalExprFromBlock(block) {
  if (block.type === "compare") {
    const left = block.children[0]
      ? buildExprFromBlock(block.children[0])
      : operandToAst(block.left);
    const right = block.children[1]
      ? buildExprFromBlock(block.children[1])
      : operandToAst(block.right);
    return new CompareExpr(block.operator, left, right);
  }
  if (block.type === "boolean") {
    return new BooleanLiteral(block.value);
  }
  if (block.type === "logic") {
    const left = block.children[0]
      ? buildLogicalExprFromBlock(block.children[0])
      : null;
    const right = block.children[1]
      ? buildLogicalExprFromBlock(block.children[1])
      : null;
    if (!left || !right) throw new Error("Missing operand in logic block");
    return new LogicalExpr(block.operator, left, right);
  }
  if (block.type === "not") {
    const operand = block.children[0]
      ? buildLogicalExprFromBlock(block.children[0])
      : null;
    if (!operand) throw new Error("Missing operand in not block");
    return new LogicalNotExpr(operand);
  }
  throw new Error("Unsupported logical block type: " + block.type);
}

function buildStatements(blocks) {
  const statements = [];

  for (const block of blocks) {
    if (block.type === "varDecl") {
      const names = parseNames(block.rawNames);
      for (const name of names) {
        statements.push(new DeclareStatement(name));
      }
      continue;
    }

    if (block.type === "assign") {
      const expression = expressionFromTarget(
        block.children[0],
        block.expression,
      );
      statements.push(new AssignStatement(block.variable, expression));
      continue;
    }

    if (block.type === "arrayDecl") {
      statements.push(
        new DeclareArrayStatement(block.name, Number(block.size)),
      );
      continue;
    }

    if (block.type === "arraySet") {
      const indexExpr = block.children[0]
        ? buildExprFromBlock(block.children[0])
        : operandToAst(block.index);

      const valueExpr = block.children[1]
        ? buildExprFromBlock(block.children[1])
        : operandToAst(block.value);

      statements.push(
        new ArraySetStatement(block.arrayName, indexExpr, valueExpr),
      );
      continue;
    }

    if (block.type === "if") {
      const condition = buildLogicalExprFromBlock(block.conditionChild);
      const thenBody = new BlockStatement(buildStatements(block.children));

      const elseBody =
        block.elseChildren.length > 0
          ? new BlockStatement(buildStatements(block.elseChildren))
          : undefined;

      statements.push(new IfStatement(condition, thenBody, elseBody));
      continue;
    }

    if (block.type === "while") {
      const condition = buildLogicalExprFromBlock(block.conditionChild);
      const body = new BlockStatement(buildStatements(block.children));

      statements.push(new WhileStatement(condition, body));
      continue;
    }
  }

  return statements;
}

function hasAnyErrorsInBlock(block) {
  if (block.errors?.length > 0) return true;

  if (block.type === "assign" && block.children[0]) {
    if (hasAnyErrorsInBlock(block.children[0])) return true;
  }

  if (block.type === "arith") {
    if (block.children[0] && hasAnyErrorsInBlock(block.children[0]))
      return true;
    if (block.children[1] && hasAnyErrorsInBlock(block.children[1]))
      return true;
  }

  if (block.type === "arrayGet") {
    if (block.children[0] && hasAnyErrorsInBlock(block.children[0])) {
      return true;
    }
  }

  if (block.type === "arraySet") {
    if (block.children[0] && hasAnyErrorsInBlock(block.children[0])) {
      return true;
    }
    if (block.children[1] && hasAnyErrorsInBlock(block.children[1])) {
      return true;
    }
  }

  if (block.type === "compare") {
    if (block.children[0] && hasAnyErrorsInBlock(block.children[0]))
      return true;
    if (block.children[1] && hasAnyErrorsInBlock(block.children[1]))
      return true;
  }

  if (block.type === "if") {
    if (block.conditionChild && hasAnyErrorsInBlock(block.conditionChild))
      return true;

    for (const child of block.children) {
      if (hasAnyErrorsInBlock(child)) return true;
    }
    for (const child of block.elseChildren) {
      if (hasAnyErrorsInBlock(child)) return true;
    }
  }

  if (block.type === "while") {
    if (block.conditionChild && hasAnyErrorsInBlock(block.conditionChild))
      return true;

    for (const child of block.children) {
      if (hasAnyErrorsInBlock(child)) return true;
    }
  }

  if (block.type === "logic") {
    if (block.children[0] && hasAnyErrorsInBlock(block.children[0]))
      return true;
    if (block.children[1] && hasAnyErrorsInBlock(block.children[1]))
      return true;
  }
  if (block.type === "not") {
    if (block.children[0] && hasAnyErrorsInBlock(block.children[0]))
      return true;
  }
  if (block.type === "boolean") {
  }

  return false;
}

export function buildAstFromProgram(program) {
  return new BlockStatement(buildStatements(program.children));
}

export function runProgram(
  program,
  { validateAndStoreErrors, render, appendLogs, renderMemory, memoryView },
) {
  memoryView.innerHTML = "";

  validateAndStoreErrors();
  render();

  if (program.children.some((block) => hasAnyErrorsInBlock(block))) {
    appendLogs(
      "В программе есть ошибки валидации",
      "Исправьте ошибки перед запуском",
    );
    return;
  }

  const ast = buildAstFromProgram(program);
  const compiler = new Tokenizer();
  const instructions = compiler.compile(ast);

  const executer = new Executer(instructions, appendLogs, (mem) =>
    renderMemory(mem, memoryView),
  );

  try {
    executer.run();
  } catch (e) {
    appendLogs("Ошибка выполнения программы:", e.message);
  }
}
