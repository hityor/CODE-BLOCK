import { parseNames, isValidVarName } from "./utils.js";

const COMPARE_OPERATORS = new Set([">", "<", "==", "!=", ">=", "<="]);
const ARITH_OPERATORS = new Set(["+", "-", "*", "/", "%"]);

function validateIntegerOperand(operand, errors, operandSide) {
  const n = Number(operand.value);

  if (operand.value === "") {
    errors.push(`${operandSide}: пустой операнд`);
    return;
  }

  if (Number.isNaN(n)) {
    errors.push(`${operandSide}: должно быть число`);
    return;
  }

  if (!Number.isInteger(n)) {
    errors.push(`${operandSide}: должно быть целое число`);
  }
}

function validateOperand(
  childBlock,
  operandModel,
  declared,
  errorsById,
  errors,
  side,
) {
  if (childBlock) {
    validateExpressionBlock(childBlock, declared, errorsById);
  } else {
    validateIntegerOperand(operandModel, errors, side);
  }
}

function validateExpressionBlock(block, declared, errorsById) {
  const errors = [];

  if (block.type === "varGet") {
    if (!block.variable) {
      errors.push("Переменная не выбрана");
    } else if (!declared.has(block.variable)) {
      errors.push(`Переменная не объявлена: ${block.variable}`);
    }

    errorsById.set(block.id, errors);
    return;
  }

  if (block.type === "arith") {
    validateOperand(
      block.children[0],
      block.left,
      declared,
      errorsById,
      errors,
      "Левый",
    );
    validateOperand(
      block.children[1],
      block.right,
      declared,
      errorsById,
      errors,
      "Правый",
    );

    if (!ARITH_OPERATORS.has(block.operator)) {
      errors.push(`Неизвестный арифметический оператор: ${block.operator}`);
    }

    if (
      (block.operator === "/" || block.operator === "%") &&
      !block.children[1]
    ) {
      const rightValue = Number(block.right.value);
      if (!Number.isNaN(rightValue) && rightValue === 0) {
        errors.push("Деление на ноль");
      }
    }

    errorsById.set(block.id, errors);
    return;
  }

  errors.push(`Блок "${block.type}" нельзя использовать как выражение`);
  errorsById.set(block.id, errors);
}

function validateVarDecl(block, declared, errors) {
  const names = parseNames(block.raw);
  if (names.length === 0) errors.push("Объявление переменной пустое");

  const localDeclared = new Set();
  for (const name of names) {
    if (!isValidVarName(name)) {
      errors.push(`Некорректное имя переменной: ${name}`);
    } else if (localDeclared.has(name)) {
      errors.push(`Дубликат переменной в объявлении: ${name}`);
    } else if (declared.has(name)) {
      errors.push(`Переменная уже объявлена в другом блоке: ${name}`);
    } else {
      localDeclared.add(name);
    }
  }
  
  for (const name of localDeclared) {
    declared.add(name);
  }
  
}

function validateAssign(block, declared, errorsById, errors) {
  if (!block.variable) {
    errors.push("Переменная для присваивания не выбрана");
  } else if (!declared.has(block.variable)) {
    errors.push(`Переменная не объявлена: ${block.variable}`);
  }

  if (block.children[0]) {
    validateExpressionBlock(block.children[0], declared, errorsById);
  } else {
    validateIntegerOperand(block.expression, errors, "Присваиваемое значение");
  }
}

function validateIf(block, declared, errorsById, errors) {
  if (!COMPARE_OPERATORS.has(block.comparator)) {
    errors.push(`Неизвестный оператор сравнения: ${block.comparator}`);
  }

  validateOperand(
    block.conditionChildren[0],
    block.left,
    declared,
    errorsById,
    errors,
    "Левая часть условия",
  );
  validateOperand(
    block.conditionChildren[1],
    block.right,
    declared,
    errorsById,
    errors,
    "Правая часть условия",
  );

  for (const child of block.children) {
    validateStatementBlock(child, declared, errorsById);
  }
}

function validateStatementBlock(block, declared, errorsById) {
  const errors = [];

  if (block.type === "varDecl") {
    validateVarDecl(block, declared, errors);
    errorsById.set(block.id, errors);
    return;
  }

  if (block.type === "assign") {
    validateAssign(block, declared, errorsById, errors);
    errorsById.set(block.id, errors);
    return;
  }

  if (block.type === "if") {
    validateIf(block, declared, errorsById, errors);
    errorsById.set(block.id, errors);
    return;
  }

  errors.push(`Неизвестный тип блока: ${block.type}`);
  errorsById.set(block.id, errors);
}

export function validateProgram(program) {
  const errorsById = new Map();
  const declared = new Set();

  for (const block of program.children) {
    validateStatementBlock(block, declared, errorsById);
  }

  return errorsById;
}
