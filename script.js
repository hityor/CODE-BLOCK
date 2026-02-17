// ==== DOM REFS ====
const programDiv = document.getElementById("canvas")
const runBtn = document.getElementById("runBtn")
const memoryView = document.getElementById("logContent")

// ==== STATE ====
const program = []
let memory = {}
let nextId = 1

// ==== UI ====
function createVarBlock() {
    const block = document.createElement("div")
    block.className = "blockSuccess"
    block.draggable = true

    const input = document.createElement("input")
    input.className = "input"
    input.type = "text"
    input.placeholder = "a, b, c"

    const type = document.createElement("span")
    type.textContent = "int "

    const errorBox = document.createElement("div")
    errorBox.className = "errorBox"

    const blockObj = {
        id: nextId++,
        type: "varDecl",
        raw: "",
        errors: [],
        ui: { block, errorBox, input }
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

    block.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", `move:${blockObj.id}`)
        e.dataTransfer.effectAllowed = "move"
    })

    return block
}

function createAssignBlock() {
    const block = document.createElement("div")
    block.className = "blockSuccess"
    block.draggable = true

    const select = document.createElement("select")
    updateSelectionOptions(select)

    const span = document.createElement("span")
    span.textContent = " = "

    const input = document.createElement("input")
    input.className = "input"

    const errorBox = document.createElement("div")
    errorBox.className = "errorBox"

    const blockObj = {
        id: nextId++,
        type: "assign",
        variable: select.value,
        value: "",
        errors: [],
        ui: { block, errorBox, select, input }
    }
    program.push(blockObj)

    select.addEventListener("change", function () {
        blockObj.variable = select.value
    })

    input.addEventListener("input", function () {
        blockObj.value = input.value
    })

    block.appendChild(select)
    block.appendChild(span)
    block.appendChild(input)
    block.appendChild(errorBox)
    programDiv.appendChild(block)

    block.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", `move:${blockObj.id}`)
        e.dataTransfer.effectAllowed = "move"
    })

    return block
}

// Кнопка RUN
runBtn.addEventListener("click", function () {
    run()
})

function updateSelectionOptions(select) {
    const previousValue = select.value
    select.innerHTML = ""

    for (const name in memory) {
        const option = document.createElement("option")
        option.value = name
        option.textContent = name

        select.appendChild(option)
    }
    let newValue = previousValue
    if (previousValue && memory.hasOwnProperty(previousValue)) {
        select.value = previousValue
    } else if (select.options.length > 0) {
        newValue = select.options[0].value
        select.value = newValue
    } else {
        newValue = ""
    }
    return newValue
}

function updateAllAssignSelections() {
    for (const blockObj of program) {
        if (blockObj.type == "assign") {
            const newVal = updateSelectionOptions(blockObj.ui.select)
            blockObj.variable = newVal
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
                    if (!isValidVarName(name))
                        blockObj.errors.push(`Некорректное название переменной: ${name}`)
                    else if (declared.has(name))
                        blockObj.errors.push(`Дубликат: ${name}`)
                    else {
                        declared.add(name)
                        memory[name] = 0
                    }
                }
            }
        } else if (blockObj.type == "assign") {
            blockObj.errors = []

            if (!declared.has(blockObj.variable) && blockObj.variable != "") {
                blockObj.errors.push(`Такая переменная не объявлена: ${blockObj.variable}`)
            } else {
                const n = Number(blockObj.value)

                if (Number.isNaN(n))
                    blockObj.errors.push(`Значение должно быть числом`)
                else if (!Number.isInteger(n))
                    blockObj.errors.push(`Число должно быть целым`)
                else
                    memory[blockObj.variable] = n
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