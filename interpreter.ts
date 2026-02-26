interface Expression {}
interface Statement {}

interface Literal extends Expression {
  value: any;
}

class IntegerLiteral implements Literal {
  constructor(public value: number) {}
}

class BooleanLiteral implements Literal {
  constructor(public value: boolean) {}
}

class StringLiteral implements Literal {
  constructor(public value: string) {}
}

class VariableExpr implements Expression {
  constructor(public name: string) {}
}

class UnaryExpr<T extends Expression, R extends Literal> implements Expression {
  constructor(
    public operator: string,
    public operand: T,
  ) {}
}

class BinaryExpr<
  T extends Expression,
  R extends Literal,
> implements Expression {
  constructor(
    public operator: string,
    public leftOperand: T,
    public rightOperand: T,
  ) {}
}

type Arithmetic = IntegerLiteral | ArithmeticExpr | VariableExpr;
class ArithmeticExpr extends BinaryExpr<Arithmetic, IntegerLiteral> {}
class CompareExpr extends BinaryExpr<Arithmetic, BooleanLiteral> {}

type Logical = CompareExpr | LogicalNotExpr | LogicalExpr;
class LogicalNotExpr extends UnaryExpr<Logical, BooleanLiteral> {}
class LogicalExpr extends BinaryExpr<Logical, BooleanLiteral> {}

class PrintStatement implements Statement {
  constructor(public expression: Expression) {}
}

class DeclareStatement implements Statement {
  constructor(public varName: string) {}
}

class AssignStatement implements Statement {
  constructor(
    public varName: string,
    public expression: Arithmetic,
  ) {}
}

class BlockStatement implements Statement {
  constructor(public statements: Statement[]) {}
}

class IfStatement implements Statement {
  constructor(
    public condition: Logical,
    public thenBranch: Statement,
    public elseBranch?: Statement,
  ) {}
}

class WhileStatement implements Statement {
  constructor(
    public condition: Logical,
    public body: Statement,
  ) {}
}

class ForStatement implements Statement {
  constructor(
    public initializer: Statement,
    public condition: Logical,
    public increment: Statement,
    public body: Statement,
  ) {}
}

enum TokenCode {
  PUSH_VALUE,
  DECLARE_VAR,
  ASSIGN_VAR,
  GET_VAR_VALUE,
  PRINT,

  ADD,
  SUBTR,
  MULT,
  DIV,
  MOD,
  EQUAL,
  N_EQUAL,
  LOWER,
  LOWER_EQ,
  GREATER,
  GREATER_EQ,
  AND,
  OR,
  NOT,

  JUMP,
  JUMP_IF_FALSE,
}

interface Instruction {
  token: TokenCode;
  arg?: any;
}

class Tokenizer {
  private instructions: Instruction[] = [];

  compile(programm: Statement): Instruction[] {
    this.emitStatement(programm);
    return this.instructions;
  }

  private emit(op: TokenCode, arg?: any): number {
    const index = this.instructions.length;
    this.instructions.push({ token: op, arg });

    return index;
  }

  private patch(index: number, value: any) {
    this.instructions[index].arg = value;
  }

  private emitExpression(expr: Expression) {
    if (expr instanceof IntegerLiteral) {
      this.emit(TokenCode.PUSH_VALUE, expr.value);
    } else if (expr instanceof BooleanLiteral) {
      this.emit(TokenCode.PUSH_VALUE, expr.value);
    } else if (expr instanceof StringLiteral) {
      this.emit(TokenCode.PUSH_VALUE, expr.value);
    } else if (expr instanceof VariableExpr) {
      this.emit(TokenCode.GET_VAR_VALUE, expr.name);
    } else if (expr instanceof BinaryExpr) {
      this.emitExpression(expr.leftOperand);
      this.emitExpression(expr.rightOperand);

      const OperatorToken: Record<string, TokenCode> = {
        "+": TokenCode.ADD,
        "-": TokenCode.SUBTR,
        "*": TokenCode.MULT,
        "/": TokenCode.DIV,
        "%": TokenCode.MOD,
        "==": TokenCode.EQUAL,
        "!=": TokenCode.N_EQUAL,
        "<": TokenCode.LOWER,
        "<=": TokenCode.LOWER_EQ,
        ">": TokenCode.GREATER,
        ">=": TokenCode.GREATER_EQ,
        "&&": TokenCode.AND,
        "||": TokenCode.OR,
      };

      this.emit(OperatorToken[expr.operator]);
    } else if (expr instanceof UnaryExpr) {
      this.emitExpression(expr.operand);
      if (expr.operator === "!") {
        this.emit(TokenCode.NOT);
      }
    }
  }

  private emitStatement(stmt: Statement) {
    if (stmt instanceof BlockStatement) {
      for (const s of stmt.statements) {
        this.emitStatement(s);
      }
    } else if (stmt instanceof PrintStatement) {
      this.emitExpression(stmt.expression);
      this.emit(TokenCode.PRINT);
    } else if (stmt instanceof DeclareStatement) {
      this.emit(TokenCode.DECLARE_VAR, stmt.varName);
    } else if (stmt instanceof AssignStatement) {
      this.emitExpression(stmt.expression);
      this.emit(TokenCode.ASSIGN_VAR, stmt.varName);
    } else if (stmt instanceof IfStatement) {
      this.emitExpression(stmt.condition);

      const jumpIfFalseIndex = this.emit(TokenCode.JUMP_IF_FALSE, null);
      this.emitStatement(stmt.thenBranch);

      const jumpIndex = this.emit(TokenCode.JUMP, null);

      const elseStart = this.instructions.length;

      this.patch(jumpIfFalseIndex, elseStart);

      if (stmt.elseBranch) {
        this.emitStatement(stmt.elseBranch);
      }

      const end = this.instructions.length;
      this.patch(jumpIndex, end);
    } else if (stmt instanceof WhileStatement) {
      const conditionStart = this.instructions.length;

      this.emitExpression(stmt.condition);

      const exitJumpIndex = this.emit(TokenCode.JUMP_IF_FALSE, null);
      this.emitStatement(stmt.body);

      this.emit(TokenCode.JUMP, conditionStart);

      const exitAddress = this.instructions.length;
      this.patch(exitJumpIndex, exitAddress);
    } else if (stmt instanceof ForStatement) {
      if (stmt.initializer) this.emitStatement(stmt.initializer);

      const conditionStart = this.instructions.length;
      if (stmt.condition) {
        this.emitExpression(stmt.condition);
        const exitJumpIndex = this.emit(TokenCode.JUMP_IF_FALSE, null);

        this.emitStatement(stmt.body);
        if (stmt.increment) this.emitStatement(stmt.increment);

        this.emit(TokenCode.JUMP, conditionStart);

        const exitAddress = this.instructions.length;
        this.patch(exitJumpIndex, exitAddress);
      } else {
        this.emitStatement(stmt.body);
        if (stmt.increment) this.emitStatement(stmt.increment);

        this.emit(TokenCode.JUMP, conditionStart);
      }
    }
  }
}

class Executer {
  private binaryOperations: Partial<
    Record<TokenCode, (a: any, b: any) => any>
  > = {
    [TokenCode.ADD]: (a, b) => a + b,
    [TokenCode.SUBTR]: (a, b) => a - b,
    [TokenCode.MULT]: (a, b) => a * b,
    [TokenCode.DIV]: (a, b) => a / b,
    [TokenCode.MOD]: (a, b) => a % b,

    [TokenCode.EQUAL]: (a, b) => a === b,
    [TokenCode.N_EQUAL]: (a, b) => a !== b,
    [TokenCode.LOWER]: (a, b) => a < b,
    [TokenCode.LOWER_EQ]: (a, b) => a <= b,
    [TokenCode.GREATER]: (a, b) => a > b,
    [TokenCode.GREATER_EQ]: (a, b) => a >= b,

    [TokenCode.AND]: (a, b) => a && b,
    [TokenCode.OR]: (a, b) => a || b,
  };

  private unaryOperations: Partial<Record<TokenCode, (op: any) => any>> = {
    [TokenCode.NOT]: (op) => !op,
  };

  private valueStack: Literal[] = [];
  private memoryStorage = new Map<string, any>();
  private instrId = 0;

  constructor(
    private instructions: Instruction[],
    private output: Function,
    private onMemory?: Function,
  ) {}

  run() {
    while (this.instrId < this.instructions.length) {
      const instr = this.instructions[this.instrId];
      const token = instr.token;

      if (token in this.binaryOperations) {
        const rightOperand = this.valueStack.pop();
        const leftOperand = this.valueStack.pop();

        const result = this.binaryOperations[token]!(leftOperand, rightOperand);
        this.valueStack.push(result);

        ++this.instrId;
        continue;
      } else if (token in this.unaryOperations) {
        const operand = this.valueStack.pop();
        const result = this.unaryOperations[token]!(operand);

        this.valueStack.push(result);

        ++this.instrId;
        continue;
      }

      switch (token) {
        case TokenCode.PUSH_VALUE:
          this.valueStack.push(instr.arg);
          break;
        case TokenCode.PRINT:
          this.output(this.valueStack.pop());
          break;
        case TokenCode.GET_VAR_VALUE: {
          const varName = instr.arg;
          const varValue = this.memoryStorage.get(varName);
          this.valueStack.push(varValue);
          break;
        }
        case TokenCode.DECLARE_VAR: {
          const varName = instr.arg;
          this.memoryStorage.set(varName, 0);
          if (this.output != console.log)
            this.output(`Переменная <b>${varName}</b> объявлена`);
          break;
        }
        case TokenCode.ASSIGN_VAR: {
          const varName = instr.arg;
          const value = this.valueStack.pop();
          this.memoryStorage.set(varName, value);
          if (this.output != console.log)
            this.output(
              `Переменной <b>${varName}</b> присвоено значение <b>${value}</b>`,
            );
          break;
        }
        case TokenCode.JUMP:
          this.instrId = instr.arg;
          continue;
        case TokenCode.JUMP_IF_FALSE: {
          const cond = this.valueStack.pop();
          if (!cond) {
            this.instrId = instr.arg;
            continue;
          }
          break;
        }
      }

      ++this.instrId;
    }
    if (this.onMemory) this.onMemory(this.memoryStorage);
  }
}

function test() {
  let declareI = new DeclareStatement("i");
  let i = new VariableExpr("i");
  let initValue = new IntegerLiteral(0);
  let assignI = new AssignStatement("i", initValue);

  let varI = new VariableExpr("i");
  let limit = new IntegerLiteral(10);
  let condition = new CompareExpr("<", varI, limit);

  let two = new IntegerLiteral(2);
  let zero = new IntegerLiteral(0);

  let remainder = new ArithmeticExpr("%", i, two);
  let isEven = new CompareExpr("==", remainder, zero);

  let printEven = new PrintStatement(new StringLiteral("even"));
  let printOdd = new PrintStatement(new StringLiteral("odd"));

  let ifEven = new IfStatement(isEven, printEven, printOdd);

  let printValue = new PrintStatement(i);

  let one = new IntegerLiteral(1);
  let increment = new ArithmeticExpr("+", i, one);
  let assignIncrement = new AssignStatement("i", increment);

  let loopBody = new BlockStatement([ifEven, printValue, assignIncrement]);

  let whileLoop = new WhileStatement(condition, loopBody);

  let program = new BlockStatement([declareI, assignI, whileLoop]);

  let compiler = new Tokenizer();
  let instructions = compiler.compile(program);

  for (let token of instructions)
    console.log(TokenCode[token.token], token.arg);

  let ex = new Executer(instructions, console.log);

  ex.run();
}

test();
