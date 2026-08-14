/*  Estado global  */
var estado = {
  dados:            null,
  carrinho:         [],
  sheetProduto:     null,
  sheetVariacao:    null,
  sheetVarIdx:      null,
  sheetQtd:         1,
  todosOsProdutos:  null,
}

var observadorBloqueado = false

/*  Entry point  */
document.addEventListener('DOMContentLoaded', function () {
  carregarCarrinhoLocal()
  registrarEventos()

  fetch('./cardapio.json')
    .then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      return resp.json()
    })
    .then(function (dados) {
      estado.dados = dados

      if (dados.loja && dados.loja.cores) {
        var cores = dados.loja.cores
        var styleEl = document.createElement('style')
        styleEl.textContent = ':root{' +
          (cores.destaque     ? '--cor-destaque:'     + cores.destaque     + ';' : '') +
          (cores.header       ? '--cor-header:'       + cores.header       + ';' : '') +
          (cores.texto_header ? '--cor-texto-header:' + cores.texto_header + ';' : '') +
          '}'
        document.head.appendChild(styleEl)
      }

      var loading = document.getElementById('loading')
      if (loading) loading.style.display = 'none'
      var app = document.getElementById('app')
      if (app) app.removeAttribute('hidden')

      renderHero(dados.loja)
      renderSobre(dados.loja)
      renderBanner(dados)

      var blocos = dados.blocos
      var temBlocos = Array.isArray(blocos) && blocos.length > 0

      if (temBlocos) {
        var resultado = processarBlocos(dados)
        if (resultado.blocos.length > 0) {
          estado.todosOsProdutos = resultado.todosProdutos
          renderNavBlocos(resultado.blocos)
          renderProdutosBlocos(resultado.blocos, resultado.produtoBadge, resultado.todosProdutos)
        } else {
          renderCategorias(dados.categorias)
          renderProdutos(dados.categorias)
        }
      } else {
        renderCategorias(dados.categorias)
        renderProdutos(dados.categorias)
      }

      atualizarUICarrinho()

      requestAnimationFrame(iniciarObservador)
      requestAnimationFrame(iniciarAnimacaoCards)
    })
    .catch(function (err) {
      var loadingEl = document.getElementById('loading')
      if (loadingEl) loadingEl.innerHTML =
        '<div style="text-align:center;padding:2rem;font-family:system-ui">' +
        '<div style="display:flex;justify-content:center;margin-bottom:1rem">' + cookieSVG(48) + '</div>' +
        '<p style="font-size:1rem;color:#1D1D1F;margin-bottom:.5rem">' +
        'Não foi possível carregar o cardápio</p>' +
        '<p style="font-size:.8rem;color:#6E6E73;margin-bottom:1.5rem">' +
        esc(err.message) + '</p>' +
        '<button onclick="location.reload()" style="background:#C62828;color:white;' +
        'border:none;padding:.75rem 1.5rem;border-radius:50px;font-size:.9rem;cursor:pointer">' +
        'Tentar novamente</button></div>'
    })
})

/*  Verifica se a loja está aberta agora  */
function verificarHorario(abertura, fechamento) {
  try {
    var agora  = new Date()
    var hora   = agora.getHours() * 60 + agora.getMinutes()
    var partsA = abertura.split(':')
    var partsF = fechamento.split(':')
    var ab = parseInt(partsA[0], 10) * 60 + parseInt(partsA[1], 10)
    var fe = parseInt(partsF[0], 10) * 60 + parseInt(partsF[1], 10)
    return hora >= ab && hora < fe
  } catch (e) { return false }
}

/*  Cookie SVG placeholder  */
function cookieSVG(size) {
  return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true" fill="none">' +
    '<circle cx="12" cy="12" r="9" stroke="#C8965A" stroke-width="1.5"/>' +
    '<circle cx="8.5" cy="10" r="1.5" fill="#C8965A"/>' +
    '<circle cx="14" cy="8.5" r="1.5" fill="#C8965A"/>' +
    '<circle cx="15" cy="14.5" r="1.5" fill="#C8965A"/>' +
    '<circle cx="9.5" cy="15" r="1.5" fill="#C8965A"/>' +
    '<circle cx="12" cy="11.5" r="1" fill="#C8965A"/>' +
    '</svg>'
}

/*  Banner promocional  */
function renderBanner(dados) {
  var banner = dados.banner
  if (!banner || !banner.ativo || !banner.texto) return
  if (banner.expira_em && new Date() >= new Date(banner.expira_em)) return

  var header = document.getElementById('header')
  if (!header) return

  var el = document.createElement('div')
  el.id = 'site-banner'
  el.style.background = banner.cor || ''
  el.textContent = banner.texto
  document.body.insertBefore(el, header)

  requestAnimationFrame(function () {
    document.documentElement.style.setProperty('--banner-h', el.offsetHeight + 'px')
  })
}

/*  Header (nome da loja + status)  */
function renderHero(loja) {
  var nomeEl = document.getElementById('header-store-name')
  if (nomeEl) nomeEl.textContent = loja.nome || ''

  var logoEl = document.getElementById('header-logo-img')
  if (logoEl) logoEl.alt = loja.nome || ''

  var statusEl = document.getElementById('header-status-tag')
  if (!statusEl) return

  var fechada = loja.fechada === true
  if (!fechada && loja.horario_abertura && loja.horario_fechamento) {
    fechada = !verificarHorario(loja.horario_abertura, loja.horario_fechamento)
  }
  statusEl.textContent = fechada ? 'Fechada' : 'Aberta'
}

/*  Tela "Sobre a loja"  */
function renderSobre(loja) {
  var container = document.getElementById('about-body')
  if (!container) return

  var svgPin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>'
  var svgClk = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  var svgCoin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2h.5a2.5 2.5 0 0 0 0-5h-1a2.5 2.5 0 0 1 0-5h.5a2.5 2.5 0 0 1 2.5 2"/><line x1="12" y1="6" x2="12" y2="18"/></svg>'

  var html = ''

  html += '<div class="about-section about-section-store">' +
    '<span class="about-store-name">' + esc(loja.nome || '') + '</span>' +
    '<span class="header-tag">Sobremesas</span>' +
    '</div>'

  if (loja.endereco) {
    html += '<div class="about-section">' +
      '<div class="about-section-title">' + svgPin + '<span>Endereço</span></div>' +
      '<p class="about-section-text">' + esc(loja.endereco) + '</p>' +
      '</div>'
  }

  if (loja.horarios && typeof loja.horarios === 'object') {
    var dias = Object.keys(loja.horarios)
    if (dias.length > 0) {
      html += '<div class="about-section">' +
        '<div class="about-section-title">' + svgClk + '<span>Horário de funcionamento</span></div>' +
        dias.map(function (dia) {
          return '<div class="about-hours-row">' +
            '<span class="about-hours-day">' + esc(dia) + '</span>' +
            '<span class="about-hours-value">' + esc(loja.horarios[dia]) + '</span>' +
            '</div>'
        }).join('') +
        '</div>'
    }
  }

  if (Array.isArray(loja.formas_pagamento) && loja.formas_pagamento.length > 0) {
    html += '<div class="about-section">' +
      '<div class="about-section-title">' + svgCoin + '<span>Formas de Pagamento</span></div>' +
      '<p class="about-payment-sub">Pagamento na entrega</p>' +
      '<div class="about-payment-list">' +
      loja.formas_pagamento.map(function (fp) {
        return '<span class="about-payment-item">' + esc(fp) + '</span>'
      }).join('') +
      '</div></div>'
  }

  container.innerHTML = html
}

function abrirSobre() {
  var el = document.getElementById('about-page')
  if (el) {
    el.classList.add('active')
    el.setAttribute('aria-hidden', 'false')
  }
  document.body.style.overflow = 'hidden'
}

function fecharSobre() {
  var el = document.getElementById('about-page')
  if (el) {
    el.classList.remove('active')
    el.setAttribute('aria-hidden', 'true')
  }
  document.body.style.overflow = ''
}

/*  Barra de navegação inferior  */
function ativarAbaNav(aba) {
  var mapaIds = { cardapio: 'nav-cardapio', busca: 'nav-busca' }
  Object.keys(mapaIds).forEach(function (key) {
    var btn = document.getElementById(mapaIds[key])
    if (btn) btn.classList.toggle('active', key === aba)
  })

  var searchPageEl = document.getElementById('search-page')
  if (!searchPageEl) return

  var abrirBusca = aba === 'busca'
  searchPageEl.classList.toggle('active', abrirBusca)
  searchPageEl.setAttribute('aria-hidden', abrirBusca ? 'false' : 'true')
  document.body.style.overflow = abrirBusca ? 'hidden' : ''

  if (abrirBusca) {
    var inputEl = document.getElementById('search-input')
    if (inputEl) {
      inputEl.focus()
      executarBusca(inputEl.value)
    }
  }
}

/*  Busca  */
function obterTodosProdutos() {
  if (estado.todosOsProdutos) {
    return Object.keys(estado.todosOsProdutos).map(function (id) {
      return estado.todosOsProdutos[id]
    })
  }
  var lista = []
  var cats = (estado.dados && estado.dados.categorias) || []
  for (var i = 0; i < cats.length; i++) {
    var prods = cats[i].produtos || []
    for (var j = 0; j < prods.length; j++) lista.push(prods[j])
  }
  return lista
}

function executarBusca(query) {
  var resultsEl = document.getElementById('search-results')
  if (!resultsEl) return

  var termo = (query || '').trim()
  if (!termo) {
    resultsEl.innerHTML = '<div class="search-empty">Digite o nome do produto</div>'
    return
  }

  var termoLower = termo.toLowerCase()
  var encontrados = obterTodosProdutos().filter(function (p) {
    var nome = (p.nome || '').toLowerCase()
    var desc = (p.descricao || '').toLowerCase()
    return nome.indexOf(termoLower) !== -1 || desc.indexOf(termoLower) !== -1
  })

  if (encontrados.length === 0) {
    resultsEl.innerHTML = '<div class="search-empty">Nenhum produto encontrado</div>'
    return
  }

  resultsEl.innerHTML = '<div class="products-list">' +
    encontrados.map(function (p) { return criarCardHTML(p, null) }).join('') +
    '</div>'
  requestAnimationFrame(function () { ajustarVerMais(resultsEl) })
}

/* ─── Categorias (pills + sidebar) ──────────────────────── */
function renderCategorias(categorias) {
  var container = document.getElementById('categories-scroll')
  var sidebar   = document.getElementById('sidebar-nav')
  if (!container) return

  var visiveis = categorias.filter(function (c) {
    return c.visivel_cardapio !== false
  })

  container.innerHTML = visiveis.map(function (cat, idx) {
    return '<button class="category-pill' + (idx === 0 ? ' active' : '') + '" ' +
      'role="listitem" data-cat-id="' + cat.id + '">' +
      esc(cat.nome) + '</button>'
  }).join('')

  container.querySelectorAll('.category-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      ativarPill(pill.dataset.catId)
      rolarParaSecao('cat-' + pill.dataset.catId)
      observadorBloqueado = true
      setTimeout(function () { observadorBloqueado = false }, 1000)
    })
  })

  if (sidebar) {
    sidebar.innerHTML = visiveis.map(function (cat, idx) {
      return '<button class="sidebar-pill' + (idx === 0 ? ' active' : '') + '" ' +
        'data-cat-id="' + cat.id + '">' + esc(cat.nome) + '</button>'
    }).join('')

    sidebar.querySelectorAll('.sidebar-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        ativarPill(pill.dataset.catId)
        rolarParaSecao('cat-' + pill.dataset.catId)
        observadorBloqueado = true
        setTimeout(function () { observadorBloqueado = false }, 1000)
      })
    })
  }
}

function ativarPill(catId) {
  document.querySelectorAll('.category-pill, .sidebar-pill').forEach(function (p) {
    var ativo = p.dataset.catId === String(catId)
    p.classList.toggle('active', ativo)
    if (ativo && p.classList.contains('category-pill')) {
      p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  })
}

function rolarParaSecao(id) {
  var el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ─── Produtos ───────────────────────────────────────────── */
function renderProdutos(categorias) {
  var main = document.getElementById('products')
  if (!main) return

  var visiveis = categorias.filter(function (c) {
    return c.visivel_cardapio !== false
  })

  main.innerHTML = visiveis.map(function (cat) {
    var prods = (cat.produtos || []).filter(function (p) {
      return p.visivel_cardapio !== false
    })
    if (!prods.length) return ''

    return '<section class="category-section" id="cat-' + cat.id + '" data-cat-id="' + cat.id + '">' +
      '<h2 class="category-title">' + esc(cat.nome) + '</h2>' +
      '<div class="products-list">' +
      prods.map(criarCardHTML).join('') +
      '</div></section>'
  }).join('')

  main.addEventListener('click', manipularCliqueProdutos)
  requestAnimationFrame(function () { ajustarVerMais(main) })
}

/* ─── "Ver mais" condicional (só se a descrição truncar) ─── */
function ajustarVerMais(container) {
  var alvo  = container || document
  var descs = alvo.querySelectorAll('.product-desc')
  descs.forEach(function (el) {
    var link = el.nextElementSibling
    if (!link || !link.classList.contains('ver-mais-link')) return

    var alturaClamped = el.clientHeight
    el.style.webkitLineClamp = 'unset'
    el.style.display = 'block'
    var alturaNatural = el.scrollHeight
    el.style.webkitLineClamp = ''
    el.style.display = ''

    link.classList.toggle('hidden', alturaNatural <= alturaClamped)
  })
}

/* ─── Clique em produtos (delegação compartilhada) ───────── */
function manipularCliqueProdutos(e) {
  var verMais = e.target.closest('.ver-mais-link')
  if (verMais) {
    e.stopPropagation()
    var descEl = verMais.previousElementSibling
    if (descEl && descEl.classList.contains('product-desc')) {
      var expandido = descEl.classList.toggle('desc-expanded')
      verMais.textContent = expandido ? 'Ver menos' : 'Ver mais'
    }
    return
  }

  var btnAdd = e.target.closest('.btn-add')
  if (btnAdd && !btnAdd.disabled) {
    e.stopPropagation()
    var produto = encontrarProduto(parseInt(btnAdd.dataset.id, 10))
    if (!produto) return
    animacaoBtnAdd(btnAdd)
    if (produto.variacoes && produto.variacoes.length > 0) {
      abrirSheet(produto)
    } else {
      adicionarAoCarrinho(produto, null, 1)
    }
    return
  }

  var card = e.target.closest('.product-card')
  if (card && !card.dataset.esgotado) {
    var produto = encontrarProduto(parseInt(card.dataset.id, 10))
    if (produto) abrirSheet(produto)
  }
}

/* ─── Blocos customizáveis ───────────────────────────────── */
function processarBlocos(dados) {
  var blocos = dados.blocos.slice()
  var agora  = new Date()

  var todosProdutos = {}
  var cats = dados.categorias || []
  for (var ci = 0; ci < cats.length; ci++) {
    var prods = cats[ci].produtos || []
    for (var pi = 0; pi < prods.length; pi++) {
      todosProdutos[prods[pi].id] = prods[pi]
    }
  }

  for (var bi = 0; bi < blocos.length; bi++) {
    var bloco = blocos[bi]
    bloco._expirado = false
    if (bloco.expira_em) {
      var expira = new Date(bloco.expira_em)
      if (agora > expira) bloco._expirado = true
    }
  }

  var relocados = {}
  for (var ri = 0; ri < blocos.length; ri++) {
    if (!blocos[ri]._expirado) continue
    var pids = blocos[ri].produto_ids || []
    for (var rp = 0; rp < pids.length; rp++) {
      var prod = todosProdutos[pids[rp]]
      if (prod && prod.apos_expirar_bloco_id) {
        relocados[pids[rp]] = prod.apos_expirar_bloco_id
      }
    }
  }

  var produtoBadge = {}
  var blocosVisiveis = blocos
    .filter(function (b) { return !b._expirado && b.visivel !== false })
    .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0) })

  for (var vi = 0; vi < blocosVisiveis.length; vi++) {
    var vb = blocosVisiveis[vi]
    var proprios = (vb.produto_ids || []).slice()
    var extras   = []
    var relocKeys = Object.keys(relocados)
    for (var rk = 0; rk < relocKeys.length; rk++) {
      var pid = parseInt(relocKeys[rk], 10)
      if (relocados[pid] === vb.id) extras.push(pid)
    }
    vb._prodIds = proprios.concat(extras)
    if (vb.badge) {
      for (var bp = 0; bp < vb._prodIds.length; bp++) {
        produtoBadge[vb._prodIds[bp]] = vb.badge
      }
    }
  }

  return { blocos: blocosVisiveis, produtoBadge: produtoBadge, todosProdutos: todosProdutos }
}

function renderNavBlocos(blocos) {
  var container = document.getElementById('categories-scroll')
  var sidebar   = document.getElementById('sidebar-nav')
  if (!container) return

  var blocosComTitulo = blocos.filter(function (b) { return b.titulo })

  container.innerHTML = blocosComTitulo.map(function (bloco, idx) {
    return '<button class="category-pill' + (idx === 0 ? ' active' : '') + '" ' +
      'role="listitem" data-cat-id="bloco-' + bloco.id + '">' +
      esc(bloco.titulo) + '</button>'
  }).join('')

  container.querySelectorAll('.category-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      ativarPill(pill.dataset.catId)
      rolarParaSecao('cat-' + pill.dataset.catId)
      observadorBloqueado = true
      setTimeout(function () { observadorBloqueado = false }, 1000)
    })
  })

  if (sidebar) {
    sidebar.innerHTML = blocosComTitulo.map(function (bloco, idx) {
      return '<button class="sidebar-pill' + (idx === 0 ? ' active' : '') + '" ' +
        'data-cat-id="bloco-' + bloco.id + '">' + esc(bloco.titulo) + '</button>'
    }).join('')

    sidebar.querySelectorAll('.sidebar-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        ativarPill(pill.dataset.catId)
        rolarParaSecao('cat-' + pill.dataset.catId)
        observadorBloqueado = true
        setTimeout(function () { observadorBloqueado = false }, 1000)
      })
    })
  }
}

function renderProdutosBlocos(blocos, produtoBadge, todosProdutos) {
  var main = document.getElementById('products')
  if (!main) return

  main.innerHTML = blocos.map(function (bloco) {
    var prods = (bloco._prodIds || [])
      .map(function (pid) { return todosProdutos[pid] })
      .filter(function (p) { return p && p.visivel_cardapio !== false })

    if (!prods.length) return ''

    return '<section class="category-section" id="cat-bloco-' + bloco.id + '" data-cat-id="bloco-' + bloco.id + '">' +
      (bloco.titulo ? '<h2 class="category-title">' + esc(bloco.titulo) + '</h2>' : '') +
      '<div class="products-list">' +
      prods.map(function (p) { return criarCardHTML(p, produtoBadge[p.id] || null) }).join('') +
      '</div></section>'
  }).join('')

  main.addEventListener('click', manipularCliqueProdutos)
  requestAnimationFrame(function () { ajustarVerMais(main) })
}

function criarCardHTML(produto, badge) {
  var esgotado = produto.disponivel === false
  var vars    = produto.variacoes || []
  var temVars = vars.length > 1

  var precoHtml
  if (esgotado) {
    precoHtml = '<span style="display:inline-block;background:#E94560;color:#fff;font-size:.75rem;font-weight:700;padding:.2em .65em;border-radius:50px">Esgotado</span>'
  } else if (temVars) {
    var menor = Math.min.apply(null, vars.map(function (v) { return v.preco }))
    precoHtml = '<span class="product-price">A partir de ' + formatPrice(menor) + '</span>'
  } else if (vars.length === 1) {
    precoHtml = '<span class="product-price">' + formatPrice(vars[0].preco) + '</span>'
  } else {
    precoHtml = '<span class="product-price">' + formatPrice(produto.preco_base) + '</span>'
  }

  var fotoHtml = produto.foto
    ? '<img class="thumb-img" src="' + esc(produto.foto) + '" alt="' + esc(produto.nome) +
      '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
      '<div class="thumb-placeholder" style="display:none" aria-hidden="true">' + cookieSVG(28) + '</div>'
    : '<div class="thumb-placeholder" aria-hidden="true">' + cookieSVG(28) + '</div>'

  var descHtml = ''
  if (produto.descricao) {
    descHtml = '<p class="product-desc">' + esc(produto.descricao) + '</p>' +
      '<span class="ver-mais-link hidden">Ver mais</span>'
  }

  var badgeHtml = badge ? '<span class="product-badge">' + esc(badge) + '</span>' : ''

  var styleAttr = esgotado ? ' style="opacity:.5"' : ''

  return '<article class="product-card"' +
    (esgotado ? ' data-esgotado="true"' : '') +
    styleAttr +
    ' data-id="' + produto.id + '">' +
    '<div class="product-info">' +
    '<h3 class="product-name">' + esc(produto.nome) + '</h3>' +
    descHtml + precoHtml +
    '</div>' +
    '<div class="product-thumb">' +
    badgeHtml +
    fotoHtml +
    '<button class="btn-add"' + (esgotado ? ' disabled style="cursor:default"' : '') + ' data-id="' + produto.id + '" ' +
    'aria-label="Adicionar ' + esc(produto.nome) + ' ao carrinho">+</button>' +
    '</div></article>'
}

/* ─── Bottom Sheet ───────────────────────────────────────── */
function abrirSheet(produto) {
  estado.sheetProduto  = produto
  estado.sheetVariacao = null
  estado.sheetVarIdx   = null
  estado.sheetQtd      = 1

  var nomeSheetEl = document.getElementById('sheet-product-name')
  if (nomeSheetEl) nomeSheetEl.textContent = produto.nome

  var descEl = document.getElementById('sheet-product-desc')
  if (descEl) {
    descEl.textContent  = produto.descricao || ''
    descEl.style.display = produto.descricao ? '' : 'none'
  }

  var fotoEl = document.getElementById('sheet-product-photo')
  if (fotoEl) {
    fotoEl.innerHTML = produto.foto
      ? '<img src="' + esc(produto.foto) + '" alt="' + esc(produto.nome) + '">'
      : cookieSVG(56)
  }

  var lista = document.getElementById('variations-list')
  var vars  = produto.variacoes || []
  if (lista) {
    lista.style.outline    = ''
    lista.style.borderRadius = ''

    lista.innerHTML = vars.map(function (v, i) {
      return '<li class="variation-item" role="option" aria-selected="false" data-idx="' + i + '">' +
        '<span class="variation-name">' + esc(v.nome) + '</span>' +
        '<span class="variation-price">' + formatPrice(v.preco) + '</span>' +
        '<span class="variation-check" aria-hidden="true"></span>' +
        '</li>'
    }).join('')

    lista.querySelectorAll('.variation-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation()
        selecionarVariacao(parseInt(item.dataset.idx, 10))
      })
    })
  }

  if (vars.length === 1) selecionarVariacao(0)

  var qtyValEl = document.getElementById('qty-value')
  if (qtyValEl) qtyValEl.textContent = '1'
  atualizarBotaoSheet()

  var sheetEl = document.getElementById('variations-sheet')
  if (sheetEl) {
    sheetEl.classList.add('active')
    sheetEl.setAttribute('aria-hidden', 'false')
  }
  var overlayEl = document.querySelector('.sheet-overlay')
  if (overlayEl) overlayEl.classList.add('active')
  document.body.style.overflow = 'hidden'
}

function fecharSheet() {
  var sheetEl = document.getElementById('variations-sheet')
  if (sheetEl) {
    sheetEl.classList.remove('active')
    sheetEl.setAttribute('aria-hidden', 'true')
  }
  var overlayEl = document.querySelector('.sheet-overlay')
  if (overlayEl) overlayEl.classList.remove('active')
  document.body.style.overflow = ''
  estado.sheetProduto  = null
  estado.sheetVariacao = null
  estado.sheetVarIdx   = null
  estado.sheetQtd      = 1
}

function selecionarVariacao(idx) {
  var vars = estado.sheetProduto ? (estado.sheetProduto.variacoes || []) : []
  estado.sheetVariacao = vars[idx] || null
  estado.sheetVarIdx   = idx

  document.querySelectorAll('.variation-item').forEach(function (item) {
    var ativo = parseInt(item.dataset.idx, 10) === idx
    item.classList.toggle('selected', ativo)
    item.setAttribute('aria-selected', ativo ? 'true' : 'false')
  })

  var listaEl = document.getElementById('variations-list')
  if (listaEl) listaEl.style.outline = ''
  atualizarBotaoSheet()
}

function atualizarBotaoSheet() {
  var btn     = document.getElementById('sheet-add-btn')
  var produto = estado.sheetProduto
  if (!btn || !produto) return

  var preco = null
  if (estado.sheetVariacao) {
    preco = estado.sheetVariacao.preco
  } else {
    var vars = produto.variacoes || []
    if (vars.length === 0) preco = produto.preco_base
  }

  btn.textContent = preco !== null
    ? 'Adicionar — ' + formatPrice(preco * estado.sheetQtd)
    : 'Adicionar — ...'
}

/* ─── Carrinho ───────────────────────────────────────────── */
function adicionarAoCarrinho(produto, variacao, quantidade) {
  var varNome  = variacao ? variacao.nome  : ''
  var varPreco = variacao ? variacao.preco : produto.preco_base

  var existente = null
  for (var i = 0; i < estado.carrinho.length; i++) {
    if (estado.carrinho[i].produtoId === produto.id &&
        estado.carrinho[i].variacaoNome === varNome) {
      existente = estado.carrinho[i]
      break
    }
  }

  if (existente) {
    existente.quantidade += quantidade
  } else {
    estado.carrinho.push({
      produtoId:    produto.id,
      variacaoNome: varNome,
      nome:         produto.nome,
      preco:        varPreco,
      quantidade:   quantidade,
    })
  }

  salvarCarrinho()
  atualizarUICarrinho()
  animacaoBadge()
}

function removerDoCarrinho(idx) {
  estado.carrinho.splice(idx, 1)
  salvarCarrinho()
  atualizarUICarrinho()
  renderizarItensCarrinho()
}

function alterarQuantidadeCarrinho(idx, delta) {
  if (!estado.carrinho[idx]) return
  estado.carrinho[idx].quantidade += delta
  if (estado.carrinho[idx].quantidade <= 0) {
    removerDoCarrinho(idx)
    return
  }
  salvarCarrinho()
  atualizarUICarrinho()
  renderizarItensCarrinho()
}

function salvarCarrinho() {
  try {
    localStorage.setItem('tc_carrinho', JSON.stringify(estado.carrinho))
  } catch (e) { /* quota exceeded — silencioso */ }
}

function carregarCarrinhoLocal() {
  try {
    var raw = localStorage.getItem('tc_carrinho')
    if (raw) estado.carrinho = JSON.parse(raw)
  } catch (e) {
    estado.carrinho = []
  }
}

function calcularTotais() {
  var subtotal = estado.carrinho.reduce(function (s, i) {
    return s + i.preco * i.quantidade
  }, 0)
  var tipoEl  = document.getElementById('tipo-entrega')
  var taxaEntrega = (estado.dados && estado.dados.loja && estado.dados.loja.taxa_entrega != null)
    ? Number(estado.dados.loja.taxa_entrega)
    : 10.00
  var entrega = (tipoEl && !tipoEl.checked) ? 0.00 : taxaEntrega
  var total   = subtotal + entrega
  var totalItens = estado.carrinho.reduce(function (s, i) {
    return s + i.quantidade
  }, 0)
  return { subtotal: subtotal, entrega: entrega, total: total, totalItens: totalItens }
}

function atualizarUICarrinho() {
  var t       = calcularTotais()
  var temItens = t.totalItens > 0

  var floatBtn = document.getElementById('cart-float-btn')
  if (floatBtn) {
    floatBtn.classList.toggle('visible', temItens)
    floatBtn.setAttribute('aria-hidden', temItens ? 'false' : 'true')
  }

  var countEl = document.getElementById('cart-float-count')
  if (countEl) countEl.textContent = t.totalItens + ' ' + (t.totalItens === 1 ? 'item' : 'itens')

  var totalEl = document.getElementById('cart-float-total')
  if (totalEl) totalEl.textContent = 'Ver pedido · ' + formatPrice(t.total) + ' →'
}

/* ─── Página do carrinho ─────────────────────────────────── */
function abrirCarrinho() {
  var labelTaxa = document.getElementById('label-taxa-entrega')
  if (labelTaxa && estado.dados && estado.dados.loja) {
    var taxa = Number(estado.dados.loja.taxa_entrega || 10)
    labelTaxa.textContent = taxa > 0 ? '+' + formatPrice(taxa) : 'grátis'
  }

  renderizarItensCarrinho()

  var nomeSalvo  = localStorage.getItem('tc_nome')
  var whatsSalvo = localStorage.getItem('tc_whatsapp')
  var nomeInput  = document.getElementById('customer-name')
  var whatsInput = document.getElementById('customer-whatsapp')
  if (nomeSalvo  && nomeInput  && !nomeInput.value)  nomeInput.value  = nomeSalvo
  if (whatsSalvo && whatsInput && !whatsInput.value) whatsInput.value = whatsSalvo

  var cartPageEl = document.getElementById('cart-page')
  if (cartPageEl) {
    cartPageEl.classList.add('active')
    cartPageEl.setAttribute('aria-hidden', 'false')
  }
  document.body.style.overflow = 'hidden'
}

function fecharCarrinho() {
  var cartPageEl = document.getElementById('cart-page')
  if (cartPageEl) {
    cartPageEl.classList.remove('active')
    cartPageEl.setAttribute('aria-hidden', 'true')
  }
  document.body.style.overflow = ''
}

function renderizarItensCarrinho() {
  var container = document.querySelector('.cart-items')
  if (!container) return

  if (estado.carrinho.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:3rem 1rem;color:#6E6E73">' +
      '<div style="display:flex;justify-content:center;margin-bottom:.75rem">' + cookieSVG(48) + '</div>' +
      '<p style="font-size:.95rem">Seu carrinho está vazio</p>' +
      '</div>'
  } else {
    container.innerHTML = estado.carrinho.map(function (item, idx) {
      return '<div class="cart-item">' +
        '<div class="cart-item-info">' +
        '<span class="cart-item-name">' + esc(item.nome) + '</span>' +
        (item.variacaoNome
          ? '<span class="cart-item-variation">' + esc(item.variacaoNome) + '</span>'
          : '') +
        '</div>' +
        '<div class="cart-item-controls">' +
        '<button class="cart-qty-btn" data-action="dec" data-idx="' + idx + '" aria-label="Diminuir">−</button>' +
        '<span class="cart-qty-value">' + item.quantidade + '</span>' +
        '<button class="cart-qty-btn" data-action="inc" data-idx="' + idx + '" aria-label="Aumentar">+</button>' +
        '<span class="cart-item-price">' + formatPrice(item.preco * item.quantidade) + '</span>' +
        '<button class="cart-remove-btn" data-idx="' + idx + '" aria-label="Remover item">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">' +
        '<path d="M9 3v1H4v2h1v13a2 2 0 002 2h10a2 2 0 002-2V6h1V4h-5V3H9zm0 5h2v9H9V8zm4 0h2v9h-2V8z"/>' +
        '</svg></button>' +
        '</div></div>'
    }).join('')

    container.querySelectorAll('.cart-qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx   = parseInt(btn.dataset.idx, 10)
        var delta = btn.dataset.action === 'inc' ? 1 : -1
        alterarQuantidadeCarrinho(idx, delta)
      })
    })

    container.querySelectorAll('.cart-remove-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removerDoCarrinho(parseInt(btn.dataset.idx, 10))
      })
    })
  }

  atualizarResumo()
}

function atualizarResumo() {
  var t = calcularTotais()
  var sub = document.getElementById('summary-subtotal')
  var del = document.getElementById('summary-delivery')
  var tot = document.getElementById('summary-total')
  if (sub) sub.textContent = formatPrice(t.subtotal)
  if (del) del.textContent = formatPrice(t.entrega)
  if (tot) tot.textContent = formatPrice(t.total)
}

/* ─── Finalizar pedido ───────────────────────────────────── */
function finalizarPedido() {
  if (estado.dados && estado.dados.loja && estado.dados.loja.fechada === true) {
    var motivo = estado.dados.loja.fechada_motivo || 'A loja está fechada no momento.'
    alert(motivo + '\n\nNão é possível finalizar o pedido agora.')
    return
  }

  var nomeInput  = document.getElementById('customer-name')
  var whatsInput = document.getElementById('customer-whatsapp')
  var obsInput   = document.getElementById('obs-input')
  var nomeErr    = document.getElementById('name-error')
  var whatsErr   = document.getElementById('whatsapp-error')

  if (!nomeInput || !whatsInput) return

  var nome  = nomeInput.value.trim()
  var whats = whatsInput.value.replace(/\D/g, '')
  var valido = true

  if (!nome) {
    if (nomeErr) nomeErr.removeAttribute('hidden')
    nomeInput.classList.add('error')
    nomeInput.focus()
    valido = false
  } else {
    if (nomeErr) nomeErr.setAttribute('hidden', '')
    nomeInput.classList.remove('error')
  }

  if (!whats || whats.length < 10) {
    if (whatsErr) whatsErr.removeAttribute('hidden')
    whatsInput.classList.add('error')
    if (valido) whatsInput.focus()
    valido = false
  } else {
    if (whatsErr) whatsErr.setAttribute('hidden', '')
    whatsInput.classList.remove('error')
  }

  var tipoEntregaEl = document.getElementById('tipo-entrega')
  var isEntrega     = !tipoEntregaEl || tipoEntregaEl.checked
  var enderecoInput = document.getElementById('customer-endereco')
  var endereco      = enderecoInput ? enderecoInput.value.trim() : ''
  if (isEntrega && !endereco) {
    if (enderecoInput) {
      enderecoInput.style.borderColor = '#E94560'
      if (valido) enderecoInput.focus()
    }
    valido = false
  } else if (enderecoInput) {
    enderecoInput.style.borderColor = ''
  }

  var consentimento = document.getElementById('lgpd-consent')
  var lgpdCheck = consentimento ? consentimento.closest('.lgpd-check') : null
  if (consentimento && !consentimento.checked) {
    if (lgpdCheck) {
      lgpdCheck.style.outline = '2px solid #E94560'
      lgpdCheck.style.borderRadius = '8px'
      lgpdCheck.style.padding = '6px'
    }
    consentimento.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  if (lgpdCheck) lgpdCheck.style.outline = ''

  if (!valido || estado.carrinho.length === 0) return

  try {
    localStorage.setItem('tc_nome', nome)
    localStorage.setItem('tc_whatsapp', whatsInput.value.trim())
  } catch (e) { /* silencioso */ }

  var numCliente = whats
  if (numCliente.charAt(0) === '0') numCliente = numCliente.slice(1)
  if (numCliente.length <= 11) numCliente = '55' + numCliente

  var obs = obsInput ? obsInput.value.trim() : ''
  var t   = calcularTotais()

  var pagamentoEl  = document.querySelector('input[name="pagamento"]:checked')
  var pagamento    = pagamentoEl ? pagamentoEl.value : 'pix'
  var pagNomes     = { pix: 'PIX', cartao: 'Cartão', dinheiro: 'Dinheiro' }
  var trocoInput   = document.getElementById('customer-troco')
  var troco        = trocoInput ? trocoInput.value.trim() : ''

  var linhasItens = estado.carrinho.map(function (item) {
    var varStr  = item.variacaoNome ? ' (' + item.variacaoNome + ')' : ''
    var precoStr = formatPrice(item.preco * item.quantidade)
    return '- ' + item.quantidade + 'x ' + item.nome + varStr + ' — ' + precoStr
  }).join('\n')

  var linhaEntrega = isEntrega
    ? 'Taxa de entrega: ' + formatPrice(t.entrega)
    : 'Retirada na loja: grátis'

  var infoEntregaPag =
    '\n' + (isEntrega ? 'Entrega em domicílio' : 'Retirada na loja') +
    (isEntrega && endereco ? '\nEndereço: ' + endereco : '') +
    '\nPagamento: ' + (pagNomes[pagamento] || pagamento) +
    (pagamento === 'dinheiro' && troco ? '\nTroco para: ' + troco : '')

  var msg =
    'Olá, Turbo Cookies!\n\n' +
    '*Pedido de ' + nome + ':*\n\n' +
    linhasItens + '\n\n' +
    'Subtotal: ' + formatPrice(t.subtotal) + '\n' +
    linhaEntrega + '\n' +
    '*Total: ' + formatPrice(t.total) + '*' +
    infoEntregaPag + '\n\n' +
    'Meu WhatsApp: ' + formatarExibicaoWhatsApp(numCliente) +
    (obs ? '\nObs: ' + obs : '')

  var wppLoja = (estado.dados.loja.whatsapp || '').replace(/\D/g, '')
  window.open(
    'https://wa.me/' + wppLoja + '?text=' + encodeURIComponent(msg),
    '_blank',
    'noopener,noreferrer'
  )
}

/* ─── Animação de entrada dos cards ─────────────────────── */
function iniciarAnimacaoCards() {
  var cards = Array.from(document.querySelectorAll('.product-card'))
  if (!cards.length) return

  cards.forEach(function(card) {
    card.classList.add('card-hidden')
  })

  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return
      var card = entry.target
      var idx  = cards.indexOf(card) % 4
      setTimeout(function() {
        card.classList.remove('card-hidden')
      }, idx * 60)
      obs.unobserve(card)
    })
  }, { threshold: 0.05 })

  cards.forEach(function(card) { obs.observe(card) })
}

/* ─── IntersectionObserver ───────────────────────────────── */
function iniciarObservador() {
  var sections = document.querySelectorAll('.category-section')
  if (!sections.length) return

  var navBar  = document.getElementById('categories-bar')
  var navH    = navBar ? navBar.offsetHeight : 48
  var rootMarginTop = 56 + navH + 8  // header + categories bar + folga

  var observer = new IntersectionObserver(function (entries) {
    if (observadorBloqueado) return
    entries.forEach(function (entry) {
      if (entry.isIntersecting) ativarPill(entry.target.dataset.catId)
    })
  }, {
    threshold: 0,
    rootMargin: '-' + rootMarginTop + 'px 0px -55% 0px',
  })

  sections.forEach(function (s) { observer.observe(s) })
}

/* ─── Header scroll ──────────────────────────────────────── */
function iniciarHeaderScroll() {
  var header = document.getElementById('header')
  if (!header) return
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 10)
  }, { passive: true })
}

/* ─── Animações ──────────────────────────────────────────── */
function animacaoBadge() {
  var btn = document.getElementById('cart-float-btn')
  if (!btn) return
  btn.classList.remove('bounce')
  void btn.offsetWidth
  btn.classList.add('bounce')
  setTimeout(function () { btn.classList.remove('bounce') }, 400)
}

function animacaoBtnAdd(btn) {
  btn.style.transition = 'transform 0.08s ease'
  btn.style.transform  = 'scale(1.2)'
  setTimeout(function () {
    btn.style.transform = 'scale(1)'
    setTimeout(function () {
      btn.style.transform  = ''
      btn.style.transition = ''
    }, 80)
  }, 80)
}

/* ─── Formatação ─────────────────────────────────────────── */
function formatPrice(valor) {
  return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',')
}

function aplicarMascaraWhatsApp(input) {
  var d = input.value.replace(/\D/g, '').slice(0, 11)
  var v = ''
  if (d.length > 0) v = '(' + d.slice(0, 2)
  if (d.length >= 3) v += ') ' + d.slice(2, 7)
  if (d.length >= 8) v += '-' + d.slice(7, 11)
  input.value = v
}

function formatarExibicaoWhatsApp(num) {
  var local = num.startsWith('55') ? num.slice(2) : num
  if (local.length === 11) {
    return '(' + local.slice(0,2) + ') ' + local.slice(2,7) + '-' + local.slice(7)
  }
  if (local.length === 10) {
    return '(' + local.slice(0,2) + ') ' + local.slice(2,6) + '-' + local.slice(6)
  }
  return num
}

/* ─── Utilitários ────────────────────────────────────────── */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function encontrarProduto(id) {
  if (!estado.dados) return null
  if (estado.todosOsProdutos) return estado.todosOsProdutos[id] || null
  var cats = estado.dados.categorias
  for (var i = 0; i < cats.length; i++) {
    var prods = cats[i].produtos
    for (var j = 0; j < prods.length; j++) {
      if (prods[j].id === id) return prods[j]
    }
  }
  return null
}

/* ─── Event listeners ────────────────────────────────────── */
function registrarEventos() {
  iniciarHeaderScroll()

  // Botão flutuante do carrinho → abrir carrinho
  var cartFloatBtn = document.getElementById('cart-float-btn')
  if (cartFloatBtn) cartFloatBtn.addEventListener('click', abrirCarrinho)

  // Botão voltar
  var backBtn = document.getElementById('cart-back-btn')
  if (backBtn) backBtn.addEventListener('click', fecharCarrinho)

  // Header → seta "Sobre a loja"
  var aboutBtn = document.getElementById('header-about-btn')
  if (aboutBtn) aboutBtn.addEventListener('click', abrirSobre)

  var aboutBackBtn = document.getElementById('about-back-btn')
  if (aboutBackBtn) aboutBackBtn.addEventListener('click', fecharSobre)

  // Barra de navegação inferior
  var navCardapio = document.getElementById('nav-cardapio')
  var navBusca    = document.getElementById('nav-busca')

  if (navCardapio) navCardapio.addEventListener('click', function () { ativarAbaNav('cardapio') })
  if (navBusca)    navBusca.addEventListener('click', function () { ativarAbaNav('busca') })

  // Busca
  var searchInput  = document.getElementById('search-input')
  var searchCancel = document.getElementById('search-cancel-btn')
  if (searchInput) searchInput.addEventListener('input', function () {
    executarBusca(searchInput.value)
  })
  if (searchCancel) searchCancel.addEventListener('click', function () { ativarAbaNav('cardapio') })

  var searchResults = document.getElementById('search-results')
  if (searchResults) searchResults.addEventListener('click', manipularCliqueProdutos)

  // Finalizar pedido
  var checkoutBtn = document.getElementById('btn-checkout')
  if (checkoutBtn) checkoutBtn.addEventListener('click', finalizarPedido)

  // Overlay do sheet → fechar
  var overlay = document.querySelector('.sheet-overlay')
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) fecharSheet()
  })

  // Qty no sheet
  var qtyDec = document.getElementById('qty-decrease')
  var qtyInc = document.getElementById('qty-increase')
  var qtyVal = document.getElementById('qty-value')

  if (qtyDec) qtyDec.addEventListener('click', function () {
    if (estado.sheetQtd > 1) {
      estado.sheetQtd--
      if (qtyVal) qtyVal.textContent = estado.sheetQtd
      atualizarBotaoSheet()
    }
  })

  if (qtyInc) qtyInc.addEventListener('click', function () {
    if (estado.sheetQtd < 99) {
      estado.sheetQtd++
      if (qtyVal) qtyVal.textContent = estado.sheetQtd
      atualizarBotaoSheet()
    }
  })

  // Sheet add → adicionar ao carrinho
  var sheetAddBtn = document.getElementById('sheet-add-btn')
  if (sheetAddBtn) sheetAddBtn.addEventListener('click', function () {
    var produto = estado.sheetProduto
    if (!produto) return

    var vars    = produto.variacoes || []
    var temVars = vars.length > 1

    if (temVars && !estado.sheetVariacao) {
      var lista = document.getElementById('variations-list')
      if (lista) {
        lista.style.outline      = '2px solid #E94560'
        lista.style.borderRadius = '16px'
      }
      return
    }

    var variacao = estado.sheetVariacao || (vars.length >= 1 ? vars[0] : null)
    adicionarAoCarrinho(produto, variacao, estado.sheetQtd)
    fecharSheet()
  })

  // Entrega/retirada → mostrar/ocultar endereço + recalcular totais
  document.querySelectorAll('input[name="tipo_entrega"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var campoEndereco = document.getElementById('campo-endereco')
      if (campoEndereco) campoEndereco.classList.toggle('hidden', radio.value === 'retirada')
      atualizarResumo()
    })
  })

  // Pagamento → mostrar/ocultar troco
  document.querySelectorAll('input[name="pagamento"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var campoTroco = document.getElementById('campo-troco')
      if (campoTroco) campoTroco.classList.toggle('hidden', radio.value !== 'dinheiro')
    })
  })

  // Máscara WhatsApp
  var whatsInput = document.getElementById('customer-whatsapp')
  if (whatsInput) {
    whatsInput.addEventListener('input', function () {
      aplicarMascaraWhatsApp(whatsInput)
    })
  }

  // Escape fecha o que estiver aberto
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return
    var sheetEscEl    = document.getElementById('variations-sheet')
    var cartEscEl     = document.getElementById('cart-page')
    var aboutEscEl    = document.getElementById('about-page')
    var sheetAtivo    = sheetEscEl ? sheetEscEl.classList.contains('active') : false
    var carrinhoAtivo = cartEscEl ? cartEscEl.classList.contains('active') : false
    var aboutAtivo    = aboutEscEl ? aboutEscEl.classList.contains('active') : false
    if (sheetAtivo)         fecharSheet()
    else if (carrinhoAtivo) fecharCarrinho()
    else if (aboutAtivo)    fecharSobre()
    else                    ativarAbaNav('cardapio')
  })
}
