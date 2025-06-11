// js/SalTableManager.js
class SalTableManager {
  constructor(containerId, summaryTableGenerator) {
    this.container = document.getElementById(containerId);
    this.summaryTableGenerator = summaryTableGenerator;
    this.salTableCounter = 0;
    this.generatedSalTables = []; // Para almacenar las referencias a las tablas SAL generadas
    this.checkboxesContainer = document.getElementById("salTablesCheckboxes");
    this.selectionSection = document.getElementById("salTablesSelection");
  }

  /**
   * Crea y añade una nueva tabla que contiene solo las columnas 'SAL %' e 'Importo SAL',
   * conservando la estructura original y los valores de las tablas principales.
   * Cada nueva tabla tendrá un título como "SAL 1", "SAL 2", etc.
   */
  createSalCopyTable() {
    this.salTableCounter++;
    const newTableTitle = `SAL ${this.salTableCounter}`;

    const salTableWrapper = document.createElement("div");
    salTableWrapper.className = "table-wrapper sal-copy-table-wrapper";
    const salTableId = `sal-copy-table-${this.salTableCounter}`;
    salTableWrapper.id = salTableId;

    const title = document.createElement("h4");
    title.textContent = newTableTitle;
    salTableWrapper.appendChild(title);

    const newSalTable = document.createElement("table");
    newSalTable.className = "table table-bordered table-sm mb-1 sal-copy-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    ["Sección", "SAL %", "Importo SAL"].forEach((name) => {
      const th = document.createElement("th");
      th.textContent = name;
      if (name === "Importo SAL") th.classList.add("text-end");
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    newSalTable.appendChild(thead);

    const tbody = document.createElement("tbody");
    newSalTable.appendChild(tbody);
    salTableWrapper.appendChild(newSalTable);
    this.container.appendChild(salTableWrapper);

    this._populateSalTable(tbody, salTableId); // Pasar el tbody y el ID de la tabla para el checkbox

    // Añadir checkbox para esta nueva tabla SAL
    this._addSalTableCheckbox(salTableId, newTableTitle);
  }

  /**
   * Rellena el tbody de la tabla SAL con los datos de las tablas originales.
   * @param {HTMLElement} tbody - El tbody de la nueva tabla SAL.
   * @param {string} salTableId - El ID de la nueva tabla SAL (para el checkbox).
   * @private
   */
  _populateSalTable(tbody) {
    document
      .querySelectorAll("#tableContainer .table-wrapper.original-table-wrapper")
      .forEach((originalTableWrapper) => {
        const originalTable = originalTableWrapper.querySelector("table");
        const originalTbody = originalTable.querySelector("tbody");
        const originalSectionTitle =
          originalTable.getAttribute("data-section-title") || "Sin Título";

        // Encuentra la longitud de las cabeceras originales para saber dónde empiezan las columnas SAL
        const originalHeadersLength =
          originalTable.querySelector("thead tr").children.length - 4; // Menos las 4 columnas SAL añadidas

        originalTbody
          .querySelectorAll("tr:not(.total-row)")
          .forEach((originalRow) => {
            const newRow = document.createElement("tr");
            const originalCells = originalRow.querySelectorAll("td");

            const sectionTitleTd = document.createElement("td");
            sectionTitleTd.textContent = originalSectionTitle;
            newRow.appendChild(sectionTitleTd);

            const originalSalInput =
              originalCells[originalHeadersLength]?.querySelector(
                "input.sal-input"
              );
            const salPercentValue = originalSalInput
              ? originalSalInput.value
              : "0";
            const salPercentTd = document.createElement("td");
            salPercentTd.textContent = `${parseFloat(salPercentValue).toFixed(
              2
            )}%`;
            salPercentTd.classList.add("text-end");
            newRow.appendChild(salPercentTd);

            const salImportoValue =
              originalCells[originalHeadersLength + 1]?.textContent;
            const salImportoTd = document.createElement("td");
            salImportoTd.textContent = salImportoValue || "0,00";
            salImportoTd.classList.add("text-end");
            newRow.appendChild(salImportoTd);

            tbody.appendChild(newRow);
          });

        // Añadir una fila de total para esta sección en la nueva tabla SAL copia
        const totalOriginalRow = originalTbody.querySelector(".total-row");
        if (totalOriginalRow) {
          const newTotalRow = document.createElement("tr");
          newTotalRow.classList.add(
            "table-info",
            "fw-bold",
            "sal-copy-total-row"
          );

          const originalHeadersLength =
            originalTable.querySelector("thead tr").children.length - 4;

          const totalLabelTd = document.createElement("td");
          totalLabelTd.textContent = `${originalSectionTitle} Total:`;
          newTotalRow.appendChild(totalLabelTd);

          const totalSalPercentTd = document.createElement("td");
          const originalTotalSalPercentText =
            totalOriginalRow.children[originalHeadersLength]?.textContent;
          totalSalPercentTd.textContent =
            originalTotalSalPercentText || "0,00%";
          totalSalPercentTd.classList.add("text-end");
          newTotalRow.appendChild(totalSalPercentTd);

          const totalImportoSalTd = document.createElement("td");
          const originalTotalImportoSalText =
            totalOriginalRow.children[originalHeadersLength + 1]?.textContent;
          totalImportoSalTd.textContent = originalTotalImportoSalText || "0,00";
          totalImportoSalTd.classList.add("text-end");
          newTotalRow.appendChild(totalImportoSalTd);

          tbody.appendChild(newTotalRow);
        }
      });

    // Añadir una fila de gran total final para esta nueva tabla SAL copia
    const finalGrandTotalRow = document.createElement("tr");
    finalGrandTotalRow.classList.add("table-primary", "fw-bold");

    const grandTotalLabelTd = document.createElement("td");
    grandTotalLabelTd.textContent = "TOTAL GLOBAL SAL:";
    grandTotalLabelTd.colSpan = 1;
    finalGrandTotalRow.appendChild(grandTotalLabelTd);

    const grandTotalPercentTd = document.createElement("td");
    grandTotalPercentTd.textContent = ""; // No hay un porcentaje global significativo aquí
    finalGrandTotalRow.appendChild(grandTotalPercentTd);

    const grandTotalValueTd = document.createElement("td");
    // Obtener el gran total de la tabla resumen
    const totalSummaryTable = document.getElementById("summaryTableWrapper");
    if (totalSummaryTable) {
      const lastRow = totalSummaryTable.querySelector("tbody tr:last-child");
      if (lastRow && lastRow.children.length > 1) {
        grandTotalValueTd.textContent = lastRow.children[1].textContent;
      }
    } else {
      grandTotalValueTd.textContent = "0,00";
    }
    grandTotalValueTd.classList.add("text-end");
    finalGrandTotalRow.appendChild(grandTotalValueTd);

    tbody.appendChild(finalGrandTotalRow);
  }

  /**
   * Añade un checkbox a la sección de selección para una tabla SAL recién creada.
   * @param {string} id - El ID del wrapper de la tabla SAL.
   * @param {string} title - El título de la tabla SAL.
   * @private
   */
  _addSalTableCheckbox(id, title) {
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "form-check form-check-inline";

    const checkboxInput = document.createElement("input");
    checkboxInput.type = "checkbox";
    checkboxInput.className = "form-check-input";
    checkboxInput.id = `checkbox-${id}`;
    checkboxInput.value = id;
    checkboxInput.checked = true; // Por defecto, se selecciona

    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "form-check-label";
    checkboxLabel.htmlFor = `checkbox-${id}`;
    checkboxLabel.textContent = title;

    checkboxDiv.appendChild(checkboxInput);
    checkboxDiv.appendChild(checkboxLabel);
    this.checkboxesContainer.appendChild(checkboxDiv);

    this.selectionSection.style.display = "block"; // Mostrar la sección de selección

    this.generatedSalTables.push({
      id: id,
      title: title,
      element: document.getElementById(id),
    });
  }

  /**
   * Limpia todas las tablas SAL generadas y sus checkboxes.
   */
  reset() {
    this.salTableCounter = 0;
    this.generatedSalTables = [];
    this.checkboxesContainer.innerHTML = "";
    this.selectionSection.style.display = "none";
    // Eliminar las tablas SAL del DOM
    document
      .querySelectorAll(".sal-copy-table-wrapper")
      .forEach((el) => el.remove());
  }

  /**
   * Obtiene los IDs de las tablas SAL seleccionadas por el usuario.
   * @returns {string[]} Un array de IDs de las tablas SAL seleccionadas.
   */
  getSelectedSalTableIds() {
    return Array.from(
      this.checkboxesContainer.querySelectorAll(
        "input[type='checkbox']:checked"
      )
    ).map((checkbox) => checkbox.value);
  }
}
