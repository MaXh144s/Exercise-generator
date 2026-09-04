(function () {
  const dropArea = document.getElementById('dropArea');
  const arquivoInput = document.getElementById('arquivoInput');
  const jsonTexto = document.getElementById('jsonTexto');
  const btnGerar = document.getElementById('btnGerar');
  const btnLimpar = document.getElementById('btnLimpar');
  const statusEl = document.getElementById('status');
  const resultadoEl = document.getElementById('resultado');
  const chkGabarito = document.getElementById('chkGabarito');
  const chkEconomiaTinta = document.getElementById('chkEconomiaTinta');
  const inputFonte = document.getElementById('inputFonte');
  const btnFonteMenos = document.getElementById('btnFonteMenos');
  const btnFonteMais = document.getElementById('btnFonteMais');
  const radiosAlvoFonte = document.querySelectorAll('input[name="alvoFonte"]');
  const radiosModoPrioridade = document.querySelectorAll('input[name="modoPrioridade"]');
  const blocoEspacoAlternativas = document.getElementById('blocoEspacoAlternativas');
  const dicaEspacoAlternativas = document.getElementById('dicaEspacoAlternativas');
  const inputEspacoAlternativas = document.getElementById('inputEspacoAlternativas');
  const btnEspacoMenos = document.getElementById('btnEspacoMenos');
  const btnEspacoMais = document.getElementById('btnEspacoMais');

  // 12 é o tamanho "base" (equivale à antiga escala de 100%); o usuário
  // digita o tamanho desejado ou usa os botões -/+, de 1 em 1.
  const FONTE_BASE = 12;
  const FONTE_MIN = 8;
  const FONTE_MAX = 20;

  // Priorização de layout: "questoes" (padrão) mantém o comportamento
  // original — o espaço entre uma questão e a próxima acompanha a escala
  // geral de fonte, priorizando caber mais questões por folha.
  // "alternativas" fixa esse espaço no valor (em mm) escolhido pelo
  // usuário, priorizando a respiração visual entre as alternativas e a
  // próxima questão, mesmo que isso caiba menos questões por folha.
  const ESPACO_ALT_MIN_MM = 2;
  const ESPACO_ALT_MAX_MM = 30;
  let modoPrioridade = 'questoes';

  // O stepper de fonte é compartilhado pelos 3 alvos. "Geral" é a escala
  // mestre: enunciado e alternativas acompanham o valor de "Geral" até
  // que sejam ajustados individualmente pela primeira vez — a partir daí
  // passam a valer por conta própria e não seguem mais o "Geral".
  const fontesPorAlvo = { geral: FONTE_BASE, enunciado: FONTE_BASE, alternativas: FONTE_BASE };
  const personalizadoPorAlvo = { enunciado: false, alternativas: false };
  let alvoFonteAtivo = 'geral';
  const VAR_CSS_POR_ALVO = {
    geral: '--escala',
    enunciado: '--escala-enunciado',
    alternativas: '--escala-alternativas'
  };

  const btnExemplo = document.getElementById('btnExemplo');
  const modalExemplo = document.getElementById('modalExemplo');
  const btnFecharModal = document.getElementById('btnFecharModal');
  const exemploJsonTexto = document.getElementById('exemploJsonTexto');
  const btnCopiarExemplo = document.getElementById('btnCopiarExemplo');
  const btnUsarExemplo = document.getElementById('btnUsarExemplo');
  const statusCopia = document.getElementById('statusCopia');

  let dadosAtuais = null;

  // ---------- Constantes físicas da folha A4 ----------
  // 1mm = 96/25.4 px, conforme a especificação CSS (fixo, independente do
  // DPI real da tela) — por isso é seguro medir em px e confiar que bate
  // com o que sai impresso.
  const PX_POR_MM = 96 / 25.4;
  const ALTURA_FOLHA_MM = 297;
  const LARGURA_FOLHA_MM = 210;
  const PAD_TOPO_MM = 8; // padding-top da .folha
  const PAD_BASE_MM = 8; // padding-bottom da .folha

  // ---------- Ajuste automático da fonte do título do cabeçalho ----------
  // O cabeçalho tem altura FIXA de 16mm (mesmo valor do CSS). Se o título
  // não couber em até MAX_LINHAS_TITULO linhas nessa altura, a fonte do
  // título diminui (nunca o cabeçalho cresce) — ver obterEstiloTitulo().
  const ALTURA_CABECALHO_MM = 16;
  const FONTE_TITULO_BASE_REM = 0.95; // igual ao font-size base de .cab-titulo no CSS
  const FONTE_TITULO_MIN_REM = 0.55;
  const FONTE_TITULO_PASSO_REM = 0.05;
  const MAX_LINHAS_TITULO = 3;
  const PAD_HORZ_MM = 10; // padding esquerda/direita da .folha
  const PAD_CENTRAL_MM = 2.5; // espaço entre o texto e a linha divisória central (cada lado)
  // Uma questão só é empurrada para a próxima coluna/folha se, ficando na
  // coluna atual, sobrasse menos que essa distância até a linha do rodapé.
  // Cobre tanto a folga contra arredondamento de sub-pixel quanto a
  // distância mínima desejada em relação ao rodapé.
  const DISTANCIA_MINIMA_RODAPE_MM = 7;
  const BUFFER_SEGURANCA_PX = DISTANCIA_MINIMA_RODAPE_MM * PX_POR_MM;

  const LARGURA_COLUNA_MM = (LARGURA_FOLHA_MM - PAD_HORZ_MM * 2) / 2 - PAD_CENTRAL_MM;
  // Cabeçalho e rodapé não ficam dentro de uma coluna — ocupam a largura
  // inteira da folha (menos o padding horizontal). Medi-los com a largura
  // de uma coluna só (mais estreita) fazia o título quebrar em mais linhas
  // do que quebra de verdade, inflando a altura reservada.
  const LARGURA_CONTEUDO_FOLHA_MM = LARGURA_FOLHA_MM - PAD_HORZ_MM * 2;

  const JSON_EXEMPLO_COM_GABARITO = {

  titulo: "Razão, Proporção e Regras de Três",

  fonte: "Prof. MSc. Exemplo",

  secao: "Exercícios Propostos",

  questoes: [

    {
      numero: 1,
      enunciado: "Em uma turma, a razão entre o número de homens e o número de mulheres é 3/5. Nessa turma há 21 homens. O número total de alunos da turma é",
      fonte: "",
      antecipacao: "",
      alternativas: ["35.", "42.", "48.", "54.", "56."],
      correta: "E"
    },

    {
      numero: 2,
      enunciado: "Cinco marcas de pão integral apresentam as seguintes concentrações de fibras (massa de fibra por massa de pão): Marca A: 2g a cada 50g; Marca B: 5g a cada 40g; Marca C: 5g a cada 100g; Marca D: 6g a cada 90g; Marca E: 7g a cada 70g. Recomenda-se a ingestão do pão com maior concentração de fibras.",
      fonte: "ENEM, 2016.",
      antecipacao: "A marca a ser escolhida é",
      alternativas: ["A.", "B.", "C.", "D.", "E."],
      correta: "B"
    },

    {
      numero: 3,
      enunciado: "Na proporção x/5 = 3/2, o valor de x é:",
      fonte: "",
      antecipacao: "",
      alternativas: ["9,0", "7,5", "6,0", "4,5", "3,0"],
      correta: "B"
    },

    {
      numero: 4,
      enunciado: "Uma loja vende arroz nas embalagens e preços indicados na tabela.",
      fonte: "",
      tabela: [
        ["Embalagem", "250 gramas", "500 gramas", "750 gramas"],
        ["Preço", "R$ 2,70", "R$ 5,10", "R$ 7,40"]
      ],
      antecipacao: "A embalagem com o menor preço por quilograma é a de",
      alternativas: [
        "250 g.",
        "500 g.",
        "750 g.",
        "250 g e 500 g (empate).",
        "500 g e 750 g (empate)."
      ],
      correta: "C"
    },

    {
      numero: 5,
      enunciado: "O gráfico mostra o valor gasto, em reais, na compra de uma bebida de acordo com a porção adquirida, em mililitros.",
      fonte: "",
      grafico: {
        tipo: "linha",
        eixoX: {
          titulo: "Porção (mL)",
          valores: [0, 100, 200, 300, 400, 500]
        },
        eixoY: {
          titulo: "Valor gasto (R$)",
          valores: [0, 50, 100, 150, 200, 250, 300]
        },
        pontos: [
          { x: 0, y: 0 },
          { x: 100, y: 50 },
          { x: 250, y: 120 },
          { x: 400, y: 150 },
          { x: 500, y: 210 }
        ]
      },
      antecipacao: "Com base no gráfico, o valor pago por uma porção de 400 mL é de",
      alternativas: [
        "R$ 120,00.",
        "R$ 150,00.",
        "R$ 180,00.",
        "R$ 210,00.",
        "R$ 250,00."
      ],
      correta: "B"
    },

    // ============================================================
    // EXEMPLO DE QUESTÃO COM MÚLTIPLAS COLUNAS
    // ============================================================

    {
      numero: 6,
      enunciado: "Simplifique as expressões algébricas a seguir.",
      fonte: "",
      antecipacao: "Assinale a alternativa que apresenta corretamente as expressões simplificadas.",

      // Indica que as alternativas podem ser organizadas
      // em múltiplas colunas.
      colunasAlternativas: true,

      alternativas: [
        "A) 3x + 2x = 5x",
        "B) 7a - 3a = 4a",
        "C) 2x + 5x - x = 6x",
        "D) 4y + 3 - 2y = 2y + 3",
        "E) 8a - 2a + a = 7a",
        "F) 5x + 2 - 3x = 2x + 2",
        "G) 9y - 4y + 2y = 7y",
        "H) 6a + 3a - 5a = 4a",
        "I) 10x - 4x - 2x = 4x",
        "J) 3y + 7 - y = 2y + 7",
        "K) 8x - 3x + x = 6x"
      ],

      correta: "A"
    },

    // ============================================================
    // EXEMPLO DE CÁLCULO DE EXPRESSÕES
    // ============================================================

    {
      numero: 7,
      enunciado: "Calcule o valor das expressões matemáticas a seguir considerando x = 2 e y = 3.",
      fonte: "",
      antecipacao: "Assinale a alternativa que apresenta corretamente os resultados.",

      colunasAlternativas: true,

      alternativas: [
        "A) x + y = 5",
        "B) 2x + y = 7",
        "C) x² + y = 7",
        "D) 3x - y = 3",
        "E) x · y = 6",
        "F) 2(x + y) = 10",
        "G) x² + y² = 13",
        "H) 3y - x = 7",
        "I) (x + y)² = 25",
        "J) 4x + 2y = 14",
        "K) 2x² - y = 5",
        "L) x³ + y = 11"
      ],

      correta: "G"
    }

  ]
};

  // Mesmas questões, mas sem o campo "correta" — útil quando o usuário só
  // quer a folha de questões, sem gabarito embutido no JSON.
  const JSON_EXEMPLO_SEM_GABARITO = {
    titulo: "Razão, Proporção e Regras de Três",
    fonte: "Prof. MSc. Exemplo",
    secao: "Exercícios Propostos",
    questoes: JSON_EXEMPLO_COM_GABARITO.questoes.map(({ correta, ...resto }) => resto)
  };

  function exemploSelecionado() {
    const tipo = document.querySelector('input[name="tipoExemplo"]:checked').value;
    return tipo === 'semGabarito' ? JSON_EXEMPLO_SEM_GABARITO : JSON_EXEMPLO_COM_GABARITO;
  }

  // ---------- Modal de exemplo ----------
  function atualizarExemploExibido() {
    exemploJsonTexto.textContent = JSON.stringify(exemploSelecionado(), null, 2);
  }

  function abrirModalExemplo() {
    atualizarExemploExibido();
    statusCopia.textContent = '';
    modalExemplo.hidden = false;
  }

  document.querySelectorAll('input[name="tipoExemplo"]').forEach(r => {
    r.addEventListener('change', () => {
      atualizarExemploExibido();
      statusCopia.textContent = '';
    });
  });

  function fecharModalExemplo() {
    modalExemplo.hidden = true;
  }

  btnExemplo.addEventListener('click', abrirModalExemplo);
  btnFecharModal.addEventListener('click', fecharModalExemplo);
  modalExemplo.addEventListener('click', (e) => {
    if (e.target === modalExemplo) fecharModalExemplo();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalExemplo.hidden) fecharModalExemplo();
  });

  btnCopiarExemplo.addEventListener('click', async () => {
    const texto = exemploJsonTexto.textContent;
    try {
      await navigator.clipboard.writeText(texto);
      statusCopia.textContent = 'Exemplo copiado para a área de transferência!';
    } catch (err) {
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        statusCopia.textContent = 'Exemplo copiado para a área de transferência!';
      } catch (err2) {
        statusCopia.textContent = 'Não foi possível copiar automaticamente. Selecione e copie manualmente.';
      }
      document.body.removeChild(area);
    }
  });

  btnUsarExemplo.addEventListener('click', () => {
    jsonTexto.value = JSON.stringify(exemploSelecionado(), null, 2);
    fecharModalExemplo();
    mostrarStatus('Exemplo carregado no campo de texto. Clique em "Gerar folhas".', 'ok');
  });

  // ---------- Upload / drag & drop ----------
  dropArea.addEventListener('click', () => arquivoInput.click());

  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('arrastando');
  });
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('arrastando'));
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('arrastando');
    if (e.dataTransfer.files.length) lerArquivo(e.dataTransfer.files[0]);
  });

  arquivoInput.addEventListener('change', () => {
    if (arquivoInput.files.length) lerArquivo(arquivoInput.files[0]);
  });

  function lerArquivo(arquivo) {
    if (!arquivo.name.toLowerCase().endsWith('.json') && arquivo.type !== 'application/json') {
      mostrarStatus('Envie um arquivo .json válido.', 'erro');
      return;
    }
    const leitor = new FileReader();
    leitor.onload = (e) => {
      jsonTexto.value = e.target.result;
      mostrarStatus('Arquivo carregado: ' + arquivo.name, 'ok');
    };
    leitor.onerror = () => mostrarStatus('Não foi possível ler o arquivo.', 'erro');
    leitor.readAsText(arquivo, 'UTF-8');
  }

  // ---------- Botões ----------
  btnGerar.addEventListener('click', gerarFolhas);
  btnLimpar.addEventListener('click', () => {
    jsonTexto.value = '';
    arquivoInput.value = '';
    dadosAtuais = null;
    statusEl.textContent = '';
    statusEl.className = '';
    resultadoEl.innerHTML = '<div class="vazio">Nenhuma folha gerada ainda. Envie um JSON acima e clique em "Gerar folhas".</div>';
  });

  chkGabarito.addEventListener('change', () => { if (dadosAtuais) montarEExibir(dadosAtuais); });

  // Modo economia de tinta: só alterna uma classe no body — o CSS cuida de
  // remover o fundo colorido do banner de seção. Não precisa remontar as
  // folhas, e a classe fica no body, então também vale para as miniaturas
  // clonadas no modal de download e para a captura via html2canvas no PDF.
  chkEconomiaTinta.addEventListener('change', () => {
    document.body.classList.toggle('economia-tinta', chkEconomiaTinta.checked);
  });

  function normalizarFonte(valor) {
    let n = parseInt(valor, 10);
    if (isNaN(n)) n = FONTE_BASE;
    if (n < FONTE_MIN) n = FONTE_MIN;
    if (n > FONTE_MAX) n = FONTE_MAX;
    return n;
  }

  function aplicarFonte(n, remontar) {
    fontesPorAlvo[alvoFonteAtivo] = n;
    inputFonte.value = n;
    document.documentElement.style.setProperty(VAR_CSS_POR_ALVO[alvoFonteAtivo], n / FONTE_BASE);

    if (alvoFonteAtivo === 'geral') {
      ['enunciado', 'alternativas'].forEach((alvo) => {
        if (!personalizadoPorAlvo[alvo]) {
          fontesPorAlvo[alvo] = n;
          document.documentElement.style.setProperty(VAR_CSS_POR_ALVO[alvo], n / FONTE_BASE);
        }
      });
    } else {
      personalizadoPorAlvo[alvoFonteAtivo] = true;
    }

    if (remontar && dadosAtuais) montarEExibir(dadosAtuais);
  }

  // Digitação livre: escala em tempo real, mas só remonta as folhas
  // quando o campo perde o foco (evita recalcular a cada tecla). Ainda
  // não marca personalização — isso só é decidido em aplicarFonte, no
  // "change" (quando o usuário efetivamente confirma o valor).
  inputFonte.addEventListener('input', () => {
    const n = normalizarFonte(inputFonte.value);
    document.documentElement.style.setProperty(VAR_CSS_POR_ALVO[alvoFonteAtivo], n / FONTE_BASE);
    if (alvoFonteAtivo === 'geral') {
      ['enunciado', 'alternativas'].forEach((alvo) => {
        if (!personalizadoPorAlvo[alvo]) {
          document.documentElement.style.setProperty(VAR_CSS_POR_ALVO[alvo], n / FONTE_BASE);
        }
      });
    }
  });
  inputFonte.addEventListener('change', () => {
    aplicarFonte(normalizarFonte(inputFonte.value), true);
  });

  // Trocar o alvo (geral/enunciado/alternativas) só troca o que o campo
  // exibe e o que o stepper vai controlar a partir de agora — não altera
  // nenhuma das três escalas, nem remonta as folhas.
  radiosAlvoFonte.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      alvoFonteAtivo = radio.value;
      inputFonte.value = fontesPorAlvo[alvoFonteAtivo];
    });
  });

  btnFonteMenos.addEventListener('click', () => {
    aplicarFonte(normalizarFonte(normalizarFonte(inputFonte.value) - 1), true);
  });
  btnFonteMais.addEventListener('click', () => {
    aplicarFonte(normalizarFonte(normalizarFonte(inputFonte.value) + 1), true);
  });

  // ---------- Priorização de layout (questões x alternativas) ----------
  function normalizarEspacoAlt(valor) {
    let n = parseInt(valor, 10);
    if (isNaN(n)) n = parseInt(inputEspacoAlternativas.value, 10) || ESPACO_ALT_MIN_MM;
    if (n < ESPACO_ALT_MIN_MM) n = ESPACO_ALT_MIN_MM;
    if (n > ESPACO_ALT_MAX_MM) n = ESPACO_ALT_MAX_MM;
    return n;
  }

  // Aplica (ou remove) a variável CSS --espaco-questao conforme o modo
  // ativo. Em "alternativas", o valor escolhido (em mm) vale tanto para
  // a folha exibida quanto para a medição usada na paginação, já que
  // calcularPaginacao lê a altura real via getComputedStyle.
  function atualizarEspacoQuestao() {
    if (modoPrioridade === 'alternativas') {
      const n = normalizarEspacoAlt(inputEspacoAlternativas.value);
      document.documentElement.style.setProperty('--espaco-questao', n + 'mm');
    } else {
      document.documentElement.style.removeProperty('--espaco-questao');
    }
  }

  function aplicarEspacoAlt(n, remontar) {
    n = normalizarEspacoAlt(n);
    inputEspacoAlternativas.value = n;
    atualizarEspacoQuestao();
    if (remontar && dadosAtuais) montarEExibir(dadosAtuais);
  }

  radiosModoPrioridade.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      modoPrioridade = radio.value;
      const ativo = modoPrioridade === 'alternativas';
      blocoEspacoAlternativas.hidden = !ativo;
      dicaEspacoAlternativas.hidden = !ativo;
      atualizarEspacoQuestao();
      if (dadosAtuais) montarEExibir(dadosAtuais);
    });
  });

  // Mesmo padrão do stepper de fonte: digitar atualiza ao vivo, mas só
  // remonta as folhas quando o campo perde o foco.
  inputEspacoAlternativas.addEventListener('input', () => {
    if (modoPrioridade !== 'alternativas') return;
    document.documentElement.style.setProperty('--espaco-questao', normalizarEspacoAlt(inputEspacoAlternativas.value) + 'mm');
  });
  inputEspacoAlternativas.addEventListener('change', () => {
    aplicarEspacoAlt(inputEspacoAlternativas.value, true);
  });
  btnEspacoMenos.addEventListener('click', () => {
    aplicarEspacoAlt(normalizarEspacoAlt(inputEspacoAlternativas.value) - 1, true);
  });
  btnEspacoMais.addEventListener('click', () => {
    aplicarEspacoAlt(normalizarEspacoAlt(inputEspacoAlternativas.value) + 1, true);
  });

  function mostrarStatus(msg, tipo) {
    statusEl.textContent = msg;
    statusEl.className = tipo || '';
  }

  // ---------- Parsing / validação ----------
  function gerarFolhas() {
    const texto = jsonTexto.value.trim();
    if (!texto) {
      mostrarStatus('Cole ou envie um JSON primeiro.', 'erro');
      return;
    }

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (err) {
      mostrarStatus('JSON inválido: ' + err.message, 'erro');
      return;
    }

    const questoes = Array.isArray(dados) ? dados : dados.questoes;
    if (!Array.isArray(questoes) || questoes.length === 0) {
      mostrarStatus('O JSON precisa ter um array "questoes" (ou ser diretamente um array de questões).', 'erro');
      return;
    }

    // Quantas questões já existem acumuladas (de lotes anteriores) — usado
    // como base para numerar automaticamente as novas questões que não
    // trazem "numero" explícito, para não reiniciar em 1 a cada lote.
    const baseNumero = (dadosAtuais && Array.isArray(dadosAtuais.questoes)) ? dadosAtuais.questoes.length : 0;

    const normalizadas = [];
    const avisos = [];
    questoes.forEach((q, i) => {
      const numero = q.numero ?? q.number ?? (baseNumero + i + 1);
      const enunciado = q.enunciado ?? q.statement ?? '';
      const fonte = q.fonte ?? q.source ?? '';
      const antecipacao = q.antecipacao ?? q.antecipacaoAlternativas ?? q.lead_in ?? q.leadIn ?? '';
      let alternativas = q.alternativas ?? q.alternatives ?? [];
      // Tabela opcional: array de linhas, cada linha um array de células
      // (texto), ex.: [["Embalagem","250 gramas","500 gramas"],["Preço","R$ 2,70","R$ 5,10"]].
      // Renderizada como uma caixa simples com bordas, sem cabeçalho especial.
      let tabela = q.tabela ?? q.table ?? null;
      if (!Array.isArray(tabela) || !tabela.every(linha => Array.isArray(linha))) tabela = null;

      const grafico = normalizarGrafico(q.grafico ?? q.chart ?? null);

      if (!Array.isArray(alternativas)) alternativas = [];
      if (!enunciado) avisos.push('Questão ' + numero + ' está sem "enunciado".');

      normalizadas.push({
        numero,
        enunciado,
        fonte,
        antecipacao,
        tabela,
        grafico,
        alternativas,
        correta: q.correta ?? q.correct ?? null
      });
    });

    // Acrescenta às questões já existentes em vez de substituí-las — assim
    // dá para colar/enviar vários JSONs em lotes e ir aumentando a lista
    // aos poucos, ao invés de cada envio sobrepor o anterior. Título, fonte
    // geral e seção só são atualizados se o novo lote de fato trouxer esses
    // campos (senão mantém o que já estava definido).
    if (dadosAtuais && Array.isArray(dadosAtuais.questoes) && dadosAtuais.questoes.length) {
      dadosAtuais = {
        titulo: dados.titulo || dados.title || dadosAtuais.titulo,
        fonteGeral: dados.fonte || dados.source || dadosAtuais.fonteGeral,
        secao: dados.secao || dados.section || dadosAtuais.secao,
        questoes: dadosAtuais.questoes.concat(normalizadas)
      };
    } else {
      dadosAtuais = {
        titulo: dados.titulo || dados.title || '',
        fonteGeral: dados.fonte || dados.source || '',
        secao: dados.secao || dados.section || '',
        questoes: normalizadas
      };
    }

    mostrarStatus(
      '+' + normalizadas.length + ' questão(ões) adicionada(s) (total: ' + dadosAtuais.questoes.length + ').' +
        (avisos.length ? ' Avisos: ' + avisos.join(' ') : ''),
      avisos.length ? 'erro' : 'ok'
    );

    // Limpa o campo de JSON (e o input de arquivo) para o próximo lote —
    // as questões já geradas continuam nas folhas, só o texto some.
    jsonTexto.value = '';
    arquivoInput.value = '';

    montarEExibir(dadosAtuais);
  }

  // ---------- Helpers de HTML ----------
  function letraAlternativa(idx) {
    return String.fromCharCode(65 + idx);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  // Tabela simples com bordas, tipo as caixas de dados que acompanham
  // questões (ex.: embalagem x preço). Sem cabeçalho especial — todas as
  // linhas/células são tratadas igual, cada uma é um array de textos.
  function montarTabelaHtml(tabela) {
    if (!tabela || !tabela.length) return '';
    const linhasHtml = tabela.map(linha =>
      `<tr>${linha.map(celula => `<td>${escapeHtml(celula)}</td>`).join('')}</tr>`
    ).join('');
    return `<table class="questao-tabela">${linhasHtml}</table>`;
  }

  // ---------- Gráficos (eixo X/Y com valores + pontos de dados) ----------
  // Formato esperado no JSON da questão:
  // "grafico": {
  //   "titulo": "",                                   // opcional, legenda acima do gráfico
  //   "tipo": "linha" | "dispersao" | "barra",         // padrão: "linha"
  //   "eixoX": { "titulo": "Porção (mL)", "valores": [0, 100, 200, 300, 400, 500] },
  //   "eixoY": { "titulo": "Valor gasto (R$)", "valores": [0, 50, 100, 150, 200, 250, 300] },
  //   "pontos": [ { "x": 100, "y": 50 }, { "x": 250, "y": 120 }, { "x": 400, "y": 150 } ]
  // }
  // "eixoX.valores" e "eixoY.valores" definem TODAS as marcações exibidas em cada
  // eixo (do menor ao maior); os pontos são posicionados proporcionalmente entre
  // o primeiro e o último valor de cada eixo. Para comparar mais de uma série de
  // dados (ex.: produto A x produto B), use "series" no lugar de "pontos":
  // "series": [ { "nome": "Produto A", "pontos": [...] }, { "nome": "Produto B", "pontos": [...] } ]
  const PALETA_GRAFICO = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

  function formatarNumeroGrafico(v) {
    if (!Number.isFinite(v)) return '';
    return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
  }

  // Valida e normaliza o objeto "grafico" vindo do JSON. Retorna null se os
  // dados essenciais (eixos com pelo menos 2 valores e ao menos um ponto)
  // não estiverem presentes, para que a questão siga sendo renderizada
  // normalmente, só sem o gráfico.
  function normalizarGrafico(bruto) {
    if (!bruto || typeof bruto !== 'object') return null;

    const eixoXBruto = bruto.eixoX ?? bruto.xAxis ?? null;
    const eixoYBruto = bruto.eixoY ?? bruto.yAxis ?? null;
    const valoresX = eixoXBruto ? (eixoXBruto.valores ?? eixoXBruto.values) : null;
    const valoresY = eixoYBruto ? (eixoYBruto.valores ?? eixoYBruto.values) : null;
    if (!Array.isArray(valoresX) || valoresX.length < 2) return null;
    if (!Array.isArray(valoresY) || valoresY.length < 2) return null;

    let seriesBrutas = Array.isArray(bruto.series) ? bruto.series : null;
    if (!seriesBrutas) {
      const pontosUnicos = bruto.pontos ?? bruto.points ?? null;
      if (Array.isArray(pontosUnicos)) seriesBrutas = [{ nome: '', pontos: pontosUnicos }];
    }
    if (!Array.isArray(seriesBrutas)) return null;

    const series = seriesBrutas.map(s => ({
      nome: s.nome ?? s.name ?? '',
      pontos: Array.isArray(s.pontos ?? s.points)
        ? (s.pontos ?? s.points)
          .map(p => ({
            x: Number(p.x),
            y: Number(p.y),
            rotulo: p.rotulo ?? p.label ?? null
          }))
          .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
        : []
    })).filter(s => s.pontos.length > 0);
    if (!series.length) return null;

    const tipo = (bruto.tipo === 'dispersao' || bruto.tipo === 'barra') ? bruto.tipo : 'linha';

    return {
      titulo: bruto.titulo ?? bruto.title ?? '',
      tipo,
      eixoX: { titulo: eixoXBruto.titulo ?? eixoXBruto.title ?? '', valores: valoresX.map(Number) },
      eixoY: { titulo: eixoYBruto.titulo ?? eixoYBruto.title ?? '', valores: valoresY.map(Number) },
      series
    };
  }

  // Monta o SVG do gráfico numa "tela" fixa de 520x320 unidades — como o
  // elemento é exibido com width:100% (ver CSS .grafico-svg), esse
  // viewBox escala automaticamente para a largura da coluna, e ao mesmo
  // tempo escala junto o tamanho dos textos, mantendo tudo proporcional.
  function montarGraficoHtml(grafico) {
    if (!grafico) return '';

    const W = 520, H = 320;
    const temLegenda = grafico.series.length > 1;
    const ML = 50, MR = 16, MB = 40;
    const MT = temLegenda ? 34 : 16;
    const plotLeft = ML, plotRight = W - MR, plotTop = MT, plotBottom = H - MB;
    const plotWidth = plotRight - plotLeft, plotHeight = plotBottom - plotTop;

    const xVals = grafico.eixoX.valores;
    const yVals = grafico.eixoY.valores;
    const xMin = xVals[0], xMax = xVals[xVals.length - 1];
    const yMin = yVals[0], yMax = yVals[yVals.length - 1];
    const ehBarra = grafico.tipo === 'barra';

    // No modo barra, o eixo X é tratado como categorias igualmente
    // espaçadas (cada valor de "eixoX.valores" vira uma "coluna"), em vez
    // de uma escala numérica contínua — fica mais parecido com um gráfico
    // de barras comum.
    const passoCategoria = plotWidth / xVals.length;
    function categoriaX(idx) { return plotLeft + passoCategoria * (idx + 0.5); }
    function indiceCategoriaMaisProximo(v) {
      let melhor = 0, menorDist = Infinity;
      xVals.forEach((val, idx) => {
        const dist = Math.abs(val - v);
        if (dist < menorDist) { menorDist = dist; melhor = idx; }
      });
      return melhor;
    }
    function escalaX(v) {
      return ehBarra
        ? categoriaX(indiceCategoriaMaisProximo(v))
        : plotLeft + (v - xMin) / ((xMax - xMin) || 1) * plotWidth;
    }
    function escalaY(v) {
      return plotBottom - (v - yMin) / ((yMax - yMin) || 1) * plotHeight;
    }

    let svg = '';

    // Grade de referência + marcações dos eixos
    xVals.forEach((v, idx) => {
      const px = ehBarra ? categoriaX(idx) : escalaX(v);
      svg += `<line x1="${px}" y1="${plotTop}" x2="${px}" y2="${plotBottom}" class="grafico-grade"/>`;
      svg += `<text x="${px}" y="${plotBottom + 16}" text-anchor="middle" class="grafico-rotulo">${escapeHtml(formatarNumeroGrafico(v))}</text>`;
    });
    yVals.forEach((v) => {
      const py = escalaY(v);
      svg += `<line x1="${plotLeft}" y1="${py}" x2="${plotRight}" y2="${py}" class="grafico-grade"/>`;
      svg += `<text x="${plotLeft - 8}" y="${py + 4}" text-anchor="end" class="grafico-rotulo">${escapeHtml(formatarNumeroGrafico(v))}</text>`;
    });

    // Eixos principais, por cima da grade
    svg += `<line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotBottom}" class="grafico-eixo"/>`;
    svg += `<line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" class="grafico-eixo"/>`;

    // Séries de dados
    grafico.series.forEach((serie, si) => {
      const cor = PALETA_GRAFICO[si % PALETA_GRAFICO.length];

      if (ehBarra) {
        const larguraGrupo = passoCategoria * 0.62;
        const larguraBarra = larguraGrupo / grafico.series.length;
        serie.pontos.forEach((p) => {
          const idx = indiceCategoriaMaisProximo(p.x);
          const grupoEsquerda = categoriaX(idx) - larguraGrupo / 2;
          const bx = grupoEsquerda + si * larguraBarra;
          const by = escalaY(p.y);
          const altura = plotBottom - by;
          svg += `<rect x="${bx}" y="${by}" width="${Math.max(larguraBarra - 2, 1)}" height="${Math.max(altura, 0)}" style="fill:${cor}"/>`;
        });
      } else {
        const pontosOrdenados = [...serie.pontos].sort((a, b) => a.x - b.x);
        if (grafico.tipo === 'linha' && pontosOrdenados.length > 1) {
          const pts = pontosOrdenados.map(p => `${escalaX(p.x)},${escalaY(p.y)}`).join(' ');
          svg += `<polyline points="${pts}" class="grafico-linha" style="stroke:${cor}"/>`;
        }
        pontosOrdenados.forEach((p) => {
          svg += `<circle cx="${escalaX(p.x)}" cy="${escalaY(p.y)}" r="4" style="fill:${cor}"/>`;
          if (p.rotulo) {
            svg += `<text x="${escalaX(p.x)}" y="${escalaY(p.y) - 8}" text-anchor="middle" class="grafico-rotulo-ponto">${escapeHtml(p.rotulo)}</text>`;
          }
        });
      }
    });

    // Legenda (só quando há mais de uma série, para identificar as cores)
    if (temLegenda) {
      const passoLegenda = plotWidth / grafico.series.length;
      grafico.series.forEach((serie, si) => {
        const lx = plotLeft + passoLegenda * si;
        const cor = PALETA_GRAFICO[si % PALETA_GRAFICO.length];
        svg += `<rect x="${lx}" y="4" width="10" height="10" style="fill:${cor}"/>`;
        svg += `<text x="${lx + 14}" y="13" class="grafico-legenda">${escapeHtml(serie.nome || ('Série ' + (si + 1)))}</text>`;
      });
    }

    // Títulos dos eixos
    if (grafico.eixoX.titulo) {
      svg += `<text x="${(plotLeft + plotRight) / 2}" y="${H - 6}" text-anchor="middle" class="grafico-titulo-eixo">${escapeHtml(grafico.eixoX.titulo)}</text>`;
    }
    if (grafico.eixoY.titulo) {
      const cy = (plotTop + plotBottom) / 2;
      svg += `<text x="14" y="${cy}" text-anchor="middle" class="grafico-titulo-eixo" transform="rotate(-90 14 ${cy})">${escapeHtml(grafico.eixoY.titulo)}</text>`;
    }

    const tituloHtml = grafico.titulo ? `<div class="grafico-titulo-caixa">${escapeHtml(grafico.titulo)}</div>` : '';

    return `<div class="questao-grafico">${tituloHtml}<svg class="grafico-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg></div>`;
  }

  // Monta o <li> de uma única alternativa (usado tanto no layout de
  // linha/coluna única quanto no de múltiplas colunas).
  function montarItemAlternativaHtml(q, alt, idx) {
    const marcarGabarito = chkGabarito.checked;
    const letra = letraAlternativa(idx);
    const ehCorreta = marcarGabarito && q.correta != null &&
      (String(q.correta).toUpperCase() === letra || String(q.correta) === String(idx));
    return `<li><span class="alt-letra">${letra})</span><span>${escapeHtml(alt)}${ehCorreta ? ' ✔' : ''}</span></li>`;
  }

  function montarQuestaoHtml(q) {
    let altsHtml = '';

    // q._layoutAlt é decidido antes (ver decidirLayoutAlternativas):
    // 'linha' se todas as alternativas couberem lado a lado numa linha só,
    // 'colunas' se foram distribuídas em 2 ou 3 colunas (q._alternativasColunas
    // guarda a distribuição), 'coluna' nos demais casos (uma por linha, uma
    // coluna só — inclusive todo o modo "Priorizar espaço até a próxima questão").
    if (q._layoutAlt === 'colunas' && q._alternativasColunas) {
      const colunasHtml = q._alternativasColunas.map((coluna) => {
        const itensHtml = coluna.map((item) => montarItemAlternativaHtml(q, item.texto, item.idx)).join('');
        return `<ul class="alternativas-coluna">${itensHtml}</ul>`;
      }).join('');
      altsHtml = `<div class="alternativas alternativas--colunas">${colunasHtml}</div>`;
    } else if (q.alternativas && q.alternativas.length > 0) {
      const itensHtml = q.alternativas.map((alt, idx) => montarItemAlternativaHtml(q, alt, idx)).join('');
      const classeAlt = q._layoutAlt === 'linha' ? 'alternativas--linha' : 'alternativas--coluna';
      altsHtml = `<ul class="alternativas ${classeAlt}">${itensHtml}</ul>`;
    }

    return `<div class="questao">` +
      `<div class="questao-linha">` +
      `<span class="questao-numero">${escapeHtml(q.numero)}) </span>` +
      (q.fonte ? `<span class="questao-fonte-inline">${escapeHtml(q.fonte)} </span>` : '') +
      (q.enunciado ? `<span class="questao-enunciado">${escapeHtml(q.enunciado)}</span>` : '') +
      `</div>` +
      (q.tabela ? montarTabelaHtml(q.tabela) : '') +
      (q.grafico ? montarGraficoHtml(q.grafico) : '') +
      (q.antecipacao ? `<div class="questao-antecipacao">${escapeHtml(q.antecipacao)}</div>` : '') +
      altsHtml +
      `</div>`;
  }

  // Monta o HTML do cabeçalho, já com o font-size do título calculado
  // (fixo/cacheado por conjunto de dados, ver obterEstiloTitulo).
  function montarCabecalhoHtml(dados, indiceFolha, totalFolhas) {
    const estiloTitulo = obterEstiloTitulo(dados);
    const classeTitulo = 'cab-titulo' + (estiloTitulo.limitar ? ' cab-titulo--limite' : '');
    return `<div class="folha-cabecalho">` +
      `<div class="folha-logo"><img src="Montex_logo.png" alt=""></div>` +
      `<div class="cab-bloco"><div class="${classeTitulo}" style="font-size:${estiloTitulo.fontSizeRem}rem;">${escapeHtml(dados.titulo || '')}</div>` +
      (dados.fonteGeral ? `<div class="cab-fonte">${escapeHtml(dados.fonteGeral)}</div>` : '') +
      `</div>` +
      `<div class="cab-meta">Montex Questões</div>` +
      `</div>`;
  }

  // Descobre o menor ajuste de fonte necessário para o título caber em até
  // MAX_LINHAS_TITULO linhas dentro da altura FIXA do cabeçalho (16mm),
  // testando na prática num container oculto (mesma técnica de medição
  // usada no resto do arquivo). Parte do tamanho base e vai reduzindo aos
  // poucos; se mesmo no tamanho mínimo ainda não couber, marca "limitar"
  // para a CSS (.cab-titulo--limite) cortar o excesso em vez de deixar o
  // cabeçalho crescer. O resultado é o mesmo para todas as folhas (o
  // título é igual em todas), então é calculado uma única vez e cacheado
  // no próprio objeto `dados`.
  function obterEstiloTitulo(dados) {
    if (dados._estiloTitulo) return dados._estiloTitulo;

    const container = obterContainerMedicao(LARGURA_CONTEUDO_FOLHA_MM, 'containerMedicaoFolha');
    const alturaAlvoPx = ALTURA_CABECALHO_MM * PX_POR_MM;
    const tituloTexto = escapeHtml(dados.titulo || '');
    const fonteHtml = dados.fonteGeral ? `<div class="cab-fonte">${escapeHtml(dados.fonteGeral)}</div>` : '';

    let fonteRem = FONTE_TITULO_BASE_REM;
    let resultado;

    while (true) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML =
        `<div class="folha-cabecalho">` +
        `<div class="folha-logo"><img src="Montex_logo.png" alt=""></div>` +
        `<div class="cab-bloco"><div class="cab-titulo" style="font-size:${fonteRem}rem;">${tituloTexto}</div>${fonteHtml}</div>` +
        `<div class="cab-meta">Montex Questões</div>` +
        `</div>`;
      const cab = wrapper.firstElementChild;
      container.appendChild(cab);

      const alturaCab = medirAltura(cab);
      const tituloEl = cab.querySelector('.cab-titulo');
      const lineHeightPx = parseFloat(getComputedStyle(tituloEl).lineHeight) || 1;
      const linhas = Math.round(tituloEl.offsetHeight / lineHeightPx) || 1;

      container.removeChild(cab);

      const coube = alturaCab <= alturaAlvoPx && linhas <= MAX_LINHAS_TITULO;

      if (coube || fonteRem <= FONTE_TITULO_MIN_REM) {
        resultado = { fontSizeRem: fonteRem, limitar: !coube };
        break;
      }
      fonteRem = Math.round((fonteRem - FONTE_TITULO_PASSO_REM) * 100) / 100;
    }

    dados._estiloTitulo = resultado;
    return resultado;
  }

  function montarBannerSecaoHtml(dados) {
    return `<div class="folha-banner-secao">${escapeHtml(dados.secao || 'Exercícios Propostos')}</div>`;
  }

  function montarRodapeHtml(indiceFolha) {
    return `<div class="folha-rodape">Página ${indiceFolha}</div>`;
  }

  // ---------- Medição real de altura via DOM oculto ----------
  // Dois containers: um na largura de uma coluna (usado para questões,
  // alternativas e o banner de seção, que realmente vivem dentro de uma
  // coluna) e outro na largura inteira da folha (usado para cabeçalho e
  // rodapé, que não são divididos em colunas).
  function obterContainerMedicao(larguraMm, id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'folha-medicao';
      document.body.appendChild(el);
    }
    el.style.width = larguraMm + 'mm';
    return el;
  }

  function medirAltura(elemento) {
    const estilo = getComputedStyle(elemento);
    return elemento.offsetHeight +
      parseFloat(estilo.marginTop || 0) +
      parseFloat(estilo.marginBottom || 0);
  }

  function medirBlocoHtml(container, html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const el = wrapper.firstElementChild;
    container.appendChild(el);
    const altura = medirAltura(el);
    container.removeChild(el);
    return altura;
  }

  // Múltiplas colunas de alternativas (modo normal, quando não cabem numa
  // linha só): no máximo 3 colunas, capacidade inicial de 5 "unidades de
  // peso" por coluna, expandindo em blocos de 5 (5, 10, 15, 20...) sempre
  // que 3 colunas na capacidade atual não bastarem para o peso total.
  const TAMANHO_BLOCO_COLUNA_ALT = 5;
  const MAX_COLUNAS_ALT = 3;

  // Mede, para cada alternativa, quantas "linhas" ela ocupa quando
  // renderizada sozinha numa coluna (mesma largura/fonte da coluna real).
  // Isso é usado como peso no lugar de simplesmente contar 1 alternativa
  // = 1 unidade, para que alternativas que quebram em 2+ linhas pesem mais
  // na distribuição entre colunas.
  function medirPesosAlternativas(container, q) {
    const itensHtml = q.alternativas.map((alt, idx) =>
      `<li><span class="alt-letra">${letraAlternativa(idx)})</span><span>${escapeHtml(alt)}</span></li>`
    ).join('');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<ul class="alternativas alternativas--coluna">${itensHtml}</ul>`;
    const ul = wrapper.firstElementChild;
    container.appendChild(ul);
    const itens = Array.from(ul.children);
    const estiloRef = getComputedStyle(itens[0]);
    const alturaLinhaPx = parseFloat(estiloRef.lineHeight) || (parseFloat(estiloRef.fontSize) * 1.3);
    const pesos = itens.map((li) => Math.max(1, Math.round(li.offsetHeight / alturaLinhaPx)));
    container.removeChild(ul);
    return pesos;
  }

  // Capacidade (em unidades de peso) de cada coluna: o menor múltiplo de
  // TAMANHO_BLOCO_COLUNA_ALT tal que MAX_COLUNAS_ALT colunas nessa
  // capacidade comportem o peso total das alternativas.
  function calcularCapacidadePorColuna(pesoTotal) {
    let capacidade = TAMANHO_BLOCO_COLUNA_ALT;
    while (capacidade * MAX_COLUNAS_ALT < pesoTotal) capacidade += TAMANHO_BLOCO_COLUNA_ALT;
    return capacidade;
  }

  // Distribui as alternativas (em ordem) em até MAX_COLUNAS_ALT colunas,
  // preenchendo cada coluna até a capacidade antes de abrir a próxima
  // (preenchimento de cima para baixo, nunca uma divisão igualitária tipo
  // 4+4+3). A última coluna permitida recebe o restante mesmo que
  // ultrapasse a capacidade, já que não pode existir uma 4ª coluna.
  function distribuirAlternativasEmColunas(q, pesos) {
    const pesoTotal = pesos.reduce((soma, p) => soma + p, 0);
    const capacidade = calcularCapacidadePorColuna(pesoTotal);

    const colunas = [];
    let colunaAtual = [];
    let pesoColunaAtual = 0;

    q.alternativas.forEach((alt, idx) => {
      const peso = pesos[idx];
      const podeAbrirNovaColuna = colunas.length < MAX_COLUNAS_ALT - 1;
      if (colunaAtual.length > 0 && pesoColunaAtual + peso > capacidade && podeAbrirNovaColuna) {
        colunas.push(colunaAtual);
        colunaAtual = [];
        pesoColunaAtual = 0;
      }
      colunaAtual.push({ idx, texto: alt });
      pesoColunaAtual += peso;
    });
    if (colunaAtual.length > 0) colunas.push(colunaAtual);

    return colunas;
  }

  // Decide, para uma questão, o layout das alternativas.
  // - 'linha': todas cabem lado a lado numa única linha (mede a largura
  //   natural via width:max-content e compara com a largura disponível).
  // - 'colunas': não coube numa linha e, no modo normal, foram
  //   distribuídas em 2 ou 3 colunas (ver q._alternativasColunas).
  // - 'coluna': uma alternativa por linha, numa coluna só — usado quando
  //   a distribuição resultou em 1 coluna só, e sempre no modo
  //   "Priorizar espaço até a próxima questão".
  function decidirLayoutAlternativas(container, q) {
    q._alternativasColunas = null;
    if (!q.alternativas || q.alternativas.length === 0) return 'linha';

    // No modo "Priorizar espaço até a próxima questão", o aproveitamento
    // horizontal das alternativas é ignorado — nada de linha única nem de
    // múltiplas colunas: cada alternativa vai sempre para sua própria
    // linha, numa coluna só, liberando espaço vertical para escrita.
    if (modoPrioridade === 'alternativas') return 'coluna';

    const itensHtml = q.alternativas.map((alt, idx) =>
      `<li><span class="alt-letra">${letraAlternativa(idx)})</span><span>${escapeHtml(alt)}</span></li>`
    ).join('');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<ul class="alternativas alternativas--medindo">${itensHtml}</ul>`;
    const ul = wrapper.firstElementChild;

    container.appendChild(ul);
    const larguraNecessaria = ul.getBoundingClientRect().width;
    const larguraDisponivel = container.clientWidth;
    container.removeChild(ul);

    if (larguraNecessaria <= larguraDisponivel) return 'linha';

    // Não coube numa linha só: tenta distribuir em até 3 colunas.
    const pesos = medirPesosAlternativas(container, q);
    const colunas = distribuirAlternativasEmColunas(q, pesos);
    if (colunas.length <= 1) return 'coluna';

    q._alternativasColunas = colunas;
    return 'colunas';
  }

  // Calcula, com base nas alturas reais medidas, quantas questões cabem
  // em cada coluna e quantas colunas cabem em cada folha (2 colunas fixas).
  function calcularPaginacao(dados) {
    const containerFolha = obterContainerMedicao(LARGURA_CONTEUDO_FOLHA_MM, 'containerMedicaoFolha');
    containerFolha.innerHTML = '';
    const containerColuna = obterContainerMedicao(LARGURA_COLUNA_MM, 'containerMedicaoColuna');
    containerColuna.innerHTML = '';

    const alturaFolhaPx = ALTURA_FOLHA_MM * PX_POR_MM;
    const alturaPaddingVertPx = (PAD_TOPO_MM + PAD_BASE_MM) * PX_POR_MM;

    const alturaCabecalho = medirBlocoHtml(containerFolha, montarCabecalhoHtml(dados, 1, 1));
    const alturaRodape = medirBlocoHtml(containerFolha, montarRodapeHtml(1));
    const alturaBanner = medirBlocoHtml(containerColuna, montarBannerSecaoHtml(dados));

    const alturaDisponivelColuna =
      alturaFolhaPx - alturaPaddingVertPx - alturaCabecalho - alturaRodape - BUFFER_SEGURANCA_PX;

    // A primeira coluna da primeira folha tem o banner "Exercícios Propostos"
    // acima das questões, então sobra menos altura só nela.
    const alturaDisponivelPrimeiraColuna = alturaDisponivelColuna - alturaBanner;

    const avisos = [];
    const alturas = dados.questoes.map((q) => {
      q._layoutAlt = decidirLayoutAlternativas(containerColuna, q);
      const altura = medirBlocoHtml(containerColuna, montarQuestaoHtml(q));
      if (altura > alturaDisponivelColuna) {
        avisos.push('Questão ' + q.numero + ' é mais longa que uma coluna inteira e pode ultrapassar a margem da folha.');
      }
      return altura;
    });

    // Empacotamento guloso: preenche colunas, e a cada 2 colunas fecha a folha.
    const folhas = [];
    let colunaAtual = [];
    let alturaColunaAtual = 0;
    let colunasDaFolhaAtual = [];
    let indiceColunaGlobal = 0;

    function fecharColuna() {
      colunasDaFolhaAtual.push(colunaAtual);
      colunaAtual = [];
      alturaColunaAtual = 0;
      indiceColunaGlobal++;
      if (colunasDaFolhaAtual.length === 2) {
        folhas.push(colunasDaFolhaAtual);
        colunasDaFolhaAtual = [];
      }
    }

    dados.questoes.forEach((q, i) => {
      const altura = alturas[i];
      const limiteColunaAtual = indiceColunaGlobal === 0 ? alturaDisponivelPrimeiraColuna : alturaDisponivelColuna;
      if (colunaAtual.length > 0 && alturaColunaAtual + altura > limiteColunaAtual) {
        fecharColuna();
      }
      colunaAtual.push(q);
      alturaColunaAtual += altura;
    });
    if (colunaAtual.length > 0) fecharColuna();
    if (colunasDaFolhaAtual.length > 0) folhas.push(colunasDaFolhaAtual);

    return { folhas, avisos };
  }

  // ---------- Montagem final + renderização ----------
  function montarEExibir(dados) {
    // O placeholder "Calculando..." é bem mais curto que as folhas, então a
    // página encolhe por um instante e o navegador "clampa" o scroll pro
    // topo. Guardamos a posição antes e restauramos depois de renderizar,
    // pra quem tá no meio da folha (ex.: ajustando o tamanho da fonte) não
    // ser jogado pro início.
    const scrollAnterior = window.scrollY;

    resultadoEl.innerHTML = '<div class="vazio">Calculando distribuição das questões…</div>';

    // pequeno atraso para o navegador pintar o "calculando" antes do trabalho síncrono
    requestAnimationFrame(() => {
      const { folhas, avisos } = calcularPaginacao(dados);
      renderizar(dados, folhas, avisos);
      window.scrollTo(0, scrollAnterior);
    });
  }

  function renderizar(dados, folhas, avisos) {
    const totalFolhas = folhas.length;

    let html = `
      <div class="barra-acoes">
        <div>${dados.questoes.length} questão(ões) — ${totalFolhas} folha(s)</div>
        <div class="linha-botoes" style="margin-top:0;">
          <button id="btnAbrirDownload">⬇️ Baixar questões (PDF)</button>
        </div>
      </div>`;

    if (avisos.length) {
      html += `<div class="aviso-paginacao">${avisos.map(escapeHtml).join('<br>')}</div>`;
    }

    folhas.forEach((colunas, i) => {
      const colunasHtml = colunas.map((coluna, idx) => {
        // A divisória central (borda + padding) só faz sentido quando a
        // folha realmente tem 2 colunas; a última folha pode ter só 1.
        let classeExtra = '';
        if (colunas.length === 2) {
          classeExtra = idx === 0 ? ' folha-coluna--esquerda' : ' folha-coluna--direita';
        }
        const banner = (i === 0 && idx === 0) ? montarBannerSecaoHtml(dados) : '';
        return `<div class="folha-coluna${classeExtra}">${banner}${coluna.map(montarQuestaoHtml).join('')}</div>`;
      }).join('');

      html += `
        <div class="folha" data-numero="${i + 1}">
          ${montarCabecalhoHtml(dados, i + 1, totalFolhas)}
          <div class="folha-corpo">${colunasHtml}</div>
          ${montarRodapeHtml(i + 1)}
        </div>`;
    });

    resultadoEl.innerHTML = html;
    document.getElementById('btnAbrirDownload').addEventListener('click', abrirModalDownload);
  }

  // ======================================================================
  // Modal de download: escolher quais páginas baixar (página atual /
  // ímpares / pares / personalizada), com pré-visualização real de cada
  // folha (miniaturas escaladas, não ícones genéricos). Não usa a caixa
  // de impressão do navegador — gera um PDF de verdade (html2canvas +
  // jsPDF) e dispara o download do arquivo.
  // ======================================================================
  const modalDownload = document.getElementById('modalDownload');
  const btnFecharModalDownload = document.getElementById('btnFecharModalDownload');
  const btnCancelarDownload = document.getElementById('btnCancelarDownload');
  const btnBaixarSelecao = document.getElementById('btnBaixarSelecao');
  const modoDownloadEl = document.getElementById('modoDownload');
  const listaPaginasModalEl = document.getElementById('listaPaginasModal');
  const campoPersonalizadaEl = document.getElementById('campoPersonalizada');
  const inputPaginaPersonalizadaEl = document.getElementById('inputPaginaPersonalizada');
  const btnIrPaginaEl = document.getElementById('btnIrPagina');
  const statusDownloadEl = document.getElementById('statusDownload');

  let modoAtual = 'todas';
  let paginaSelecionada = null; // usada nos modos 'atual' e 'personalizada'

  function todasAsFolhas() {
    return Array.from(resultadoEl.querySelectorAll('.folha'));
  }

  // "Atual" = a folha mais próxima do topo da janela no momento do
  // clique, já que todas ficam empilhadas numa rolagem só.
  function folhaAtualNaPagina() {
    const folhas = todasAsFolhas();
    let escolhida = folhas[0];
    let menorDistancia = Infinity;
    folhas.forEach((folha) => {
      const distancia = Math.abs(folha.getBoundingClientRect().top);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        escolhida = folha;
      }
    });
    return escolhida;
  }

  // Modos que selecionam exatamente UMA folha específica (via clique na
  // miniatura ou digitando o número), em vez de um grupo por paridade.
  function ehModoDeSelecaoUnica(modo) {
    return modo === 'atual' || modo === 'personalizada';
  }

  function mostrarStatusDownload(msg, tipo) {
    statusDownloadEl.textContent = msg;
    statusDownloadEl.className = tipo || '';
  }

  // Monta as miniaturas (clones reais das folhas, escalados por CSS) de
  // acordo com o modo escolhido: ímpares mostra só ímpares, pares só
  // pares, atual/personalizada mostram todas para o usuário rolar.
  function renderizarListaPaginas() {
    const folhas = todasAsFolhas();
    const selecaoUnica = ehModoDeSelecaoUnica(modoAtual);

    listaPaginasModalEl.classList.toggle('selecionavel', selecaoUnica);
    listaPaginasModalEl.innerHTML = '';

    folhas.forEach((folha) => {
      const numero = parseInt(folha.dataset.numero, 10);

      if (modoAtual === 'impares' && numero % 2 !== 1) return;
      if (modoAtual === 'pares' && numero % 2 !== 0) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'pagina-miniatura';
      wrapper.dataset.numero = String(numero);
      if (selecaoUnica && numero === paginaSelecionada) {
        wrapper.classList.add('selecionada');
      }

      const escala = document.createElement('div');
      escala.className = 'pagina-miniatura-escala';
      escala.appendChild(folha.cloneNode(true));

      const legenda = document.createElement('div');
      legenda.className = 'pagina-miniatura-legenda';
      legenda.textContent = 'Página ' + numero;

      wrapper.appendChild(escala);
      wrapper.appendChild(legenda);

      if (selecaoUnica) {
        wrapper.addEventListener('click', () => {
          paginaSelecionada = numero;
          atualizarSelecaoVisual();
        });
      }

      listaPaginasModalEl.appendChild(wrapper);
    });
  }

  function atualizarSelecaoVisual() {
    listaPaginasModalEl.querySelectorAll('.pagina-miniatura').forEach((el) => {
      el.classList.toggle('selecionada', parseInt(el.dataset.numero, 10) === paginaSelecionada);
    });
  }

  function rolarAteAPagina(numero) {
    const el = listaPaginasModalEl.querySelector(`.pagina-miniatura[data-numero="${numero}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Atualiza o texto do botão principal para deixar claro o que vai ser
  // baixado em cada modo, sem precisar de texto extra ao lado.
  function atualizarLabelBotaoBaixar() {
    const labels = {
      todas: '⬇️ Baixar todas as páginas',
      atual: '⬇️ Baixar página atual',
      impares: '⬇️ Baixar páginas ímpares',
      pares: '⬇️ Baixar páginas pares',
      personalizada: '⬇️ Baixar esta página'
    };
    btnBaixarSelecao.textContent = labels[modoAtual] || '⬇️ Baixar';
  }

  function selecionarModo(modo) {
    modoAtual = modo;

    modoDownloadEl.querySelectorAll('.modo-btn').forEach((btn) => {
      btn.classList.toggle('ativo', btn.dataset.modo === modo);
    });

    campoPersonalizadaEl.hidden = (modo !== 'personalizada');

    if (modo === 'atual') {
      paginaSelecionada = parseInt(folhaAtualNaPagina().dataset.numero, 10);
    } else if (modo === 'personalizada') {
      if (paginaSelecionada == null) paginaSelecionada = 1;
      inputPaginaPersonalizadaEl.value = paginaSelecionada;
    }

    renderizarListaPaginas();
    atualizarLabelBotaoBaixar();

    if (ehModoDeSelecaoUnica(modo) && paginaSelecionada != null) {
      rolarAteAPagina(paginaSelecionada);
    }
  }

  function abrirModalDownload() {
    modalDownload.hidden = false;
    inputPaginaPersonalizadaEl.max = todasAsFolhas().length;
    mostrarStatusDownload('', '');
    selecionarModo('todas');
  }

  function fecharModalDownload() {
    modalDownload.hidden = true;
  }

  modoDownloadEl.querySelectorAll('.modo-btn').forEach((btn) => {
    btn.addEventListener('click', () => selecionarModo(btn.dataset.modo));
  });

  btnIrPaginaEl.addEventListener('click', () => {
    const totalFolhas = todasAsFolhas().length;
    let numero = parseInt(inputPaginaPersonalizadaEl.value, 10);
    if (!numero || numero < 1) numero = 1;
    if (numero > totalFolhas) numero = totalFolhas;
    inputPaginaPersonalizadaEl.value = numero;
    paginaSelecionada = numero;
    atualizarSelecaoVisual();
    rolarAteAPagina(numero);
  });

  inputPaginaPersonalizadaEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnIrPaginaEl.click();
  });

  btnFecharModalDownload.addEventListener('click', fecharModalDownload);
  btnCancelarDownload.addEventListener('click', fecharModalDownload);
  modalDownload.addEventListener('click', (e) => {
    if (e.target === modalDownload) fecharModalDownload();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalDownload.hidden) fecharModalDownload();
  });

  // Monta um nome de arquivo seguro a partir do título das questões
  // (sem acentos/espacos), com um sufixo indicando o que foi baixado.
  function montarNomeArquivo() {
    const nomeBase = ((dadosAtuais && dadosAtuais.titulo) || 'questoes')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'questoes';

    const sufixo =
      modoAtual === 'todas' ? 'completo' :
      modoAtual === 'impares' ? 'impares' :
      modoAtual === 'pares' ? 'pares' :
      `pagina-${paginaSelecionada}`;

    return `${nomeBase}-${sufixo}.pdf`;
  }

  // ---------- Download real do PDF (sem window.print) ----------
  // Renderiza cada folha selecionada com html2canvas (captura pixel a
  // pixel do próprio elemento, já com fontes/cores/logo aplicados) e
  // monta um PDF A4 com jsPDF, uma folha por página. No final, dispara
  // o download do arquivo — nenhuma caixa de diálogo de impressão abre.
  async function baixarSelecao() {
    const folhas = todasAsFolhas();
    let selecionadas;
    if (modoAtual === 'todas') {
      selecionadas = folhas;
    } else if (modoAtual === 'impares') {
      selecionadas = folhas.filter(f => parseInt(f.dataset.numero, 10) % 2 === 1);
    } else if (modoAtual === 'pares') {
      selecionadas = folhas.filter(f => parseInt(f.dataset.numero, 10) % 2 === 0);
    } else {
      // 'atual' ou 'personalizada': só a página marcada
      selecionadas = folhas.filter(f => parseInt(f.dataset.numero, 10) === paginaSelecionada);
    }

    if (!selecionadas.length) {
      mostrarStatusDownload('Nenhuma página para baixar nesse modo.', 'erro');
      return;
    }

    if (typeof html2canvas === 'undefined' || !window.jspdf) {
      mostrarStatusDownload('As bibliotecas de PDF não carregaram. Verifique sua conexão e tente novamente.', 'erro');
      return;
    }

    btnBaixarSelecao.disabled = true;
    btnCancelarDownload.disabled = true;

    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      for (let i = 0; i < selecionadas.length; i++) {
        mostrarStatusDownload(`Gerando página ${i + 1} de ${selecionadas.length}…`, '');
        const canvas = await html2canvas(selecionadas[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, LARGURA_FOLHA_MM, ALTURA_FOLHA_MM);
      }

      pdf.save(montarNomeArquivo());
      mostrarStatusDownload('PDF baixado com sucesso!', 'ok');
    } catch (err) {
      mostrarStatusDownload('Erro ao gerar PDF: ' + err.message, 'erro');
    } finally {
      btnBaixarSelecao.disabled = false;
      btnCancelarDownload.disabled = false;
    }
  }

  btnBaixarSelecao.addEventListener('click', baixarSelecao);
})();