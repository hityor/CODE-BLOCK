export function operandToAst(operand) {
  if (operand.variable) {
    return new VariableExpr(operand.variable);
  } else {
    return new IntegerLiteral(Number(operand.value));
  }
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
  } else if (block.type === "varGet") {
    return new VariableExpr(block.variable);
  }
  throw new Error("Неизвестный тип блока в выражении");
}

export function buildAstFromProgram(program, parseNames) {
  const statements = [];

  for (const block of program.children) {
    if (block.type === "varDecl") {
      const names = parseNames(block.raw);
      for (const name of names) {
        statements.push(new DeclareStatement(name));
      }
    }

    if (block.type === "assign") {
      let expression;
      if (block.children.length > 0) {
        expression = buildExprFromBlock(block.children[0]);
      } else {
        expression = operandToAst(block.expression);
      }
      statements.push(new AssignStatement(block.variable, expression));
    }
  }

  return new BlockStatement(statements);
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

  if (program.children.some((b) => b.errors.length > 0)) {
    appendLogs("Есть ошибки");
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
