export function operandToAst(operand) {
  return new IntegerLiteral(Number(operand.value));
  return new VariableExpr(operand.variable);
}

export function buildAssignAst(assignBlock) {
  if (assignBlock.children.length != 0) {
    let expression = assignBlock.children[0];

    const left = buildAssignAst(expression.left);
    const right = buildAssignAst(expression.right);

    return new ArithmeticExpr(expression.operator, left, right);
  } else return operandToAst(assignBlock.expression);
}

export function buildArithAst(arithBlock) {
  let left = operandToAst(arithBlock.left);
  let right = operandToAst(arithBlock.right);
  if (arithBlock.children) {
    if (arithBlock.children[0]) left = buildArithAst(arithBlock.children[0]);
    if (arithBlock.children[1]) right = buildArithAst(arithBlock.children[1]);
  }

  return new ArithmeticExpr(arithBlock.operator, left, right);
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
      if (block.children.length != 0)
        expression = buildArithAst(block.children[0]);
      else expression = operandToAst(block.expression);

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
