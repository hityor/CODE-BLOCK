"use strict";
class IntegerLiteral {
    constructor(value) {
        this.value = value;
        this.value = Math.floor(value);
    }
}
class BooleanLiteral {
    constructor(value) {
        this.value = value;
    }
}
class StringLiteral {
    constructor(value) {
        this.value = value;
    }
}
class VariableExpr {
    constructor(name) {
        this.name = name;
    }
}
class UnaryExpr {
    constructor(operator, operand) {
        this.operator = operator;
        this.operand = operand;
    }
}
class BinaryExpr {
    constructor(operator, leftOperand, rightOperand) {
        this.operator = operator;
        this.leftOperand = leftOperand;
        this.rightOperand = rightOperand;
    }
}
class ArithmeticExpr extends BinaryExpr {
}
class CompareExpr extends BinaryExpr {
}
class LogicalNotExpr extends UnaryExpr {
}
class LogicalExpr extends BinaryExpr {
}
class PrintStatement {
    constructor(expression) {
        this.expression = expression;
    }
}
class DeclareStatement {
    constructor(varName) {
        this.varName = varName;
    }
}
class AssignStatement {
    constructor(varName, expression) {
        this.varName = varName;
        this.expression = expression;
    }
}
class BlockStatement {
    constructor(statements) {
        this.statements = statements;
    }
}
class IfStatement {
    constructor(condition, thenBranch, elseBranch) {
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
}
class WhileStatement {
    constructor(condition, body) {
        this.condition = condition;
        this.body = body;
    }
}
class ForStatement {
    constructor(initializer, condition, increment, body) {
        this.initializer = initializer;
        this.condition = condition;
        this.increment = increment;
        this.body = body;
    }
}
var TokenCode;
(function (TokenCode) {
    TokenCode[TokenCode["PUSH_VALUE"] = 0] = "PUSH_VALUE";
    TokenCode[TokenCode["DECLARE_VAR"] = 1] = "DECLARE_VAR";
    TokenCode[TokenCode["ASSIGN_VAR"] = 2] = "ASSIGN_VAR";
    TokenCode[TokenCode["GET_VAR_VALUE"] = 3] = "GET_VAR_VALUE";
    TokenCode[TokenCode["PRINT"] = 4] = "PRINT";
    TokenCode[TokenCode["ADD"] = 5] = "ADD";
    TokenCode[TokenCode["SUBTR"] = 6] = "SUBTR";
    TokenCode[TokenCode["MULT"] = 7] = "MULT";
    TokenCode[TokenCode["DIV"] = 8] = "DIV";
    TokenCode[TokenCode["MOD"] = 9] = "MOD";
    TokenCode[TokenCode["EQUAL"] = 10] = "EQUAL";
    TokenCode[TokenCode["N_EQUAL"] = 11] = "N_EQUAL";
    TokenCode[TokenCode["LOWER"] = 12] = "LOWER";
    TokenCode[TokenCode["LOWER_EQ"] = 13] = "LOWER_EQ";
    TokenCode[TokenCode["GREATER"] = 14] = "GREATER";
    TokenCode[TokenCode["GREATER_EQ"] = 15] = "GREATER_EQ";
    TokenCode[TokenCode["AND"] = 16] = "AND";
    TokenCode[TokenCode["OR"] = 17] = "OR";
    TokenCode[TokenCode["NOT"] = 18] = "NOT";
    TokenCode[TokenCode["JUMP"] = 19] = "JUMP";
    TokenCode[TokenCode["JUMP_IF_FALSE"] = 20] = "JUMP_IF_FALSE";
})(TokenCode || (TokenCode = {}));
class Tokenizer {
    constructor() {
        this.instructions = [];
    }
    compile(programm) {
        this.emitStatement(programm);
        return this.instructions;
    }
    emit(op, arg) {
        const index = this.instructions.length;
        this.instructions.push({ token: op, arg });
        return index;
    }
    patch(index, value) {
        this.instructions[index].arg = value;
    }
    emitExpression(expr) {
        if (expr instanceof IntegerLiteral) {
            this.emit(TokenCode.PUSH_VALUE, expr.value);
        }
        else if (expr instanceof BooleanLiteral) {
            this.emit(TokenCode.PUSH_VALUE, expr.value);
        }
        else if (expr instanceof StringLiteral) {
            this.emit(TokenCode.PUSH_VALUE, expr.value);
        }
        else if (expr instanceof VariableExpr) {
            this.emit(TokenCode.GET_VAR_VALUE, expr.name);
        }
        else if (expr instanceof BinaryExpr) {
            this.emitExpression(expr.leftOperand);
            this.emitExpression(expr.rightOperand);
            const OperatorToken = {
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
        }
        else if (expr instanceof UnaryExpr) {
            this.emitExpression(expr.operand);
            if (expr.operator === "!") {
                this.emit(TokenCode.NOT);
            }
        }
    }
    emitStatement(stmt) {
        if (stmt instanceof BlockStatement) {
            for (const s of stmt.statements) {
                this.emitStatement(s);
            }
        }
        else if (stmt instanceof PrintStatement) {
            this.emitExpression(stmt.expression);
            this.emit(TokenCode.PRINT);
        }
        else if (stmt instanceof DeclareStatement) {
            this.emit(TokenCode.DECLARE_VAR, stmt.varName);
        }
        else if (stmt instanceof AssignStatement) {
            this.emitExpression(stmt.expression);
            this.emit(TokenCode.ASSIGN_VAR, stmt.varName);
        }
        else if (stmt instanceof IfStatement) {
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
        else if (stmt instanceof WhileStatement) {
            const conditionStart = this.instructions.length;
            this.emitExpression(stmt.condition);
            const exitJumpIndex = this.emit(TokenCode.JUMP_IF_FALSE, null);
            this.emitStatement(stmt.body);
            this.emit(TokenCode.JUMP, conditionStart);
            const exitAddress = this.instructions.length;
            this.patch(exitJumpIndex, exitAddress);
        }
        else if (stmt instanceof ForStatement) {
            if (stmt.initializer)
                this.emitStatement(stmt.initializer);
            const conditionStart = this.instructions.length;
            if (stmt.condition) {
                this.emitExpression(stmt.condition);
                const exitJumpIndex = this.emit(TokenCode.JUMP_IF_FALSE, null);
                this.emitStatement(stmt.body);
                if (stmt.increment)
                    this.emitStatement(stmt.increment);
                this.emit(TokenCode.JUMP, conditionStart);
                const exitAddress = this.instructions.length;
                this.patch(exitJumpIndex, exitAddress);
            }
            else {
                this.emitStatement(stmt.body);
                if (stmt.increment)
                    this.emitStatement(stmt.increment);
                this.emit(TokenCode.JUMP, conditionStart);
            }
        }
    }
}
class Executer {
    constructor(instructions, output, onMemory) {
        this.instructions = instructions;
        this.output = output;
        this.onMemory = onMemory;
        this.binaryOperations = {
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
        this.unaryOperations = {
            [TokenCode.NOT]: (op) => !op,
        };
        this.valueStack = [];
        this.memoryStorage = new Map();
        this.instrId = 0;
    }
    run() {
        while (this.instrId < this.instructions.length) {
            const instr = this.instructions[this.instrId];
            const token = instr.token;
            if (token in this.binaryOperations) {
                const rightOperand = this.valueStack.pop();
                const leftOperand = this.valueStack.pop();
                const result = this.binaryOperations[token](leftOperand, rightOperand);
                this.valueStack.push(result);
                ++this.instrId;
                continue;
            }
            else if (token in this.unaryOperations) {
                const operand = this.valueStack.pop();
                const result = this.unaryOperations[token](operand);
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
                    const value = Math.floor(this.valueStack.pop());
                    this.memoryStorage.set(varName, value);
                    if (this.output != console.log)
                        this.output(`Переменной <b>${varName}</b> присвоено значение <b>${value}</b>`);
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
        if (this.onMemory)
            this.onMemory(this.memoryStorage);
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
//test();
