// js/TableRenderer.js
class TableRenderer {
  constructor(containerId, summaryTableGenerator, baseCalcColIndex) {
    this.container = document.getElementById(containerId);
    this.summaryTableGenerator = summaryTableGenerator;
    this.baseCalcColIndex = baseCalcColIndex;
    // Índices de columnas que siempre se totalizarán (basado en el original)
    this.autoTotalColumnIndexes = [4, 5, 6, 7];
    this.allTablesSalTotals = []; // Se mantiene aquí para cada instancia o si es un singleton, en la clase App
  }

  /**
   * Renderiza todas las tablas detalladas a partir de los datos del Excel.
   * @param {Array<Array<any>>} jsonDataRows - Las filas de datos del Excel.
   * @param {Array<string>} headers - Las cabeceras globales del Excel.
   */
  renderTables(jsonDataRows, headers) {
    this.container.innerHTML = "";
    this.allTablesSalTotals = [];

    let currentTableData = [];
    let currentSectionTitle = "";

    const isCellEmpty = (cell) =>
      cell === undefined || cell === null || String(cell).trim() === "";

    jsonDataRows.forEach((row) => {
      const isNewSectionHeader = !isCellEmpty(row[0]) && !isCellEmpty(row[1]);
      const isCompletelyEmptyRow = row.every((cell) => isCellEmpty(cell));

      if (
        (isNewSectionHeader || isCompletelyEmptyRow) &&
        currentTableData.length > 0
      ) {
        // Captura el objeto con el ID y el total
        const tableData = this._createAndAppendTable(
          currentSectionTitle,
          currentTableData,
          headers
        );

        // Ahora tienes acceso a los datos y puedes guardarlos
        if (tableData) {
          this.allTablesSalTotals.push({
            sectionId: tableData.sectionId,
            title: currentSectionTitle,
            salTotal: tableData.total,
          });
        }
        currentTableData = [];
      }

      if (isNewSectionHeader) {
        currentSectionTitle = `${row[0] || ""} ${row[1] || ""}`.trim();
      } else if (isCompletelyEmptyRow) {
        currentSectionTitle = "";
      } else {
        currentTableData.push(row);
        if (currentTableData.length === 1 && currentSectionTitle === "") {
          currentSectionTitle = "";
        }
      }
    });

    if (currentTableData.length > 0) {
      // Captura el objeto de la última tabla
      const tableData = this._createAndAppendTable(
        currentSectionTitle,
        currentTableData,
        headers
      );

      if (tableData) {
        this.allTablesSalTotals.push({
          sectionId: tableData.sectionId,
          title: currentSectionTitle,
          salTotal: tableData.total,
        });
      }
    }
    this.summaryTableGenerator.generate(this.allTablesSalTotals);
  }
  /**
   * Crea y añade una tabla HTML detallada al contenedor.
   * @param {string} titleText - Título de la tabla.
   * @param {Array<Array<any>>} dataRows - Filas de datos para la tabla.
   * @param {Array<string>} tableHeaders - Cabeceras de la tabla (originales + SAL).
   * @private
   */
  _createAndAppendTable(titleText, dataRows, tableHeaders) {
    if (dataRows.length === 0) {
      return;
    }

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-wrapper original-table-wrapper";

    // Declara y asigna el ID único
    const uniqueId = `original-table-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;
    tableWrapper.id = uniqueId;

    if (titleText) {
      const title = document.createElement("h4");
      title.textContent = titleText;
      tableWrapper.appendChild(title);
    }

    const table = document.createElement("table");
    table.className = "table table-bordered table-sm mb-1";
    table.setAttribute("data-section-title", titleText);

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    tableHeaders.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col;
      headerRow.appendChild(th);
    });

    ["SAL %", "Importo SAL", "A FINIRE %", "Importo A FINIRE"].forEach(
      (name) => {
        const th = document.createElement("th");
        th.textContent = name;
        if (name === "SAL %") th.classList.add("col-sal");
        headerRow.appendChild(th);
      }
    );

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    this.container.appendChild(tableWrapper);

    let currentTableSalTotal = 0; // Variable para almacenar el total de esta tabla

    // Lógica para llenar la tabla
    dataRows.forEach((row) => {
      const tr = document.createElement("tr");
      // ... (el resto del código para crear las celdas de la fila) ...
      tableHeaders.forEach((_, i) => {
        const td = document.createElement("td");
        const value = row[i];
        td.textContent =
          typeof value === "number" && !isNaN(value)
            ? value.toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : value || "";
        tr.appendChild(td);
      });

      const baseCalcValue =
        this.baseCalcColIndex !== -1 &&
        !isNaN(parseFloat(row[this.baseCalcColIndex]))
          ? parseFloat(row[this.baseCalcColIndex])
          : 0;

      const salTd = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "form-control col-sal sal-input";
      input.value = "0";
      input.setAttribute("data-base-value", baseCalcValue);
      salTd.appendChild(input);

      const salImportoTd = document.createElement("td");
      salImportoTd.className = "sal-importo";
      salImportoTd.textContent = "0,00";

      const finirePercentTd = document.createElement("td");
      finirePercentTd.textContent = "%";

      const finireImportoTd = document.createElement("td");
      finireImportoTd.textContent = baseCalcValue.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      input.addEventListener("input", () => {
        let val = parseFloat(input.value.replace(",", "."));
        val = isNaN(val) ? 0 : val;
        input.value = val;

        const percent = val / 100;
        salImportoTd.textContent = (baseCalcValue * percent).toLocaleString(
          "it-IT",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        );
        finirePercentTd.textContent = ((1 - percent) * 100).toFixed(2) + "%";
        finireImportoTd.textContent = (
          baseCalcValue *
          (1 - percent)
        ).toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        // Cuando cambie el valor, se recalcula el total de la tabla
        currentTableSalTotal = this._calculateTableSalTotal(tbody);
        updateTableTotals(currentTableSalTotal);
      });

      tr.appendChild(salTd);
      tr.appendChild(salImportoTd);
      tr.appendChild(finirePercentTd);
      tr.appendChild(finireImportoTd);

      tbody.appendChild(tr);
    });

    // Función interna para actualizar los totales en la fila de totales
    const updateTableTotals = (total) => {
      const totalRowElement = tbody.querySelector(".total-row");
      if (totalRowElement) {
        const totalCells = totalRowElement.querySelectorAll("td");
        totalCells[tableHeaders.length + 1].textContent = total.toLocaleString(
          "it-IT",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        );
      }
    };

    const totalRow = document.createElement("tr");
    totalRow.classList.add("total-row", "table-info");
    for (let i = 0; i < tableHeaders.length + 4; i++) {
      totalRow.appendChild(document.createElement("td"));
    }
    tbody.appendChild(totalRow);

    // Aquí es donde devolvemos el ID y el total
    return { sectionId: uniqueId, total: currentTableSalTotal };
    console.log({sectionId})
  }
  _saveSalPercentages() {
    // Recolectar todos los datos SAL% de todas las tablas
    const allTablesData = [];

    // Recorrer todas las tablas originales
    this.container
      .querySelectorAll(".original-table-wrapper")
      .forEach((wrapper) => {
        const tableId = wrapper.id;
        const salInputs = wrapper.querySelectorAll("input.sal-input");
        const salValues = Array.from(salInputs).map(
          (input) => parseFloat(input.value) || 0
        );

        allTablesData.push({
          tableId,
          salValues,
        });
      });

    localStorage.setItem("salPercentagesData", JSON.stringify(allTablesData));
  }
}
