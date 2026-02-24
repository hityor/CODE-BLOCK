interface Expression {}
interface Statement {}

abstract class Literal implements Expression {
  constructor(public value: any) {}
}

class IntegerLiteral extends Literal {
  constructor(public value: number) {
    super(value);
  }
}

class BooleanLiteral extends Literal {
  constructor(public value: boolean) {
    super(value);
  }
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
    public condition: Expression,
    public thenBranch: Statement,
    public elseBranch?: Statement,
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
    } else if (expr instanceof VariableExpr) {
      this.emit(TokenCode.GET_VAR_VALUE, expr.name);
    } else if (expr instanceof BinaryExpr) {
      this.emitExpression(expr.leftOperand);
      this.emitExpression(expr.rightOperand);

      const OperetorToken: Record<string, TokenCode> = {
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

      this.emit(OperetorToken[expr.operator]);
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
    }

    if (stmt instanceof IfStatement) {
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

  private valueStack: any[] = [];
  private memoryStorage = new Map<string, any>();
  private instrId = 0;

  constructor(
    private instructions: Instruction[],
    private output: any,
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
          this.output.print(this.valueStack.pop());
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
          this.output.print(`Переменная <b>${varName}</b> объявлена`);
          break;
        }
        case TokenCode.ASSIGN_VAR: {
          const varName = instr.arg;
          const value = this.valueStack.pop();
          this.memoryStorage.set(varName, value);
          this.output.print(
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

    this.output.onMemory(this.memoryStorage);
  }
}

function test() {
  let declare = new DeclareStatement("a");
  let lit1 = new IntegerLiteral(7);
  let var1 = new VariableExpr("a");
  let assign = new AssignStatement("a", lit1);

  let lit2 = new IntegerLiteral(5);
  let lit3 = new IntegerLiteral(11);
  let lit4 = new IntegerLiteral(3);

  let exp1 = new ArithmeticExpr("*", lit1, lit2);
  let exp2 = new ArithmeticExpr("-", var1, lit4);
  let exp3 = new ArithmeticExpr("+", exp1, exp2);

  let lit5 = new IntegerLiteral(39);
  let comp1 = new CompareExpr("==", exp3, lit5);
  let comp2 = new CompareExpr("<=", lit2, lit3);

  let cond = new LogicalExpr("&&", comp1, comp2);

  let pr1 = new PrintStatement(exp3);
  let trueBlock = new BlockStatement([pr1]);

  let pr2 = new PrintStatement(lit1);
  let falseBlock = new BlockStatement([pr2]);

  let ifSt = new IfStatement(cond, trueBlock, falseBlock);

  let pr3 = new PrintStatement(cond);

  let programm = new BlockStatement([declare, assign, ifSt, pr3]);

  let compiler = new Tokenizer();
  let instructions = compiler.compile(programm);

  for (let token of instructions)
    console.log(TokenCode[token.token], token.arg);

  let ex = new Executer(instructions, console.log);

  ex.run();
}
