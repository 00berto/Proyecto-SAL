document.getElementById("excelFile").addEventListener("change", function (e) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const tableContainer = document.getElementById("excelTable");
    tableContainer.innerHTML = "";

    const headers = json[0];
    let table, thead, tbody;

    function createNewTable() {
      table = document.createElement("table");
      table.classList.add("excel-table");

      thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headers.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      tbody = document.createElement("tbody");
      table.appendChild(tbody);
    }

    createNewTable();

    for (let i = 1; i < json.length; i++) {
      const rowData = json[i];

      if (rowData.every((cell) => cell === undefined || cell === "")) {
        updateTableTotals(table);
        tableContainer.appendChild(table);
        createNewTable();
        continue;
      }

      const row = document.createElement("tr");
      headers.forEach((_, j) => {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.value = rowData[j] || "";

        input.addEventListener("input", () => {
          const rowCells = input.closest("tr").querySelectorAll("td");

          const percentSAL =
            parseFloat(rowCells[8]?.querySelector("input")?.value) || 0;
          const importoTotContratto =
            parseFloat(rowCells[7]?.querySelector("input")?.value) || 0;

          // Calcolo Importo SAL (colonna 9)
          const importoSALCell = rowCells[9]?.querySelector("input");
          if (importoSALCell) {
            importoSALCell.value = (
              (percentSAL / 100) *
              importoTotContratto
            ).toFixed(2);
          }

          // Calcolo % A FINIRE (colonna 10)
          const percentAFinireCell = rowCells[10]?.querySelector("input");
          if (percentAFinireCell) {
            percentAFinireCell.value = (100 - percentSAL).toFixed(2);
          }

          // Calcolo Importo A FINIRE (colonna 11)
          const importoAFinireCell = rowCells[11]?.querySelector("input");
          if (importoAFinireCell) {
            importoAFinireCell.value = (
              importoTotContratto -
              (percentSAL / 100) * importoTotContratto
            ).toFixed(2);
          }

          updateTableTotals(table);
        });

        cell.appendChild(input);
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    }

    updateTableTotals(table);
    tableContainer.appendChild(table);
  };
  reader.readAsArrayBuffer(e.target.files[0]);
});

function updateTableTotals(table) {
  const rows = table.querySelectorAll("tbody tr");
  const totals = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    cells.forEach((cell, index) => {
      const input = cell.querySelector("input");
      const value = parseFloat(input.value) || 0;
      if (!totals[index]) totals[index] = 0;
      totals[index] += value;
    });
  });

  let tfoot = table.querySelector("tfoot");
  if (!tfoot) {
    tfoot = document.createElement("tfoot");
    const footerRow = document.createElement("tr");
    totals.forEach((_, index) => {
      const td = document.createElement("td");
      td.classList.add("footer-cell");
      footerRow.appendChild(td);
    });
    tfoot.appendChild(footerRow);
    table.appendChild(tfoot);
  }

  const footerCells = tfoot.querySelectorAll("td");
  totals.forEach((total, index) => {
    footerCells[index].textContent = total.toFixed(2);
  });
}
