// js_empresa/main.js

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  const addFieldBtn = document.getElementById("add-field-btn");
  const presseContainer = document.getElementById("presse-container");

  // 1. Lógica para añadir campos dinámicos
  addFieldBtn.addEventListener("click", function () {
    const lastFieldGroup = presseContainer.querySelector(".row.g-3.mb-3:last-of-type");
    if (!lastFieldGroup) {
      console.error("No se encontró el grupo de campos inicial para clonar.");
      return;
    }
    const newFieldGroup = lastFieldGroup.cloneNode(true);
    const inputs = newFieldGroup.querySelectorAll("input");
    inputs.forEach((input) => {
      input.value = "";
    });
    presseContainer.appendChild(newFieldGroup);
    console.log("Nuevo campo de Assicurazione añadido.");
  });

  // 2. Lógica para guardar los datos en localStorage
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = {};
    const committenteFields = form.querySelector("fieldset:nth-of-type(1)");
    const impresaFields = form.querySelector("fieldset:nth-of-type(2)");
    const progettoFields = form.querySelector("fieldset:nth-of-type(3)");

    formData.committente = {
      ragioneSociale: committenteFields.querySelector('input[placeholder="Nome Impresa"]').value.trim(),
      indirizzo: committenteFields.querySelector('input[placeholder="Indirizzo"]').value.trim(),
      referente: committenteFields.querySelector('input[placeholder="Nella persona di:"]').value.trim(),
      rlAndCse: committenteFields.querySelector('input[placeholder="R.L. e CSE"]').value.trim(),
      direttoreLavori: committenteFields.querySelector('input[placeholder="Direttore dei lavori"]').value.trim(),
      projectManager: committenteFields.querySelector('input[placeholder="Project Manager"]').value.trim(),
    };

    formData.impresa = {
      ragioneSociale: impresaFields.querySelector('input[placeholder="Nome Impresa"]').value.trim(),
      indirizzo: impresaFields.querySelector('input[placeholder="Indirizzo"]').value.trim(),
      direttoreLavori: impresaFields.querySelector('input[placeholder="Direttore dei lavori Impiantistici"]').value.trim(),
    };

    formData.progetto = {
      descrizione: progettoFields.querySelector("textarea").value.trim(),
      indirizzo: progettoFields.querySelector('input[placeholder="Indirizzo"]').value.trim(),
      dataInicio: progettoFields.querySelector('input[type="date"]').value,
      dataFinePrevista: progettoFields.querySelector('input[type="date"]:nth-of-type(2)').value,
    };

    formData.assicurazioni = [];
    const assicurazioniInputs = presseContainer.querySelectorAll(".row.g-3.mb-3");
    assicurazioniInputs.forEach((row) => {
      const indirizzo = row.querySelector('input[name="indirizzo[]"]').value.trim();
      const numero = row.querySelector('input[name="numero[]"]').value.trim();
      if (indirizzo || numero) {
        formData.assicurazioni.push({ indirizzo, numero });
      }
    });

    console.log("Datos del formulario a guardar:", formData);
    localStorage.setItem("certificatoDati", JSON.stringify(formData));
    alert("Dati salvati con successo! Puoi procedere.");
  });

  // 3. Lógica para cargar los datos desde localStorage al cargar la página
  const savedData = localStorage.getItem("certificatoDati");
  if (savedData) {
    const formData = JSON.parse(savedData);
    console.log("Datos del formulario cargados desde localStorage:", formData);

    const committenteFields = form.querySelector("fieldset:nth-of-type(1)");
    committenteFields.querySelector('input[placeholder="Nome Impresa"]').value = formData.committente.ragioneSociale || '';
    committenteFields.querySelector('input[placeholder="Indirizzo"]').value = formData.committente.indirizzo || '';
    committenteFields.querySelector('input[placeholder="Nella persona di:"]').value = formData.committente.referente || '';
    committenteFields.querySelector('input[placeholder="R.L. e CSE"]').value = formData.committente.rlAndCse || '';
    committenteFields.querySelector('input[placeholder="Direttore dei lavori"]').value = formData.committente.direttoreLavori || '';
    committenteFields.querySelector('input[placeholder="Project Manager"]').value = formData.committente.projectManager || '';
    
    const impresaFields = form.querySelector("fieldset:nth-of-type(2)");
    impresaFields.querySelector('input[placeholder="Nome Impresa"]').value = formData.impresa.ragioneSociale || '';
    impresaFields.querySelector('input[placeholder="Indirizzo"]').value = formData.impresa.indirizzo || '';
    impresaFields.querySelector('input[placeholder="Direttore dei lavori Impiantistici"]').value = formData.impresa.direttoreLavori || '';
    
    const progettoFields = form.querySelector("fieldset:nth-of-type(3)");
    progettoFields.querySelector("textarea").value = formData.progetto.descrizione || '';
    progettoFields.querySelector('input[placeholder="Indirizzo"]').value = formData.progetto.indirizzo || '';
    progettoFields.querySelector('input[type="date"]').value = formData.progetto.dataInicio || '';
    progettoFields.querySelector('input[type="date"]:nth-of-type(2)').value = formData.progetto.dataFinePrevista || '';

    // Llenar campos dinámicos de seguros
    if (formData.assicurazioni && formData.assicurazioni.length > 0) {
      const initialField = presseContainer.querySelector(".row.g-3.mb-3");
      if (initialField) initialField.remove();
      formData.assicurazioni.forEach(assicurazione => {
        const newFieldGroup = document.createElement("div");
        newFieldGroup.className = "row g-3 mb-3";
        newFieldGroup.innerHTML = `
          <div class="col-md-6">
            <label class="form-label visually-hidden">Indirizzo/Sede</label>
            <input type="text" class="form-control" placeholder="Indirizzo/Sede" name="indirizzo[]" required value="${assicurazione.indirizzo || ''}">
          </div>
          <div class="col-md-6">
            <label class="form-label visually-hidden">Numero</label>
            <input type="text" class="form-control" placeholder="Numero" name="numero[]" required value="${assicurazione.numero || ''}">
          </div>
        `;
        presseContainer.appendChild(newFieldGroup);
      });
    }
  }
});