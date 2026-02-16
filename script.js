// ==== DOM REFS ====
const programDiv = document.getElementById("program")
const addVarBtn = document.getElementById("addVarBtn")
const runBtn = document.getElementById("runBtn")
const addAssignBtn = document.getElementById("addAssignBtn")
const memoryView = document.getElementById("memoryView")

// ==== STATE ====
const program = []
let memory = {}

// ==== UI ====
// Кнопка добавления переменной
addVarBtn.addEventListener("click", function () {
    const block = document.createElement("div")
    block.className = "blockSuccess"

    const input = document.createElement("input")
    input.type = "text"
    input.placeholder = "a, b, c"

    const type = document.createElement("span")
    type.textContent = "int"

    const errorBox = document.createElement("div")
    errorBox.className = "errorBox"

    const blockObj = {
        type: "varDecl",
        raw: "",
        errors: [],
        ui: { block, errorBox }
    }

    program.push(blockObj)
    input.addEventListener("input", function () {
        blockObj.raw = input.value

        run()
    })

    block.appendChild(type)
    block.appendChild(input)
    block.appendChild(errorBox)
    programDiv.appendChild(block)
})

// Кнопка RUN
runBtn.addEventListener("click", function () {
    run()
})

// Кнопка Add Assign
addAssignBtn.addEventListener("click", function () {
    const block = document.createElement("div")

    const select = document.createElement("select")
    updateSelectionOptions(select)

    const span = document.createElement("span")
    span.textContent = " = "

    const input = document.createElement("input")

    const errorBox = document.createElement("div")
    errorBox.className = "errorBox"

    const blockObj = {
        type: "assign",
        variable: select.value,
        value: "",
        errors: [],
        ui: { block, errorBox, select, input }
    }
    program.push(blockObj)

    select.addEventListener("change", function () {
        blockObj.variable = select.value
        span.textContent = ` = `
    })

    input.addEventListener("input", function () {
        blockObj.value = input.value
    })

    block.appendChild(select)
    block.appendChild(span)
    block.appendChild(input)
    block.appendChild(errorBox)
    programDiv.appendChild(block)
})

function updateSelectionOptions(select) {
    select.innerHTML = ""

    for (const name in memory) {
        const option = document.createElement("option")
        option.value = name
        option.textContent = name

        select.appendChild(option)
    }
}

function updateAllAssignSelections() {
    for (const blockObj of program) {
        if (blockObj.type == "assign") {
            updateSelectionOptions(blockObj.ui.select)
        }
    }
}

// ==== ENGINE ====
function rebuild() {
    memory = {}
    const declared = new Set()
    for (const blockObj of program) {
        if (blockObj.type == "varDecl") {
            blockObj.errors = []
            const names = parseNames(blockObj.raw)
            if (names.length > 0) {
                for (const name of names) {
                    if (!isValidVarName(name)) {
                        blockObj.errors.push(`Некорректное название переменной: ${name}`)
                    } else if (declared.has(name)) {
                        blockObj.errors.push(`Дубликат: ${name}`)
                    } else {
                        declared.add(name)
                        memory[name] = 0
                    }
                }
            }
        } else if (blockObj.type == "assign") {
            blockObj.errors = []

            if (!declared.has(blockObj.variable)) {
                blockObj.errors.push(`Такая переменная не объявлена: ${blockObj.variable}`)
            } else {
                const n = Number(blockObj.value)

                if (Number.isNaN(n)) {
                    blockObj.errors.push(`Значение должно быть числом`)
                } else if (!Number.isInteger(n)) {
                    blockObj.errors.push(`Число должно быть целым`)
                } else {
                    memory[blockObj.variable] = n
                }
            }
        }
    }
}

function run() {
    rebuild()
    updateAllAssignSelections()
    renderBlocks()
    renderMemory(memory, memoryView)
}

// ==== RENDER ====
function renderBlocks() {
    for (const blockObj of program) {
        if (blockObj.errors.length > 0) {
            blockObj.ui.errorBox.textContent = blockObj.errors.join(", ")
            blockObj.ui.block.className = "blockError"
        } else {
            blockObj.ui.errorBox.textContent = ""
            blockObj.ui.block.className = "blockSuccess"
        }
    }
}

function renderMemory(memory, memoryView) {
    memoryView.innerHTML = ""

    for (const variable in memory) {
        const item = document.createElement("div")
        item.textContent = `${variable} : ${memory[variable]}`
        memoryView.appendChild(item)
    }
}

// ==== UTILS ====
function isValidVarName(name) {
    const regex = /^[A-Za-z_][A-Za-z0-9_]*$/
    return regex.test(name)
}

function parseNames(text) {
    return text
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== "")
}