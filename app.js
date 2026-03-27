// app.js

// --- 1. STATE MANAGEMENT ---
let state = {
    tables: [
        {
            id: 1,
            name: "Usuario",
            fields: [
                { id: 11, name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true, allowNull: false },
                { id: 12, name: "nombre", type: "STRING", primaryKey: false, autoIncrement: false, allowNull: false },
            ],
            associations: [
                { id: 101, type: "hasMany", target: "Articulo" }, // User hasMany Articles
            ],
        },
        {
            id: 2,
            name: "Articulo",
            fields: [
                { id: 21, name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true, allowNull: false },
                { id: 22, name: "descripcion", type: "STRING", primaryKey: false, autoIncrement: false, allowNull: false },
            ],
            associations: [
                { id: 201, type: "belongsTo", target: "Usuario" }, // Article belongsTo User
            ],
        },
    ],
};

const dataTypes = ["STRING", "INTEGER", "FLOAT", "BOOLEAN", "DATE", "TEXT"];
const relationTypes = ["hasOne", "belongsTo", "hasMany", "belongsToMany"];

// --- 2. THE GENERATOR ENGINE ---
function generateSequelizeCode() {
    let code = `const { Sequelize, DataTypes } = require('sequelize');\n\n`;
    code += `// Initialize connection\n`;
    code += `const sequelize = new Sequelize({\n  dialect: 'sqlite',\n  storage: 'db.sqlite'\n});\n\n`;

    let exportNames = ["sequelize"];

    // Step A: Generate Models
    state.tables.forEach((table) => {
        const tableName = table.name || "UnnamedTable";
        exportNames.push(tableName);

        code += `const ${tableName} = sequelize.define('${tableName}', {\n`;
        table.fields.forEach((field, index) => {
            const fieldName = field.name || "unnamed_field";
            code += `  ${fieldName}: {\n`;
            code += `    type: DataTypes.${field.type},\n`;

            if (field.primaryKey) code += `    primaryKey: true,\n`;
            if (field.autoIncrement) code += `    autoIncrement: true,\n`;
            if (!field.allowNull) code += `    allowNull: false,\n`;

            // Remove trailing comma cleanly
            code = code.replace(/,\n$/, "\n");
            code += `  }${index < table.fields.length - 1 ? "," : ""}\n`;
        });
        code += `});\n\n`;
    });

    // Step B: Generate Associations (Relationships)
    let hasAssociations = state.tables.some((t) => t.associations && t.associations.length > 0);
    if (hasAssociations) {
        code += `// --- Associations ---\n`;
        state.tables.forEach((table) => {
            if (!table.associations) return;
            table.associations.forEach((assoc) => {
                if (assoc.target && assoc.target !== "None") {
                    // e.g., Articulo.belongsTo(Usuario);
                    code += `${table.name}.${assoc.type}(${assoc.target});\n`;
                }
            });
        });
        code += `\n`;
    }

    // Step C: Sync & Export
    code += `// Synchronize models with the database\n`;
    code += `sequelize.sync();\n\n`;

    code += `module.exports = {\n`;
    exportNames.forEach((name, index) => {
        code += `  ${name}${index < exportNames.length - 1 ? "," : ""}\n`;
    });
    code += `};\n`;

    document.getElementById("code-output").textContent = code;
    if (window.Prism) {
        Prism.highlightElement(document.getElementById("code-output"));
    }
}

// --- 3. UI RENDERING & EVENT HANDLING ---
function renderUI() {
    const container = document.getElementById("tables-container");
    container.innerHTML = "";

    // Create a list of all table names for the relationship dropdowns
    const tableOptions = state.tables.map((t) => t.name).filter((name) => name);

    state.tables.forEach((table) => {
        const tableDiv = document.createElement("div");
        tableDiv.className = "table-card";

        // Table Header
        let html = `
      <div class="table-header">
        <input type="text" value="${table.name}" placeholder="Table Name" 
               oninput="updateTableName(${table.id}, this.value)"
               onchange="renderUI()">
        <button class="secondary-btn" onclick="addField(${table.id})">+ Add Field</button>
        <button class="danger-btn" onclick="removeTable(${table.id})">Remove Table</button>
      </div>
      <div class="fields-container">
    `;

        // Fields loop
        table.fields.forEach((field) => {
            html += `
        <div class="field-row">
          <input type="text" value="${field.name}" placeholder="Field name" 
                 oninput="updateField(${table.id}, ${field.id}, 'name', this.value)">
          <select onchange="updateField(${table.id}, ${field.id}, 'type', this.value)">
            ${dataTypes.map((type) => `<option value="${type}" ${field.type === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
          <label><input type="checkbox" ${field.primaryKey ? "checked" : ""} 
                 onchange="updateField(${table.id}, ${field.id}, 'primaryKey', this.checked)"> PK</label>
          <label><input type="checkbox" ${field.autoIncrement ? "checked" : ""} 
                 onchange="updateField(${table.id}, ${field.id}, 'autoIncrement', this.checked)"> AutoInc</label>
          <label><input type="checkbox" ${!field.allowNull ? "checked" : ""} 
                 onchange="updateField(${table.id}, ${field.id}, 'allowNull', !this.checked)"> Not Null</label>
          <button class="danger-btn" onclick="removeField(${table.id}, ${field.id})">X</button>
        </div>
      `;
        });
        html += `</div>`; // Close fields-container

        // Associations loop
        html += `<div class="associations-container">
               <h4>Relationships</h4>`;

        if (!table.associations) table.associations = [];
        table.associations.forEach((assoc) => {
            html += `
        <div class="assoc-row">
          <span>This table</span>
          <select onchange="updateAssoc(${table.id}, ${assoc.id}, 'type', this.value)">
            ${relationTypes.map((rt) => `<option value="${rt}" ${assoc.type === rt ? "selected" : ""}>${rt}</option>`).join("")}
          </select>
          <select onchange="updateAssoc(${table.id}, ${assoc.id}, 'target', this.value)">
            <option value="None">Select Target Table...</option>
            ${tableOptions.map((opt) => `<option value="${opt}" ${assoc.target === opt ? "selected" : ""}>${opt}</option>`).join("")}
          </select>
          <button class="danger-btn" onclick="removeAssoc(${table.id}, ${assoc.id})">X</button>
        </div>
      `;
        });

        html += `<button class="secondary-btn" onclick="addAssoc(${table.id})" style="margin-top:0.5rem; font-size:0.8rem;">+ Add Relationship</button>
             </div>`;

        tableDiv.innerHTML = html;
        container.appendChild(tableDiv);
    });

    generateSequelizeCode();
}

// --- 4. STATE MUTATION FUNCTIONS ---
window.updateTableName = (tableId, newName) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (table) table.name = newName;

    // FIX: Only update the code preview on keystroke.
    // Do NOT call renderUI() here, as it destroys the DOM and kills focus.
    generateSequelizeCode();
};
window.updateField = (tableId, fieldId, key, value) => {
    const table = state.tables.find((t) => t.id === tableId);
    const field = table.fields.find((f) => f.id === fieldId);
    if (field) field[key] = value;
    generateSequelizeCode();
};

window.updateAssoc = (tableId, assocId, key, value) => {
    const table = state.tables.find((t) => t.id === tableId);
    const assoc = table.associations.find((a) => a.id === assocId);
    if (assoc) assoc[key] = value;
    generateSequelizeCode();
};

window.addTable = () => {
    state.tables.push({
        id: Date.now(),
        name: `Table${state.tables.length + 1}`,
        fields: [{ id: Date.now(), name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true, allowNull: false }],
        associations: [],
    });
    renderUI();
};

window.removeTable = (tableId) => {
    state.tables = state.tables.filter((t) => t.id !== tableId);
    renderUI();
};

window.addField = (tableId) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (table) {
        table.fields.push({ id: Date.now(), name: "", type: "STRING", primaryKey: false, autoIncrement: false, allowNull: true });
        renderUI();
    }
};

window.removeField = (tableId, fieldId) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (table) {
        table.fields = table.fields.filter((f) => f.id !== fieldId);
        renderUI();
    }
};

window.addAssoc = (tableId) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (table) {
        table.associations.push({ id: Date.now(), type: "belongsTo", target: "None" });
        renderUI();
    }
};

window.removeAssoc = (tableId, assocId) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (table) {
        table.associations = table.associations.filter((a) => a.id !== assocId);
        renderUI();
    }
};

// --- 5. INITIALIZATION & EXPORT ---
document.getElementById("add-table-btn").addEventListener("click", addTable);

document.getElementById("download-btn").addEventListener("click", () => {
    const code = document.getElementById("code-output").textContent;
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "db.js";
    a.click();
    URL.revokeObjectURL(url);
});

// Initial Render
renderUI();
