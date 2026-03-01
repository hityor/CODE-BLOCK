export function operandToAst(operand) {
  if (operand.kind === "const")
    return new IntegerLiteral(Number(operand.value));
  return new VariableExpr(operand.variable);
}

export function buildExpressionAst(assignBlock) {
  const expression = assignBlock.expression;
  const left = operandToAst(expression.left);

  if (expression.mode === "single") return left;

  const right = operandToAst(expression.right);
  return new ArithmeticExpr(expression.operator, left, right);
}

export function buildAstFromProgram(program, parseNames) {
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

  if (program.some((b) => b.errors.length > 0)) {
    appendLogs("Есть ошибки");
    return;
  }

  const ast = buildAstFromProgram(program, parseNames);
  const compiler = new Tokenizer();
  const instructions = compiler.compile(ast);

  const executer = new Executer(instructions, {
    print: appendLogs,
    onMemory: (mem) => renderMemory(mem, memoryView),
  });

  executer.run();
}
