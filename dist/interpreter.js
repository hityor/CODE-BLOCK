"use strict";
class Literal {
    constructor(value) {
        this.value = value;
    }
}
class IntegerLiteral extends Literal {
    constructor(value) {
        super(value);
        this.value = value;
    }
}
class BooleanLiteral extends Literal {
    constructor(value) {
        super(value);
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
        else if (expr instanceof VariableExpr) {
            this.emit(TokenCode.GET_VAR_VALUE, expr.name);
        }
        else if (expr instanceof BinaryExpr) {
            this.emitExpression(expr.leftOperand);
            this.emitExpression(expr.rightOperand);
            const OperetorToken = {
                '+': TokenCode.ADD,
                '-': TokenCode.SUBTR,
                '*': TokenCode.MULT,
                '/': TokenCode.DIV,
                '%': TokenCode.MOD,
                '==': TokenCode.EQUAL,
                '!=': TokenCode.N_EQUAL,
                '<': TokenCode.LOWER,
                '<=': TokenCode.LOWER_EQ,
                '>': TokenCode.GREATER,
                '>=': TokenCode.GREATER_EQ,
                '&&': TokenCode.AND,
                '||': TokenCode.OR
            };
            this.emit(OperetorToken[expr.operator]);
        }
        else if (expr instanceof UnaryExpr) {
            this.emitExpression(expr.operand);
            if (expr.operator === '!') {
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
            this.emitExpression(stmt.varName);
            this.emit(TokenCode.DECLARE_VAR, stmt.varName);
        }
        else if (stmt instanceof AssignStatement) {
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
    constructor(instructions) {
        this.instructions = instructions;
        this.binaryOperations = {
            [TokenCode.ADD]: (a, b) => a + b,
            [TokenCode.SUBTR]: (a, b) => a - b,
            [TokenCode.MULT]: (a, b) => a * b,
            [TokenCode.DIV]: (a, b) => a / b,
            [TokenCode.MOD]: (a, b) => a % b,
            [TokenCode.EQUAL]: (a, b) => a === b,
            [TokenCode.NOT]: (a, b) => a !== b,
            [TokenCode.LOWER]: (a, b) => a < b,
            [TokenCode.LOWER_EQ]: (a, b) => a <= b,
            [TokenCode.GREATER]: (a, b) => a > b,
            [TokenCode.GREATER_EQ]: (a, b) => a >= b,
            [TokenCode.AND]: (a, b) => a && b,
            [TokenCode.OR]: (a, b) => a || b,
        };
        this.unaryOperations = {
            [TokenCode.NOT]: (op) => !op
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
                    console.log(this.valueStack.pop());
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
                    break;
                }
                case TokenCode.ASSIGN_VAR: {
                    const varName = instr.arg;
                    const value = this.valueStack.pop();
                    this.memoryStorage.set(varName, value);
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
    }
}
let declare = new DeclareStatement('a');
let lit1 = new IntegerLiteral(7);
let var1 = new VariableExpr('a');
let assign = new AssignStatement('a', lit1);
let lit2 = new IntegerLiteral(5);
let lit3 = new IntegerLiteral(11);
let lit4 = new IntegerLiteral(3);
let exp1 = new ArithmeticExpr('*', lit1, lit2);
let exp2 = new ArithmeticExpr('-', var1, lit4);
let exp3 = new ArithmeticExpr('+', exp1, exp2);
let lit5 = new IntegerLiteral(39);
let comp1 = new ArithmeticExpr('==', exp3, lit5);
let comp2 = new ArithmeticExpr('<=', lit2, lit3);
let cond = new LogicalExpr('&&', comp1, comp2);
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
let ex = new Executer(instructions);
ex.run();
