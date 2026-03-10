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

  throw new Error("Unsupported expression block type: " + block.type);
}

function expressionFromTarget(childBlock, operandModel) {
  if (childBlock) return buildExprFromBlock(childBlock);
  return operandToAst(operandModel);
}

function buildConditionFromBlock(block) {
  if (block.type === "compare") {
    const left = block.children[0]
      ? buildExprFromBlock(block.children[0])
      : operandToAst(block.left);

    const right = block.children[1]
      ? buildExprFromBlock(block.children[1])
      : operandToAst(block.right);

    return new CompareExpr(block.operator, left, right);
  }

  throw new Error("Неподдерживаемый блок условия: " + block.type);
}

function buildStatements(blocks, parseNames) {
  const statements = [];

  for (const block of blocks) {
    if (block.type === "varDecl") {
      const names = parseNames(block.raw);
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

    if (block.type === "if") {
      const condition = buildConditionFromBlock(block.conditionChild);
      const thenBody = new BlockStatement(
        buildStatements(block.children, parseNames),
      );

      const elseBody =
        block.elseChildren.length > 0
          ? new BlockStatement(buildStatements(block.elseChildren, parseNames))
          : undefined;

      statements.push(new IfStatement(condition, thenBody, elseBody));
      continue;
    }

    if (block.type === "while") {
      const condition = buildConditionFromBlock(block.conditionChild);
      const body = new BlockStatement(
        buildStatements(block.children, parseNames),
      );

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

  return false;
}

export function buildAstFromProgram(program, parseNames) {
  return new BlockStatement(buildStatements(program.children, parseNames));
}

export function runProgram(
  program,
  {
    parseNames,
    validateAndStoreErrors,
    render,
    appendLogs,
    renderMemory,
    memoryView,
  },
) {
  memoryView.innerHTML = "";

  validateAndStoreErrors();
  render();

  if (program.children.some((block) => hasAnyErrorsInBlock(block))) {
    appendLogs("В программе есть ошибки валидации");
    return;
  }

  const ast = buildAstFromProgram(program, parseNames);
  const compiler = new Tokenizer();
  const instructions = compiler.compile(ast);

  const executer = new Executer(instructions, appendLogs, (mem) =>
    renderMemory(mem, memoryView),
  );

  executer.run();
}
