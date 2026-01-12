// certificados.js

const HISTORIAL_SAL_KEY = "historialSAL";

// Array que contendrá el historial de SAL
let certificatiPrecedenti =
  JSON.parse(localStorage.getItem(HISTORIAL_SAL_KEY)) || [];

/**
 * Guardar un nuevo SAL en el historial
 * @param {Object} salData - Datos obtenidos de salManager
 */
function saveSalToHistory(salData) {
  if (!salData) return;

  // Asegurarse de que totalGlobalSAL tenga un valor numérico
  salData.totalGlobalSAL = parseFloat(
    salData.totalGlobalSAL || salData.salTotal || 0
  );

  certificatiPrecedenti.push(salData);
  localStorage.setItem(
    HISTORIAL_SAL_KEY,
    JSON.stringify(certificatiPrecedenti)
  );

  updatePrecedentiTable();
  updateCertificatoHeader(
    certificatiPrecedenti[certificatiPrecedenti.length - 1]
  );
}

// /**
//  * Actualiza la tabla de SAL anteriores (precedenti)
//  */
// function updatePrecedentiTable() {
//   const tbody = document.querySelector("#precedenti-table tbody");
//   if (!tbody) return;

//   tbody.innerHTML = "";
//   let grandTotal = 0;

//   certificatiPrecedenti.forEach((item, index) => {
//     const total = parseFloat(item.totalGlobalSAL) || 0;
//     grandTotal += total;

//     const totalFormatted = total.toLocaleString("it-IT", {
//       style: "currency",
//       currency: "EUR",
//     });

//     const row = document.createElement("tr");
//     row.innerHTML = `
//       <td class="text-center">${index + 1}</td>
//       <td class="text-center">${item.fechaModificacion}</td>
//       <td class="text-end">${totalFormatted}</td>
//     `;
//     tbody.appendChild(row);
//   });

//   // Fila de total global
//   const totalRow = document.createElement("tr");
//   totalRow.classList.add("table-primary", "fw-bold");
//   totalRow.innerHTML = `
//     <td colspan="2" class="text-center">Totale</td>
//     <td class="text-end">${grandTotal.toLocaleString("it-IT", {
//       style: "currency",
//       currency: "EUR",
//     })}</td>
//   `;
//   tbody.appendChild(totalRow);
// }
function updatePrecedentiTable() {
  const tbody = document.querySelector("#precedenti-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  let grandTotal = 0;

  certificatiPrecedenti.forEach((item) => {
    const total = parseFloat(item.totalGlobalSAL) || 0;
    grandTotal += total;

    const totalFormatted = total.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
    });

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="text-center">${item.numeroSAL}</td>
      <td class="text-center">${item.fechaModificacion}</td>
      <td class="text-end">${totalFormatted}</td>
    `;
    tbody.appendChild(row);
  });

  // Fila de total global
  const totalRow = document.createElement("tr");
  totalRow.classList.add("table-primary", "fw-bold");
  totalRow.innerHTML = `
    <td colspan="2" class="text-center">Totale</td>
    <td class="text-end">${grandTotal.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
    })}</td>
  `;
  tbody.appendChild(totalRow);
}

/**
 * Actualiza el encabezado del certificado con el último SAL
 */
function updateCertificatoHeader(salData) {
  if (!salData) return;

  document.getElementById("numero-sal").textContent = salData.numeroSAL || "-";
  document.getElementById("data-sal").textContent =
    salData.fechaModificacion || "-";

  const total = parseFloat(salData.totalGlobalSAL) || 0;
  document.getElementById("importo-sal").textContent = total.toLocaleString(
    "it-IT",
    {
      style: "currency",
      currency: "EUR",
    }
  );
}

// ===== Inicialización al cargar la página =====
document.addEventListener("DOMContentLoaded", () => {
  // 1️⃣ Cargar datos de empresa/proyecto
  // 1️⃣ Cargar datos de empresa/proyecto
  const dati = JSON.parse(localStorage.getItem("certificatoDati")) || {};
  
  // Committente
  if (dati.committente) {
    document.getElementById("committenteRagione").textContent = dati.committente.ragioneSociale || "";
    document.getElementById("committenteIndirizzo").textContent = dati.committente.indirizzo || "";
    document.getElementById("committenteReferente").textContent = dati.committente.referente || "";
    document.getElementById("committenteRL").textContent = dati.committente.rlAndCse || "";
    document.getElementById("committenteDL").textContent = dati.committente.direttoreLavori || "";
    document.getElementById("committentePM").textContent = dati.committente.projectManager || "";

    // Signatures placeholders
    if(document.getElementById("committenteRL_Firma")) document.getElementById("committenteRL_Firma").textContent = dati.committente.rlAndCse || "";
    if(document.getElementById("committenteDL_Firma")) document.getElementById("committenteDL_Firma").textContent = dati.committente.direttoreLavori || "";
    if(document.getElementById("impresaRagione_Firma")) document.getElementById("impresaRagione_Firma").textContent = dati.impresa.ragioneSociale || "";
  }

  // Impresa
  if (dati.impresa) {
    document.getElementById("impresaRagione").textContent = dati.impresa.ragioneSociale || "";
    document.getElementById("impresaIndirizzo").textContent = dati.impresa.indirizzo || "";
    document.getElementById("impresaReferente").textContent = dati.impresa.direttoreLavori || "";
    // Note: ID impresaDL in HTML might need to check if it exists or maps to referente
    const impresaDLEl = document.getElementById("impresaDL");
    if(impresaDLEl) impresaDLEl.textContent = dati.impresa.direttoreLavori || ""; 
  }

  // Progetto
  if (dati.progetto) {
    document.getElementById("progettoDescrizione").textContent = dati.progetto.descrizione || "";
    document.getElementById("progettoIndirizzo").textContent = dati.progetto.indirizzo || "";
    
    // Format Dates
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
    };

    document.getElementById("dataInizio").textContent = formatDate(dati.progetto.dataInicio);
    document.getElementById("dataFine").textContent = formatDate(dati.progetto.dataFinePrevista);
  }

  // 2️⃣ Cargar todos los SAL del manager o localStorage
  const storedSalData = localStorage.getItem("currentProjectSalData");
  if (storedSalData) {
      const todosLosSal = JSON.parse(storedSalData);
      
      // Limpiar historial previo para evitar duplicados al recargar si se desea sincronización total
      // Ojo: si queremos persistencia histórica más allá de la sesión actual, habría que gestionar diferente.
      // Pero para este caso de uso parece que queremos reflejar el estado actual del proyecto.
      certificatiPrecedenti = []; 
      
      todosLosSal.forEach((salData) => {
        saveSalToHistory(salData);
        // updateCertificatoSalTable(salData); // Si se necesita, pero updateCertificatoSalTable está definida dentro de populateSalTable scope
      });
      // Importante: saveSalToHistory ya actualiza la tabla y el header
  } else if (
    window.salManager &&
    typeof window.salManager.getAllExportableSalData === "function"
  ) {
    const todosLosSal = window.salManager.getAllExportableSalData();
    todosLosSal.forEach((salData) => {
      // asignar número secuencial si no existe
      if (!salData.numeroSAL)
        salData.numeroSAL = certificatiPrecedenti.length + 1;
      // asignar fecha actual si no existe
      if (!salData.fechaModificacion)
        salData.fechaModificacion = new Date().toLocaleDateString("it-IT");
      saveSalToHistory(salData);
    });
  }

  // 3️⃣ Asegurarse que la tabla se renderice incluso si no hay SAL
  updatePrecedentiTable();

  // 4️⃣ Botón de descarga PDF
  document.getElementById("download").addEventListener("click", () => {
    const element = document.getElementById("certificato");
    html2pdf()
      .set({
        margin: 0.5,
        filename: "certificato_pagamento.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "cm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  });
  
  // Tabla assicurazioni
  const tbody = document.querySelector("#assicurazioni-table tbody");
  tbody.innerHTML = "";

  if (dati.assicurazioni && dati.assicurazioni.length > 0) {
    dati.assicurazioni.forEach((ass) => {
      const row = document.createElement("tr");

      const cellIndirizzo = document.createElement("td");
      cellIndirizzo.textContent = `Gli operai dell'impresa sono assicurati presso ${ass.indirizzo}`;
      row.appendChild(cellIndirizzo);

      const cellNumero = document.createElement("td");
      cellNumero.textContent = ass.numero;
      row.appendChild(cellNumero);

      tbody.appendChild(row);
    });
  } else {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="2" class="text-center">Nessuna assicurazione inserita</td>';
    tbody.appendChild(row);
  }

  // ===== Rellenar tabla SAL / Costi =====
  function populateSalTable(salDataArray) {
    const tbody = document.getElementById("salTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let grandTotal = 0;

    salDataArray.forEach((sal) => {
      if (!sal.items || !Array.isArray(sal.items)) return;

      sal.items.forEach((row) => {
        const tr = document.createElement("tr");

        const voce = row.voce || "";
        const quantita = row.quantita || 0;
        const prezzo = row.prezzo || 0;
        const totale = parseFloat(row.totale || quantita * prezzo);

        grandTotal += totale;

        tr.innerHTML = `
        <td>${voce}</td>
        <td>${quantita}</td>
        <td>${prezzo.toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</td>
        <td>${totale.toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</td>
      `;

        tbody.appendChild(tr);
      });
    });

    function updateCertificatoSalTable(salData) {
      if (!salData) return;

      // Aquí puedes mapear cada ítem de SAL a las celdas de la tabla
      document.getElementById("totaleA").textContent = formatCurrency(
        salData.lavoriAffidati
      );
      document.getElementById("totaleB").textContent = formatCurrency(
        salData.oneriSicurezza
      );
      document.getElementById("totaleC").textContent = formatCurrency(
        salData.variante1
      );
      document.getElementById("totaleD").textContent = formatCurrency(
        salData.corrispettivoAppalto
      );
      document.getElementById("totaleE").textContent = formatCurrency(
        salData.lavoriStrutturali
      );
      document.getElementById("totaleF").textContent = formatCurrency(
        salData.impiantoElettrico
      );
      document.getElementById("totaleG").textContent = formatCurrency(
        salData.impiantoMeccanico
      );
      document.getElementById("totaleH").textContent = formatCurrency(
        salData.odv1
      );
      document.getElementById("totaleI").textContent = formatCurrency(
        salData.oneriSicurezzaEseguiti
      );

      // Totali parziali
      document.getElementById("totaleJ").textContent = formatCurrency(
        salData.sommaParziale
      );
      document.getElementById("totaleK1").textContent = formatCurrency(
        salData.recuperoAnticipo
      );
      document.getElementById("totaleL1").textContent = formatCurrency(
        salData.ritenute10
      );
      document.getElementById("totaleL2").textContent = formatCurrency(
        salData.ritenute05
      );
      document.getElementById("totaleM").textContent = formatCurrency(
        salData.sommaDetrazioni
      );
      document.getElementById("totaleN").textContent = formatCurrency(
        salData.netto
      );
      document.getElementById("totaleO").textContent = formatCurrency(
        salData.accontiPrecedenti
      );
      document.getElementById("totaleP").textContent = formatCurrency(
        salData.arrotondamenti
      );

      document.getElementById("totaleRimanente").textContent = formatCurrency(
        salData.creditoImpresa
      );
    }

    function formatCurrency(value) {
      return parseFloat(value || 0).toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        style: "currency",
        currency: "EUR",
      });
    }

    // Totale generale
    document.getElementById("salTotal").textContent = grandTotal.toLocaleString(
      "it-IT",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  // ===== Llamar la función después de cargar los SALs =====
  if (
    window.salManager &&
    typeof window.salManager.getAllExportableSalData === "function"
  ) {
    const todosLosSal = window.salManager.getAllExportableSalData();
    populateSalTable(todosLosSal);
    function updateCertificatoNumero() {
      const ultimoSal = certificatiPrecedenti[certificatiPrecedenti.length - 1];
      if (ultimoSal) {
        document.getElementById("certificato-numero").textContent =
          ultimoSal.numeroSAL;
      }
    }

    // Llamar al final de DOMContentLoaded o después de saveSalToHistory
    updateCertificatoNumero();
  }
});
