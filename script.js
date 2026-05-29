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

      var loading = document.getElementById('loading')
      if (loading) loading.style.display = 'none'
      var app = document.getElementById('app')
      if (app) app.removeAttribute('hidden')

      renderHero(dados.loja)
      renderFooter(dados.loja)

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
        '<p style="font-size:3rem;margin-bottom:1rem">🍪</p>' +
        '<p style="font-size:1rem;color:#1D1D1F;margin-bottom:.5rem">' +
        'Não foi possível carregar o cardápio</p>' +
        '<p style="font-size:.8rem;color:#6E6E73;margin-bottom:1.5rem">' +
        esc(err.message) + '</p>' +
        '<button onclick="location.reload()" style="background:#E94560;color:white;' +
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

/*  Hero  */
function renderHero(loja) {
  var titulo = document.getElementById('hero-title')
  var sub    = document.getElementById('hero-subtitle')
  if (titulo) titulo.textContent = loja.nome || ''
  if (sub)    sub.textContent   = loja.slogan || ''

  var chips = document.getElementById('hero-chips')
  if (!chips) return

  var svgPin = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
  var svgClk = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>'
  var svgMto = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5 1.96 2.5H17V9.5h2.5zM7 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.22-3c-.55-.61-1.35-1-2.22-1s-1.67.39-2.22 1H3V6h12v9H9.22zM17 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>'

  var chipList = []

  if (loja.cidade) {
    chipList.push('<span class="hero-chip" role="listitem">' + svgPin + '<span>' + esc(loja.cidade) + '</span></span>')
  }
  if (loja.horario) {
    chipList.push('<span class="hero-chip" role="listitem">' + svgClk + '<span>' + esc(loja.horario) + '</span></span>')
  }
  if (loja.taxa_entrega !== undefined) {
    var taxaTxt = loja.taxa_entrega > 0 ? 'Entrega ' + formatPrice(loja.taxa_entrega) : 'Entrega grátis'
    chipList.push('<span class="hero-chip" role="listitem">' + svgMto + '<span>' + taxaTxt + '</span></span>')
  }
  if (loja.horario_abertura && loja.horario_fechamento) {
    var aberto   = verificarHorario(loja.horario_abertura, loja.horario_fechamento)
    var svgOk    = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
    var svgNo    = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>'
    var stClass  = aberto ? 'hero-chip--open' : 'hero-chip--closed'
    var stIcon   = aberto ? svgOk : svgNo
    var stTxt    = aberto ? 'Aberto agora' : ('Abre às ' + esc(loja.horario_abertura))
    chipList.push('<span class="hero-chip ' + stClass + '" role="listitem">' + stIcon + '<span>' + stTxt + '</span></span>')
  }

  chips.innerHTML = chipList.join('')
}

/*  Footer  */
function renderFooter(loja) {
  var nomeEl   = document.getElementById('footer-name')
  var sloganEl = document.getElementById('footer-slogan')
  var cityEl   = document.getElementById('footer-city')
  var copyEl   = document.getElementById('footer-copy')

  if (nomeEl)   nomeEl.textContent   = loja.nome   || ''
  if (sloganEl) sloganEl.textContent = loja.slogan || ''
  if (cityEl)   cityEl.textContent   = loja.cidade || ''
  if (copyEl)   copyEl.textContent   = '© ' + new Date().getFullYear() + ' ' + (loja.nome || 'Turbo Cookies') + ' · Todos os direitos reservados'

  var contact = document.getElementById('footer-contact')
  if (!contact) return

  var svgWpp = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.998 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5.008L2.007 22l5.137-1.302A9.954 9.954 0 0 0 11.998 22c5.523 0 10-4.477 10-10S17.521 2 11.998 2zm0 18.001a7.96 7.96 0 0 1-4.09-1.126l-.293-.174-3.046.772.806-2.967-.191-.305A7.956 7.956 0 0 1 4 12c0-4.41 3.589-8 7.998-8 4.41 0 8 3.59 8 8s-3.59 8-8 8z"/></svg>'
  var svgInsta = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>'

  var html = '<h3 class="footer-col-title">Contato</h3>'

  if (loja.whatsapp) {
    var wppNum = loja.whatsapp.replace(/\D/g, '')
    html += '<a href="https://wa.me/' + wppNum + '" class="footer-link" target="_blank" rel="noopener noreferrer">' +
      svgWpp + '<span>' + esc(formatarExibicaoWhatsApp(wppNum)) + '</span></a>'
  }
  if (loja.instagram) {
    var handle = loja.instagram.replace(/^@/, '')
    html += '<a href="https://instagram.com/' + encodeURIComponent(handle) + '" class="footer-link" target="_blank" rel="noopener noreferrer">' +
      svgInsta + '<span>' + esc(loja.instagram) + '</span></a>'
  }

  contact.innerHTML = html
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

  main.addEventListener('click', function (e) {
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
  })
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

  container.innerHTML = blocos.map(function (bloco, idx) {
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
    sidebar.innerHTML = blocos.map(function (bloco, idx) {
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
      '<h2 class="category-title">' + esc(bloco.titulo) + '</h2>' +
      '<div class="products-list">' +
      prods.map(function (p) { return criarCardHTML(p, produtoBadge[p.id] || null) }).join('') +
      '</div></section>'
  }).join('')

  main.addEventListener('click', function (e) {
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
  })
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

  var descHtml = produto.descricao
    ? '<p class="product-desc">' + esc(produto.descricao) + '</p>'
    : ''

  var badgeHtml = badge ? '<span class="product-badge">' + esc(badge) + '</span>' : ''

  return '<article class="product-card"' + (esgotado ? ' data-esgotado="true" style="opacity:.5"' : '') + ' data-id="' + produto.id + '">' +
    '<div class="product-info">' +
    badgeHtml +
    '<h3 class="product-name">' + esc(produto.nome) + '</h3>' +
    descHtml + precoHtml +
    '</div>' +
    '<div class="product-thumb">' +
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
  var entrega = (tipoEl && !tipoEl.checked) ? 0.00 : 10.00
  var total   = subtotal + entrega
  var totalItens = estado.carrinho.reduce(function (s, i) {
    return s + i.quantidade
  }, 0)
  return { subtotal: subtotal, entrega: entrega, total: total, totalItens: totalItens }
}

function atualizarUICarrinho() {
  var t       = calcularTotais()
  var temItens = t.totalItens > 0

  var badge = document.getElementById('cart-badge')
  if (badge) {
    badge.textContent = t.totalItens
    badge.classList.toggle('visible', temItens)
  }

  var cartBar = document.getElementById('cart-bar')
  if (cartBar) {
    cartBar.classList.toggle('visible', temItens)
    cartBar.setAttribute('aria-hidden', temItens ? 'false' : 'true')
  }

  var countEl = document.getElementById('cart-bar-count')
  if (countEl) countEl.textContent = t.totalItens + ' ' + (t.totalItens === 1 ? 'item' : 'itens')

  var totalBarEl = document.getElementById('cart-bar-total')
  if (totalBarEl) totalBarEl.textContent = formatPrice(t.total)
}

/* ─── Página do carrinho ─────────────────────────────────── */
function abrirCarrinho() {
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
        '<button class="cart-remove-btn" data-idx="' + idx + '" aria-label="Remover item">🗑</button>' +
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
    '\n📦 ' + (isEntrega ? 'Entrega em domicílio' : 'Retirada na loja') +
    (isEntrega && endereco ? '\n📍 Endereço: ' + endereco : '') +
    '\n💳 Pagamento: ' + (pagNomes[pagamento] || pagamento) +
    (pagamento === 'dinheiro' && troco ? '\n💵 Troco para: ' + troco : '')

  var msg =
    'Olá, Turbo Cookies! 🍪\n\n' +
    '*Pedido de ' + nome + ':*\n\n' +
    linhasItens + '\n\n' +
    'Subtotal: ' + formatPrice(t.subtotal) + '\n' +
    linhaEntrega + '\n' +
    '*Total: ' + formatPrice(t.total) + '*' +
    infoEntregaPag + '\n\n' +
    '📱 Meu WhatsApp: ' + formatarExibicaoWhatsApp(numCliente) +
    (obs ? '\n📝 Obs: ' + obs : '')

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
  var badge = document.getElementById('cart-badge')
  if (!badge) return
  badge.classList.remove('bounce')
  void badge.offsetWidth
  badge.classList.add('bounce')
  setTimeout(function () { badge.classList.remove('bounce') }, 400)
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

  // Header → abrir carrinho
  var headerCartBtn = document.getElementById('header-cart-btn')
  if (headerCartBtn) headerCartBtn.addEventListener('click', abrirCarrinho)

  // Cart bar → abrir carrinho
  var cartBar = document.getElementById('cart-bar')
  if (cartBar) cartBar.addEventListener('click', abrirCarrinho)

  // Botão voltar
  var backBtn = document.getElementById('cart-back-btn')
  if (backBtn) backBtn.addEventListener('click', fecharCarrinho)

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
    var sheetAtivo    = sheetEscEl ? sheetEscEl.classList.contains('active') : false
    var carrinhoAtivo = cartEscEl ? cartEscEl.classList.contains('active') : false
    if (sheetAtivo)        fecharSheet()
    else if (carrinhoAtivo) fecharCarrinho()
  })
}
