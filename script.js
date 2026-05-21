/*  Estado global  */
var estado = {
  dados:         null,
  carrinho:      [],
  sheetProduto:  null,
  sheetVariacao: null,
  sheetVarIdx:   null,
  sheetQtd:      1,
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

      document.getElementById('loading').style.display = 'none'
      var app = document.getElementById('app')
      app.removeAttribute('hidden')

      renderHero(dados.loja)
      renderFooter(dados.loja)
      renderCategorias(dados.categorias)
      renderProdutos(dados.categorias)
      atualizarUICarrinho()

      requestAnimationFrame(iniciarObservador)
    })
    .catch(function (err) {
      document.getElementById('loading').innerHTML =
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

/*  Hero  */
function renderHero(loja) {
  var titulo = document.getElementById('hero-title')
  var sub    = document.getElementById('hero-subtitle')
  if (titulo) titulo.textContent = loja.nome
  if (sub)    sub.textContent   = (loja.slogan || 'Cookies artesanais feitos com amor') + ' 🍪'

  var chipCity = document.getElementById('hero-chip-city')
  if (chipCity && loja.cidade) {
    chipCity.querySelector('.chip-text').textContent = loja.cidade
  }
}

/*  Footer  */
function renderFooter(loja) {
  var nome = document.getElementById('footer-name')
  if (nome) nome.textContent = loja.nome

  var meta = document.getElementById('footer-meta')
  if (!meta) return

  var itens = []
  if (loja.instagram) itens.push('📸 ' + loja.instagram)
  if (loja.cidade)    itens.push('📍 ' + loja.cidade)
  if (loja.horario)   itens.push('⏰ ' + loja.horario)

  meta.innerHTML = itens.map(function (txt) {
    return '<span>' + esc(txt) + '</span>'
  }).join('')
}

/* ─── Categorias (pills) ─────────────────────────────────── */
function renderCategorias(categorias) {
  var container = document.getElementById('categories-scroll')
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
}

function ativarPill(catId) {
  document.querySelectorAll('.category-pill').forEach(function (p) {
    var ativo = p.dataset.catId === String(catId)
    p.classList.toggle('active', ativo)
    if (ativo) p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
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
    if (btnAdd) {
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
    if (card) {
      var produto = encontrarProduto(parseInt(card.dataset.id, 10))
      if (produto) abrirSheet(produto)
    }
  })
}

function criarCardHTML(produto) {
  var vars    = produto.variacoes || []
  var temVars = vars.length > 1

  var precoHtml
  if (temVars) {
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
      '<div class="thumb-placeholder" style="display:none" aria-hidden="true">🍪</div>'
    : '<div class="thumb-placeholder" aria-hidden="true">🍪</div>'

  var descHtml = produto.descricao
    ? '<p class="product-desc">' + esc(produto.descricao) + '</p>'
    : ''

  return '<article class="product-card" data-id="' + produto.id + '">' +
    '<div class="product-info">' +
    '<h3 class="product-name">' + esc(produto.nome) + '</h3>' +
    descHtml + precoHtml +
    '</div>' +
    '<div class="product-thumb">' +
    fotoHtml +
    '<button class="btn-add" data-id="' + produto.id + '" ' +
    'aria-label="Adicionar ' + esc(produto.nome) + ' ao carrinho">+</button>' +
    '</div></article>'
}

/* ─── Bottom Sheet ───────────────────────────────────────── */
function abrirSheet(produto) {
  estado.sheetProduto  = produto
  estado.sheetVariacao = null
  estado.sheetVarIdx   = null
  estado.sheetQtd      = 1

  document.getElementById('sheet-product-name').textContent = produto.nome

  var descEl = document.getElementById('sheet-product-desc')
  if (descEl) {
    descEl.textContent  = produto.descricao || ''
    descEl.style.display = produto.descricao ? '' : 'none'
  }

  var fotoEl = document.getElementById('sheet-product-photo')
  if (fotoEl) {
    fotoEl.innerHTML = produto.foto
      ? '<img src="' + esc(produto.foto) + '" alt="' + esc(produto.nome) + '">'
      : '🍪'
  }

  var lista = document.getElementById('variations-list')
  var vars  = produto.variacoes || []
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

  if (vars.length === 1) selecionarVariacao(0)

  document.getElementById('qty-value').textContent = '1'
  atualizarBotaoSheet()

  document.getElementById('variations-sheet').classList.add('active')
  document.getElementById('variations-sheet').setAttribute('aria-hidden', 'false')
  document.querySelector('.sheet-overlay').classList.add('active')
  document.body.style.overflow = 'hidden'
}

function fecharSheet() {
  document.getElementById('variations-sheet').classList.remove('active')
  document.getElementById('variations-sheet').setAttribute('aria-hidden', 'true')
  document.querySelector('.sheet-overlay').classList.remove('active')
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

  document.getElementById('variations-list').style.outline = ''
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

  document.getElementById('cart-page').classList.add('active')
  document.getElementById('cart-page').setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'
}

function fecharCarrinho() {
  document.getElementById('cart-page').classList.remove('active')
  document.getElementById('cart-page').setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
}

function renderizarItensCarrinho() {
  var container = document.querySelector('.cart-items')
  if (!container) return

  if (estado.carrinho.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:3rem 1rem;color:#6E6E73">' +
      '<div style="font-size:3rem;margin-bottom:.75rem">🍪</div>' +
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

  var nome  = nomeInput.value.trim()
  var whats = whatsInput.value.replace(/\D/g, '')
  var valido = true

  if (!nome) {
    nomeErr.removeAttribute('hidden')
    nomeInput.classList.add('error')
    nomeInput.focus()
    valido = false
  } else {
    nomeErr.setAttribute('hidden', '')
    nomeInput.classList.remove('error')
  }

  if (!whats || whats.length < 10) {
    whatsErr.removeAttribute('hidden')
    whatsInput.classList.add('error')
    if (valido) whatsInput.focus()
    valido = false
  } else {
    whatsErr.setAttribute('hidden', '')
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
  if (!consentimento.checked) {
    consentimento.closest('.lgpd-check').style.outline = '2px solid #E94560'
    consentimento.closest('.lgpd-check').style.borderRadius = '8px'
    consentimento.closest('.lgpd-check').style.padding = '6px'
    consentimento.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  consentimento.closest('.lgpd-check').style.outline = ''

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
  btn.style.transform = 'scale(0.85)'
  setTimeout(function () { btn.style.transform = '' }, 150)
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
      qtyVal.textContent = estado.sheetQtd
      atualizarBotaoSheet()
    }
  })

  if (qtyInc) qtyInc.addEventListener('click', function () {
    if (estado.sheetQtd < 99) {
      estado.sheetQtd++
      qtyVal.textContent = estado.sheetQtd
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
      lista.style.outline      = '2px solid #E94560'
      lista.style.borderRadius = '16px'
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
    var sheetAtivo    = document.getElementById('variations-sheet').classList.contains('active')
    var carrinhoAtivo = document.getElementById('cart-page').classList.contains('active')
    if (sheetAtivo)        fecharSheet()
    else if (carrinhoAtivo) fecharCarrinho()
  })
}
