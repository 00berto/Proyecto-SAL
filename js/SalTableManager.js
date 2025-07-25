// js/SalTableManager.js
class SalTableManager {
  constructor(
    salCopiesContainerId,
    summaryTableGenerator,
    checkboxesContainer,
    selectionSectionDiv
  ) {
    this.container = document.getElementById(salCopiesContainerId);
    this.summaryTableGenerator = summaryTableGenerator;
    this.salTableCounter = 0;
    this.generatedSalTables = []; // Stores { id, title, element }
    this.checkboxesContainer = checkboxesContainer;
    this.selectionSection = selectionSectionDiv;
  }

  createSalCopyTable() {
    this.salTableCounter++;
    const newTableTitle = `SAL ${this.salTableCounter}`;
    const salTableId = `sal-copy-table-${this.salTableCounter}`;

    const salTableWrapper = document.createElement("div");
    salTableWrapper.className = "table-wrapper sal-copy-table-wrapper";
    salTableWrapper.id = salTableId;

    const title = document.createElement("h4");
    title.textContent = newTableTitle;
    salTableWrapper.appendChild(title);

    const newSalTable = document.createElement("table");
    newSalTable.className = "table table-bordered table-sm mb-1 sal-copy-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    ["SAL %", "Importo SAL"].forEach((name) => {
      const th = document.createElement("th");
      th.textContent = name;
      th.classList.add("text-center"); // Centered alignment for SAL headers
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    newSalTable.appendChild(thead);

    const tbody = document.createElement("tbody");
    newSalTable.appendChild(tbody);
    salTableWrapper.appendChild(newSalTable);
    this.container.appendChild(salTableWrapper);

    this.generatedSalTables.push({
      // Agregado para que la tabla esté en el array antes de poblar
      id: salTableId,
      title: newTableTitle,
      element: salTableWrapper,
    });

    this._populateSalTable(tbody);
    this._addSalTableCheckbox(salTableId, newTableTitle); // this adds to generatedSalTables again, potential duplicate.
    // Let's ensure generatedSalTables.push happens only once.
    // Moved it up before populateSalTable.
    this._validateSalRowsBetweenTables();
  }
  deleteLastSalTable() {
    if (this.salTableCounter > 0) {
      const lastTableInfo = this.generatedSalTables.pop(); // Removes from array
      if (lastTableInfo) {
        const tableElement = lastTableInfo.element;
        const checkboxElement = document.getElementById(
          `checkbox-${lastTableInfo.id}`
        );

        if (tableElement && tableElement.parentNode) {
          tableElement.parentNode.removeChild(tableElement);
        }

        if (checkboxElement && checkboxElement.parentNode) {
          checkboxElement.parentNode.removeChild(checkboxElement);
        }

        this.salTableCounter--;

        if (this.salTableCounter === 0) {
          this.selectionSection.style.display = "none";
        }
      }

      // Verifica SAL% después de eliminar
      this._validateSalRowsBetweenTables();
    } else {
      alert("Nussuna tabella SAL da eliminare.");
    }
  }

  _populateSalTable(tbody) {
    // Clear tbody before populating
    tbody.innerHTML = "";

    const originalTableWrappers = document.querySelectorAll(
      "#tableContainer .table-wrapper.original-table-wrapper"
    );
    const totalOriginalTables = originalTableWrappers.length;

    originalTableWrappers.forEach((originalTableWrapper, sectionIndex) => {
      const originalTable = originalTableWrapper.querySelector("table");
      const originalTbody = originalTable.querySelector("tbody");
      const originalTitleElement = originalTableWrapper.querySelector("h4");

      const originalHeadersLength =
        originalTable.querySelector("thead tr").children.length - 4;

      // Calculate SAL% total for this section before creating rows
      let currentSectionSalPercentTotal = 0;
      originalTbody
        .querySelectorAll("tr:not(.total-row)")
        .forEach((originalRow) => {
          const originalCells = originalRow.querySelectorAll("td");
          const originalSalInput =
            originalCells[originalHeadersLength]?.querySelector(
              "input.sal-input"
            );
          const salPercentValue = parseFloat(
            originalSalInput ? originalSalInput.value : "0"
          );
          currentSectionSalPercentTotal += salPercentValue;
        });

      // Determine if there's a percentage error for this section
      const isSalPercentError =
        currentSectionSalPercentTotal > 100.0001 ||
        currentSectionSalPercentTotal < -0.0001;

      // Add empty row before section header if applicable
      if (
        originalTitleElement &&
        (sectionIndex > 0 || totalOriginalTables > 1)
      ) {
        const emptySectionSpacerRow = document.createElement("tr");
        const emptySectionSpacerCell = document.createElement("td");
        emptySectionSpacerCell.colSpan = 2; // Ocupa las 2 columnas
        emptySectionSpacerRow.appendChild(emptySectionSpacerCell);
        tbody.appendChild(emptySectionSpacerRow);

        // Add section header
        const sectionHeaderRow = document.createElement("tr");
        sectionHeaderRow.classList.add("table-section-header");
        const sectionHeaderCell = document.createElement("td");
        sectionHeaderCell.colSpan = 2;
        sectionHeaderCell.textContent = originalTitleElement.textContent;
        sectionHeaderCell.classList.add("total-row");
        sectionHeaderCell.style.backgroundColor = "#e9ecef";
        sectionHeaderRow.appendChild(sectionHeaderCell);
        tbody.appendChild(sectionHeaderRow);
      }

      // Iterate over main table rows to create SAL table rows
      originalTbody
        .querySelectorAll("tr:not(.total-row)")
        .forEach((originalRow) => {
          const newRow = document.createElement("tr");
          const originalCells = originalRow.querySelectorAll("td");

          const originalSalInput =
            originalCells[originalHeadersLength]?.querySelector(
              "input.sal-input"
            );
          const salPercentValue = parseFloat(
            originalSalInput ? originalSalInput.value : "0"
          );

          const salPercentTd = document.createElement("td");
          salPercentTd.textContent = `${salPercentValue.toFixed(2)}%`;
          salPercentTd.classList.add("text-center");

          // NOTE: The table-danger for individual cell value > 100%
          // and table-warning for prev vs curr will be handled in _validateSalRowsBetweenTables
          // This ensures _populateSalTable just creates the cells.

          newRow.appendChild(salPercentTd);

          const salImportoValue =
            originalCells[originalHeadersLength + 1]?.textContent;
          const salImportoTd = document.createElement("td");
          salImportoTd.textContent = salImportoValue || "0,00";
          salImportoTd.classList.add("text-center");
          newRow.appendChild(salImportoTd);

          tbody.appendChild(newRow);
        });

      const totalOriginalRow = originalTbody.querySelector(".total-row");
      if (totalOriginalRow) {
        const newTotalRow = document.createElement("tr");
        newTotalRow.classList.add(
          "table-info",
          "fw-bold",
          "sal-copy-total-row"
        );

        const totalSalPercentTd = document.createElement("td");
        // DEJA ESTA CELDA DEL TOTAL DE SECCIÓN SIEMPRE VACÍA
        totalSalPercentTd.textContent = "";
        // PERO APLICA LA CLASE 'table-danger' A LA FILA COMPLETA SI HAY UN ERROR EN EL TOTAL DE LA SECCIÓN
        if (isSalPercentError) {
          newTotalRow.classList.add("table-danger");
        } else {
          newTotalRow.classList.remove("table-danger");
        }

        newTotalRow.appendChild(totalSalPercentTd);

        const totalImportoSalTd = document.createElement("td");
        const originalTotalImportoSalText =
          totalOriginalRow.children[totalOriginalRow.children.length - 1]
            ?.textContent;
        totalImportoSalTd.textContent = originalTotalImportoSalText || "0,00";
        totalImportoSalTd.classList.add("text-center");
        newTotalRow.appendChild(totalImportoSalTd);

        tbody.appendChild(newTotalRow);
      }
    });

    // Separator and Global SAL Total (no changes needed, assumed these parts are fine)
    const grandTotalSeparatorRow = document.createElement("tr");
    const grandTotalSeparatorCell = document.createElement("td");
    grandTotalSeparatorCell.colSpan = 2;
    grandTotalSeparatorCell.style.height = "20px";
    grandTotalSeparatorCell.style.borderTop = "2px dashed #007bff";
    grandTotalSeparatorCell.style.backgroundColor = "#f0f8ff";
    grandTotalSeparatorRow.appendChild(grandTotalSeparatorCell);
    tbody.appendChild(grandTotalSeparatorRow);

    const finalGrandTotalRow = document.createElement("tr");
    finalGrandTotalRow.classList.add("table-primary", "fw-bold");

    const grandTotalLabelTd = document.createElement("td");
    grandTotalLabelTd.textContent = "";
    grandTotalLabelTd.colSpan = 1;
    finalGrandTotalRow.appendChild(grandTotalLabelTd);

    const grandTotalValueTd = document.createElement("td");
    const totalSummaryTable = document.getElementById("summaryTableWrapper");
    if (totalSummaryTable) {
      const lastRow = totalSummaryTable.querySelector("tbody tr:last-child");
      if (lastRow && lastRow.children.length > 1) {
        grandTotalValueTd.textContent = lastRow.children[1].textContent;
      }
    } else {
      grandTotalValueTd.textContent = "0,00";
    }
    grandTotalValueTd.classList.add("text-center");
    finalGrandTotalRow.appendChild(grandTotalValueTd);

    tbody.appendChild(finalGrandTotalRow);
  }

  _validateSalRowsBetweenTables() {
    const tables = this.generatedSalTables;

    // Lógica para limpiar si solo queda 1 tabla o ninguna
    if (tables.length < 2) {
      if (tables.length === 1) {
        const currentTableBody = tables[0].element.querySelector("table tbody");
        if (currentTableBody) {
          // Filtrar solo las celdas de datos para limpiar
          const dataCells = Array.from(currentTableBody.querySelectorAll("tr"))
            .filter(
              (tr) =>
                !tr.classList.contains("total-row") &&
                !tr.classList.contains("table-section-header") &&
                tr.children.length > 0
            )
            .map((tr) => tr.children[0]); // Solo la celda SAL %

          dataCells.forEach((cell) => {
            cell.classList.remove("table-warning", "table-danger");
            cell.removeAttribute("title");
            cell.style.cursor = "default";
          });
        }
      }
      return;
    }

    const prevTableInfo = tables[tables.length - 2];
    const currTableInfo = tables[tables.length - 1];

    const prevTable = prevTableInfo.element.querySelector("table");
    const currTable = currTableInfo.element.querySelector("table");

    if (!prevTable || !currTable) return;

    // Obtener SOLO las filas de datos (excluyendo totales, encabezados, espaciadores)
    const prevDataRows = Array.from(
      prevTable.querySelectorAll("tbody tr")
    ).filter(
      (tr) =>
        !tr.classList.contains("total-row") &&
        !tr.classList.contains("table-section-header") &&
        tr.children.length >= 2
    );

    const currDataRows = Array.from(
      currTable.querySelectorAll("tbody tr")
    ).filter(
      (tr) =>
        !tr.classList.contains("total-row") &&
        !tr.classList.contains("table-section-header") &&
        tr.children.length >= 2
    );

    const rowCount = Math.min(prevDataRows.length, currDataRows.length);

    // Reiniciar estados de las celdas de la tabla actual (currTable) antes de aplicar nuevas validaciones
    currDataRows.forEach((row) => {
      if (row.children.length > 0) {
        const salPercentCell = row.children[0]; // SAL % celda
        salPercentCell.classList.remove("table-warning", "table-danger");
        salPercentCell.removeAttribute("title");
        salPercentCell.style.cursor = "default";
      }
    });

    // --- Validación de SAL% entre tabla anterior y actual (SALn-1 vs SALn) y valor individual > 100% ---
    for (let i = 0; i < rowCount; i++) {
      const prevCell = prevDataRows[i].children[0]; // Índice 0 para SAL %
      const currCell = currDataRows[i].children[0]; // Índice 0 para SAL %

      if (!prevCell || !currCell) continue;

      const prevVal = this._parseNumber(prevCell.textContent.replace("%", ""));
      const currVal = this._parseNumber(currCell.textContent.replace("%", ""));

      // Prioridad: Valore > 100% (danger) > Valor < anterior (warning)
      if (currVal > 100.001) {
        // **NUEVA VALIDACIÓN CLIENTE: Valor individual de SAL% > 100%**
        currCell.classList.add("table-danger");
        currCell.title = "Valore SAL% superiore a 100%";
        currCell.style.cursor = "help";
      } else if (currVal < prevVal - 0.001) {
        // Tu validación original: Valor actual < valor anterior
        currCell.classList.add("table-warning");
        currCell.title = "Controllare Valore % inserito";
        currCell.style.cursor = "help";
      } else {
        // Si ninguna de las condiciones anteriores se cumple, limpiar cualquier estilo
        currCell.classList.remove("table-warning", "table-danger");
        currCell.removeAttribute("title");
        currCell.style.cursor = "default";
      }
    }

    // --- SECCIÓN ELIMINADA: Validación de "SUMA de SAL% en la COLUMNA de la ÚLTIMA TABLA" ---
    // Según tu petición de que "la clase solo en la celda con el error no en la columna",
    // esta sección (que aplicaba table-danger a todas las celdas si la suma superaba el 100%)
    // ha sido eliminada. La validación de la suma total por sección sigue en _populateSalTable
    // afectando la fila de TOTAL de la sección.

    // --- SECCIÓN ELIMINADA: Validación "Total por Fila Horizontalmente" (tu punto 4 anterior) ---
    // Este bloque ha sido removido según tu solicitud previa.
  }

  _addSalTableCheckbox(id, title) {
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "form-check form-check-inline";

    const checkboxInput = document.createElement("input");
    checkboxInput.type = "checkbox";
    checkboxInput.className = "form-check-input";
    checkboxInput.id = `checkbox-${id}`;
    checkboxInput.value = id;
    checkboxInput.checked = true;

    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "form-check-label";
    checkboxLabel.htmlFor = `checkbox-${id}`;
    checkboxLabel.textContent = title;

    checkboxDiv.appendChild(checkboxInput);
    checkboxDiv.appendChild(checkboxLabel);
    this.checkboxesContainer.appendChild(checkboxDiv);

    this.selectionSection.style.display = "block";
  }

  reset() {
    this.salTableCounter = 0;
    this.generatedSalTables = [];
    if (this.checkboxesContainer) {
      this.checkboxesContainer.innerHTML = "";
    }
    if (this.selectionSection) {
      this.selectionSection.style.display = "none";
    }

    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  getSelectedSalTableIds() {
    if (!this.checkboxesContainer) {
      console.warn("Contenedor de checkboxes SAL no encontrado.");
      return [];
    }
    return Array.from(
      this.checkboxesContainer.querySelectorAll(
        "input[type='checkbox']:checked"
      )
    ).map((checkbox) => checkbox.value);
  }

  _parseNumber(str) {
    if (!str) return 0;
    str = str.trim();
    if (str.includes(",")) {
      return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(str) || 0;
  }
}
