import { parseNames, isValidVarName } from "./utils.js";

const COMPARE_OPERATORS = new Set([">", "<", "==", "!=", ">=", "<="]);
const ARITH_OPERATORS = new Set(["+", "-", "*", "/", "%"]);

function validateIntegerOperand(operandModel, errors, operandSide) {
  const n = Number(operandModel.value);

  if (operandModel.value === "") {
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

function validateExpressionBlock(blockModel, declared, errorsById) {
  const errors = [];

  if (blockModel.type === "varGet") {
    if (!blockModel.variable) {
      errors.push("Переменная не выбрана");
    } else if (!declared.has(blockModel.variable)) {
      errors.push(`Переменная не объявлена: ${blockModel.variable}`);
    }

    errorsById.set(blockModel.id, errors);
    return;
  }

  if (blockModel.type === "arith") {
    validateOperand(
      blockModel.children[0],
      blockModel.left,
      declared,
      errorsById,
      errors,
      "Левый",
    );
    validateOperand(
      blockModel.children[1],
      blockModel.right,
      declared,
      errorsById,
      errors,
      "Правый",
    );

    if (!ARITH_OPERATORS.has(blockModel.operator)) {
      errors.push(
        `Неизвестный арифметический оператор: ${blockModel.operator}`,
      );
    }

    if (
      (blockModel.operator === "/" || blockModel.operator === "%") &&
      !blockModel.children[1]
    ) {
      const rightValue = Number(blockModel.right.value);
      if (!Number.isNaN(rightValue) && rightValue === 0) {
        errors.push("Деление на ноль");
      }
    }

    errorsById.set(blockModel.id, errors);
    return;
  }

  errors.push(`Блок "${blockModel.type}" нельзя использовать как выражение`);
  errorsById.set(blockModel.id, errors);
}

function validateVarDecl(blockModel, declared, errors) {
  const names = parseNames(blockModel.raw);
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

function validateAssign(blockModel, declared, errorsById, errors) {
  if (!blockModel.variable) {
    errors.push("Переменная для присваивания не выбрана");
  } else if (!declared.has(blockModel.variable)) {
    errors.push(`Переменная не объявлена: ${blockModel.variable}`);
  }

  if (blockModel.children[0]) {
    validateExpressionBlock(blockModel.children[0], declared, errorsById);
  } else {
    validateIntegerOperand(
      blockModel.expression,
      errors,
      "Присваиваемое значение",
    );
  }
}

function validateIf(blockModel, declared, errorsById, errors) {
  if (!COMPARE_OPERATORS.has(blockModel.comparator)) {
    errors.push(`Неизвестный оператор сравнения: ${blockModel.comparator}`);
  }

  validateOperand(
    blockModel.conditionChildren[0],
    blockModel.left,
    declared,
    errorsById,
    errors,
    "Левая часть условия",
  );
  validateOperand(
    blockModel.conditionChildren[1],
    blockModel.right,
    declared,
    errorsById,
    errors,
    "Правая часть условия",
  );

  for (const child of blockModel.children) {
    validateStatementBlock(child, declared, errorsById);
  }

  for (const child of blockModel.elseChildren) {
    validateStatementBlock(child, declared, errorsById);
  }
}

function validateWhile(blockModel, declared, errorsById, errors) {
  if (!COMPARE_OPERATORS.has(blockModel.comparator)) {
    errors.push(`Неизвестный оператор сравнения: ${blockModel.comparator}`);
  }

  validateOperand(
    blockModel.conditionChildren[0],
    blockModel.left,
    declared,
    errorsById,
    errors,
    "Левая часть условия",
  );
  validateOperand(
    blockModel.conditionChildren[1],
    blockModel.right,
    declared,
    errorsById,
    errors,
    "Правая часть условия",
  );

  for (const child of blockModel.children) {
    validateStatementBlock(child, declared, errorsById);
  }
}

function validateStatementBlock(blockModel, declared, errorsById) {
  const errors = [];

  if (blockModel.type === "varDecl") {
    validateVarDecl(blockModel, declared, errors);
    errorsById.set(blockModel.id, errors);
    return;
  }

  if (blockModel.type === "assign") {
    validateAssign(blockModel, declared, errorsById, errors);
    errorsById.set(blockModel.id, errors);
    return;
  }

  if (blockModel.type === "if") {
    validateIf(blockModel, declared, errorsById, errors);
    errorsById.set(blockModel.id, errors);
    return;
  }

  if (blockModel.type === "while") {
    validateWhile(blockModel, declared, errorsById, errors);
    errorsById.set(blockModel.id, errors);
    return;
  }

  errors.push(`Неизвестный тип блока: ${blockModel.type}`);
  errorsById.set(blockModel.id, errors);
}

export function validateProgram(program) {
  const errorsById = new Map();
  const declared = new Set();

  for (const blockModel of program.children) {
    validateStatementBlock(blockModel, declared, errorsById);
  }

  return errorsById;
}
