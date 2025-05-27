document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;

    const container = document.getElementById("tableContainer");
    container.innerHTML = "";

    let currentTable;
    let tbody;
    let headers = [];
    let currentSection = "";
    let colMap = {};
    let totals = { unitario: 0, sal: 0, importeSal: 0, importeFinire: 0 };

    const createTable = (titleText) => {
      const tableWrapper = document.createElement("div");
      tableWrapper.className = "table-wrapper";

      if (titleText) {
        const title = document.createElement("h4");
        title.textContent = titleText;
        tableWrapper.appendChild(title);
      }

      const table = document.createElement("table");
      table.className = "table table-bordered table-sm mb-4";

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      headers.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });

      ["SAL %", "Importe SAL", "A FINIRE %", "Importe A FINIRE"].forEach(
        (name) => {
          const th = document.createElement("th");
          th.textContent = name;
          if (name === "SAL %") th.classList.add("col-sal");
          headerRow.appendChild(th);
        }
      );

      thead.appendChild(headerRow);
      table.appendChild(thead);

      tbody = document.createElement("tbody");
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      container.appendChild(tableWrapper);

      return { table, tbody, tableWrapper };
    };

    const addTotalRow = () => {
      if (tbody && tbody.children.length > 0) {
        const totalRow = document.createElement("tr");
        totalRow.className = "total-row table-info";

        headers.forEach((_, i) => {
          const td = document.createElement("td");
          if (i === colMap.unitario)
            td.textContent = totals.unitario.toFixed(2);
          else td.textContent = "";
          td.classList.add("text-end");
          totalRow.appendChild(td);
        });

        // Columnas SAL adicionales
        const emptyTd = document.createElement("td");
        emptyTd.textContent = "";
        totalRow.appendChild(emptyTd); // SAL %

        const salTd = document.createElement("td");
        salTd.textContent = totals.importeSal.toFixed(2);
        salTd.classList.add("text-end");
        totalRow.appendChild(salTd); // Importe SAL

        const finirePercentTd = document.createElement("td");
        finirePercentTd.textContent = "";
        totalRow.appendChild(finirePercentTd); // A FINIRE %

        const finireTd = document.createElement("td");
        finireTd.textContent = totals.importeFinire.toFixed(2);
        finireTd.classList.add("text-end");
        totalRow.appendChild(finireTd); // Importe A FINIRE

        tbody.appendChild(totalRow);
      }
    };

    const updateTotals = () => {
      totals = { unitario: 0, sal: 0, importeSal: 0, importeFinire: 0 };

      Array.from(tbody.querySelectorAll("tr:not(.total-row)")).forEach(
        (row) => {
          const cells = row.cells;
          const importeUnitario =
            parseFloat(cells[colMap.unitario]?.textContent) || 0;
          const salInput = row.querySelector(".col-sal input");
          const salPercent = parseFloat(salInput?.value) || 0;
          const importeSal =
            parseFloat(cells[headers.length + 1]?.textContent) || 0;
          const importeFinire =
            parseFloat(cells[headers.length + 3]?.textContent) || 0;

          totals.unitario += importeUnitario;
          totals.sal += salPercent;
          totals.importeSal += importeSal;
          totals.importeFinire += importeFinire;
        }
      );
    };

    const filteredJson = json.filter((row) =>
      row.some((cell) => cell !== undefined && cell !== null && cell !== "")
    );

    filteredJson.forEach((row, index) => {
      if (index === 0) {
        headers = row;
        colMap = {
          unitario: headers.indexOf("IMPORTE unitario"),
          totale: headers.indexOf("IMPORTE totale CONTRACTO"),
        };
        return;
      }

      const isTitleRow = row[0] && row[1] && row.slice(2).every((v) => !v);
      const isEmptyRow = row.every((cell) => !cell && cell !== 0);

      if (isEmptyRow && tbody && tbody.children.length > 0) {
        addTotalRow();
        totals = { unitario: 0, sal: 0, importeSal: 0, importeFinire: 0 };
        return;
      }

      if (isTitleRow) {
        if (tbody && tbody.children.length > 0) {
          addTotalRow();
          totals = { unitario: 0, sal: 0, importeSal: 0, importeFinire: 0 };
        }
        currentSection = `${row[0]} ${row[1]}`.trim();
        currentTable = createTable(currentSection);
        return;
      }

      const tr = document.createElement("tr");

      headers.forEach((_, i) => {
        const td = document.createElement("td");
        const value = row[i];
        td.textContent =
          typeof value === "number" ? value.toFixed(2) : value || "";
        if (typeof value === "number") td.classList.add("text-end");
        tr.appendChild(td);
      });

      const importeUnitario = parseFloat(row[colMap.unitario]) || 0;
      const importeTotale = parseFloat(row[colMap.totale]) || 0;

      const salTd = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "form-control text-end col-sal";
      input.value = "0";
      salTd.appendChild(input);

      const salImportoTd = document.createElement("td");
      salImportoTd.className = "text-end";
      salImportoTd.textContent = "0.00";

      const finirePercentTd = document.createElement("td");
      finirePercentTd.className = "text-end";
      finirePercentTd.textContent = "100.00%";

      const finireImportoTd = document.createElement("td");
      finireImportoTd.className = "text-end";
      finireImportoTd.textContent = importeUnitario.toFixed(2);

      input.addEventListener("input", () => {
        let val = parseFloat(input.value.replace(",", ".")) || 0;
        val = Math.min(Math.max(val, 0), 100);
        input.value = val;

        const salAmount = (importeUnitario * val) / 100;
        const finireAmount = importeUnitario - salAmount;

        salImportoTd.textContent = salAmount.toFixed(2);
        finirePercentTd.textContent = (100 - val).toFixed(2) + "%";
        finireImportoTd.textContent = finireAmount.toFixed(2);

        updateTotals();

        // Actualizar fila de totales si existe
        const totalRow = tbody.querySelector(".total-row");
        if (totalRow) {
          addTotalRow();
          tbody.removeChild(totalRow);
        }
      });

      tr.appendChild(salTd);
      tr.appendChild(salImportoTd);
      tr.appendChild(finirePercentTd);
      tr.appendChild(finireImportoTd);

      currentTable.tbody.appendChild(tr);
      totals.unitario += importeUnitario;
    });

    if (tbody && tbody.children.length > 0) {
      addTotalRow();
    }
  };

  reader.readAsArrayBuffer(file);
});
