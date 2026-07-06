/* ======================================================================
   PAGAMENTO.JS — Configuração do PIX
   ----------------------------------------------------------------------
   Edite este arquivo para controlar como a tela de pagamento se comporta.
   Não é necessário mexer em nenhum outro arquivo do site.
   ====================================================================== */

const PAGAMENTO_CONFIG = {

  /* URL do seu backend (o mesmo que criamos com o endpoint /gerar-pix).
     Troque pelo endereço real onde ele estiver hospedado.
     Ex: "https://meu-backend.com/api/pagamento/gerar-pix" */
  backendUrl: "https://backhend-labrasa.onrender.com/api/pagamento/gerar-pix",

  /* Mostrar QR Code na tela de pagamento além do código copia-e-cola */
  gerarQrCode: true,

  /* Texto de instrução exibido embaixo do QR Code / código */
  instrucoes: [
    "Abra o app do seu banco.",
    "Escolha pagar via Pix com QR Code ou Copia e Cola.",
    "Confira o valor e finalize o pagamento.",
    "Envie o comprovante no WhatsApp: (17) 99271-9357.",
  ],

};


/* ======================================================================
   A partir daqui é lógica de comunicação com o backend. Normalmente não
   precisa mexer aqui — apenas nas configurações acima.
   ====================================================================== */

/** Remove tudo que não for dígito de uma string. */
function _somenteDigitos(txt) {
  return (txt || "").replace(/\D/g, "");
}

/**
 * Converte um telefone brasileiro digitado no formulário (ex: "(17)
 * 99271-9357") para o padrão E.164 exigido pela Sunize (ex:
 * "+5517992719357"). Se o cliente já digitar com DDI, respeita.
 */
function formatarTelefoneE164(telefone) {
  let digitos = _somenteDigitos(telefone);
  if (digitos.startsWith("55") && digitos.length > 11) {
    // já tem DDI 55
  } else {
    digitos = "55" + digitos;
  }
  return "+" + digitos;
}

/**
 * Pede ao backend para gerar o código Pix (via Sunize ou chave fixa,
 * dependendo de como o backend estiver configurado) e retorna:
 *   { modo, codigo, transactionId? }
 *
 * @param {number} valor  - valor total do pedido, ex: 49.90
 * @param {string} txid   - identificador do pedido (usado como external_id)
 * @param {Object} pedido - { nome, telefone, itens }
 *   itens: array de itens do carrinho no formato usado pelo site
 *          (precisa ter nome, unit, qty)
 */
async function obterCodigoPix(valor, txid, pedido) {
  const items = (pedido.itens || []).map(i => ({
    id: String(i.id ?? i.key ?? i.nome),
    title: i.nome,
    description: i.obs || i.nome,
    price: i.unit,
    quantity: i.qty,
    is_physical: true,
  }));

  const resposta = await fetch(PAGAMENTO_CONFIG.backendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      externalId: txid,
      totalAmount: valor,
      items,
      customer: {
        name: pedido.nome,
        phone: formatarTelefoneE164(pedido.telefone),
      },
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || "Não foi possível gerar o Pix. Tente novamente.");
  }

  return {
    modo: dados.modo,
    codigo: dados.codigoPix,
    transactionId: dados.transactionId,
  };
}
