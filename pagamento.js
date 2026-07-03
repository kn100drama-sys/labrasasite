/* ======================================================================
   PAGAMENTO.JS — Configuração do PIX
   ----------------------------------------------------------------------
   Edite este arquivo para controlar como a tela de pagamento se comporta.
   Não é necessário mexer em nenhum outro arquivo do site.
   ====================================================================== */

const PAGAMENTO_CONFIG = {

  /* ----------------------------------------------------------------
     modo:
       "copia_e_cola"  -> o site MONTA um código Pix completo (padrão
                          Banco Central) já com o valor do pedido embutido.
                          O cliente cola esse código no app do banco e o
                          valor já vem preenchido automaticamente.
                          Exige preencher "chave" e "recebedor" abaixo
                          corretamente.

       "chave_fixa"    -> o site apenas MOSTRA a sua chave Pix (a mesma
                          de sempre) para o cliente copiar e pagar
                          manualmente, digitando o valor no app do banco.
                          Mais simples, não precisa validar nada, mas o
                          cliente precisa digitar o valor com atenção.
  ---------------------------------------------------------------- */
  modo: "chave_fixa",

  /* Chave Pix da loja (CPF, CNPJ, e-mail, telefone ou chave aleatória) */
  chave: "contato@labrasaburger.com.br",

  /* Usados apenas no modo "copia_e_cola" (precisam ser iguais ao
     cadastro da conta que recebe o Pix, sem acento e sem caracteres
     especiais, no máximo 25 e 15 caracteres respectivamente) */
  recebedor: {
    nome: "LA BRASA BURGER",
    cidade: "SAO PAULO",
  },

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
   A partir daqui é lógica de geração do código Pix (padrão EMV do Banco
   Central). Normalmente não precisa mexer aqui — apenas nas
   configurações acima.
   ====================================================================== */

/** Calcula o CRC16-CCITT exigido no final de todo código Pix. */
function _pixCrc16(payload) {
  let resultado = 0xFFFF;
  const polinomio = 0x1021;
  for (let i = 0; i < payload.length; i++) {
    resultado ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      resultado = (resultado & 0x8000)
        ? ((resultado << 1) ^ polinomio) & 0xFFFF
        : (resultado << 1) & 0xFFFF;
    }
  }
  return resultado.toString(16).toUpperCase().padStart(4, "0");
}

/** Monta um campo EMV no formato ID + tamanho + valor. */
function _emv(id, valor) {
  const tamanho = String(valor.length).padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

/** Remove acentos e caracteres fora do padrão aceito pelo Pix. */
function _limparTexto(txt) {
  return txt
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase();
}

/**
 * Gera o código Pix "copia e cola" completo, com o valor do pedido embutido.
 * Só é usado quando PAGAMENTO_CONFIG.modo === "copia_e_cola".
 */
function gerarPayloadPixCopiaCola(valor, txid) {
  const chave = PAGAMENTO_CONFIG.chave;
  const nome = _limparTexto(PAGAMENTO_CONFIG.recebedor.nome).substring(0, 25);
  const cidade = _limparTexto(PAGAMENTO_CONFIG.recebedor.cidade).substring(0, 15);
  const idTx = (txid || "PEDIDO").substring(0, 25);

  const gui = _emv("00", "br.gov.bcb.pix");
  const chaveField = _emv("01", chave);
  const merchantAccountInfo = _emv("26", gui + chaveField);

  const semCrc =
    _emv("00", "01") +
    merchantAccountInfo +
    _emv("52", "0000") +
    _emv("53", "986") +
    _emv("54", valor.toFixed(2)) +
    _emv("58", "BR") +
    _emv("59", nome || "LOJA") +
    _emv("60", cidade || "CIDADE") +
    _emv("62", _emv("05", idTx)) +
    "6304";

  return semCrc + _pixCrc16(semCrc);
}

/**
 * Retorna o código que deve aparecer na tela de pagamento (e ser usado
 * para gerar o QR Code), já respeitando o modo escolhido lá em cima.
 */
function obterCodigoPix(valor, txid) {
  if (PAGAMENTO_CONFIG.modo === "chave_fixa") {
    return PAGAMENTO_CONFIG.chave;
  }
  return gerarPayloadPixCopiaCola(valor, txid);
}
