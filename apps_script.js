function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads 8 EM 12") || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  
  // CORS Helper
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  if (data.length <= 1) {
    output.setContent(JSON.stringify([]));
    return output;
  }
  
  var headers = data[0];
  var leads = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var lead = { row_index: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      lead[headers[j]] = row[j];
    }
    // "Lead" default status se não houver
    if (!lead.status) {
      lead.status = "Lead";
    }
    leads.push(lead);
  }
  
  output.setContent(JSON.stringify(leads));
  return output;
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads 8 EM 12") || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    data = e.parameter;
  }

  // --- ATUALIZA STATUS NO KANBAN ---
  if (data.action === "update_status") {
    var headers = sheet.getDataRange().getValues()[0];
    var statusColIndex = headers.indexOf("status") + 1;
    
    // Cria coluna de status se não existir
    if (statusColIndex === 0) {
      sheet.getRange(1, headers.length + 1).setValue("status");
      statusColIndex = headers.length + 1;
    }
    
    sheet.getRange(data.row_index, statusColIndex).setValue(data.status);
    
    output.setContent(JSON.stringify({success: true, msg: "Status atualizado"}));
    return output;
  }
  
  // --- INSERE NOVO LEAD DA LANDING PAGE ---
  var headers = sheet.getDataRange().getValues()[0];
  if (!headers || headers.length === 0 || headers[0] === "") {
    headers = ["timestamp", "nome", "email", "whatsapp", "sexo", "objetivo", "nivel", "idade", "peso", "altura", "gordura", "massa", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "url", "status"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  var newRow = [];
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (h === 'status') {
      newRow.push("Lead");
    } else if (h === 'timestamp' && !data[h]) {
      newRow.push(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    } else {
      newRow.push(data[h] || "");
    }
  }
  
  sheet.appendRow(newRow);

  // --- DISPARA BOT DE PRÉ-VENDAS VIA WHATSAPP ---
  // Chama o backend Node.js (Railway) que inicia a conversa com o lead.
  // Substitua BOT_BACKEND_URL_AQUI pela URL gerada no Railway após o deploy.
  try {
    var botPayload = {
      nome:       data.nome       || '',
      whatsapp:   data.whatsapp   || '',
      sexo:       data.sexo       || '',
      objetivo:   data.objetivo   || '',
      nivel:      data.nivel      || '',
      idade:      data.idade      || '',
      peso:       data.peso       || '',
      altura:     data.altura     || '',
      gordura:    data.gordura    || '',
      massa:      data.massa      || '',
      utm_source: data.utm_source || ''
    };
    UrlFetchApp.fetch('BOT_BACKEND_URL_AQUI/trigger', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(botPayload),
      muteHttpExceptions: true
    });
  } catch(botErr) {
    // Silencia erros do bot — o lead já foi salvo com sucesso
    Logger.log('Bot trigger error: ' + botErr.toString());
  }

  output.setContent(JSON.stringify({success: true, msg: "Lead salvo"}));
  return output;
}
