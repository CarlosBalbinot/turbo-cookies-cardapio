/* ═══════════════════════════════════════════════════════════
   Turbo Cookies — Cardápio Digital
   JS puro, zero dependências
   ═══════════════════════════════════════════════════════════ */

/* ─── Estado global ──────────────────────────────────────────────────────── */
const estado = {
  dados:     null,
  carrinho:  [],   // [{ prodId, varIdx, nome, variacao, preco, quantidade }]
  variacoes: {},   // { prodId: variacaoIndex }
  whatsapp:  '',
}

/* ─── Entry point ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', iniciar)

async function iniciar() {
  try {
    const resp = await fetch('./cardapio.json')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    estado.dados = await resp.json()
    estado.whatsapp = estado.dados.loja?.whatsapp || ''
    renderizar()
  } catch (err) {
    mostrarErro(err.message)
  }
}

/* ─── Render principal ───────────────────────────────────────────────────── */
function renderizar() {
  const { loja, categorias } = estado.dados
  renderizarHero(loja)
  renderizarCategorias(categorias)
  renderizarProdutos(categorias)

  document.getElementById('loading').style.display = 'none'
  const conteudo = document.getElementById('conteudo')
  conteudo.removeAttribute('hidden')
  conteudo.style.display = 'block'

  // Observador após o DOM ser renderizado
  requestAnimationFrame(() => iniciarObservador())
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function renderizarHero(loja) {
  document.title = `${loja.nome} — Cardápio`

  document.getElementById('hero-nome').textContent    = loja.nome
  document.getElementById('hero-slogan').textContent  = loja.slogan || ''
  document.getElementById('hero-horario').textContent = loja.horario ? `⏰ ${loja.horario}` : ''

  const logoImg = document.getElementById('logo-img')
  logoImg.onerror = () => {
    logoImg.style.display = 'none'
  }

  // Rodapé
  document.getElementById('footer-nome').textContent = loja.nome

  if (loja.instagram) {
    const el = document.getElementById('footer-instagram')
    el.textContent = `📸 ${loja.instagram}`
    el.classList.remove('hidden')
  }
  if (loja.cidade) {
    const el = document.getElementById('footer-cidade')
    el.textContent = `📍 ${loja.cidade}`
    el.classList.remove('hidden')
  }
  if (loja.horario) {
    const el = document.getElementById('footer-horario')
    el.textContent = `⏰ ${loja.horario}`
    el.classList.remove('hidden')
  }
}

/* ─── Pills de categorias ────────────────────────────────────────────────── */
function renderizarCategorias(categorias) {
  const wrap = document.getElementById('pills-wrap')
  wrap.innerHTML = categorias.map((cat) =>
    `<button class="cat-pill" role="listitem" data-id="${cat.id}"
             onclick="rolarParaCategoria('cat-${cat.id}')">
       ${cat.nome}
     </button>`
  ).join('')

  // Ativa a primeira pill
  const primeira = wrap.querySelector('.cat-pill')
  if (primeira) primeira.classList.add('active')
}

function rolarParaCategoria(id) {
  const el = document.getElementById(id)
  if (!el) return
  const navH = document.getElementById('nav-categorias').offsetHeight
  const topo = el.getBoundingClientRect().top + window.scrollY - navH - 6
  window.scrollTo({ top: topo, behavior: 'smooth' })
}

function ativarPill(catId) {
  document.querySelectorAll('.cat-pill').forEach((p) => {
    p.classList.toggle('active', p.dataset.id === String(catId))
  })
  // Arrasta a pill ativa para o centro do scroll horizontal
  const pill = document.querySelector(`.cat-pill[data-id="${catId}"]`)
  if (pill) pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}

/* ─── Grid de produtos ───────────────────────────────────────────────────── */
function renderizarProdutos(categorias) {
  const main = document.getElementById('cardapio')
  main.innerHTML = categorias.map((cat) =>
    `<section id="cat-${cat.id}" class="cat-secao" data-cat-id="${cat.id}">
       <div class="cat-header">
         <h2 class="cat-titulo">${cat.nome}</h2>
         <span class="cat-count">${cat.produtos.length} item${cat.produtos.length !== 1 ? 's' : ''}</span>
       </div>
       <div class="produtos-grid">
         ${cat.produtos.map((p) => renderizarCard(p)).join('')}
       </div>
     </section>`
  ).join('')
}

function renderizarCard(produto) {
  const idx   = estado.variacoes[produto.id] || 0
  const vars  = produto.variacoes || []
  const atual = vars[idx] || { nome: '', preco: produto.preco_base }
  const temVars = vars.length > 1

  const fotoHtml = produto.foto
    ? `<img src="${escHtml(produto.foto)}" alt="${escHtml(produto.nome)}" class="foto-img"
            loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      + `<div class="foto-placeholder" style="display:none">🍪</div>`
    : `<div class="foto-placeholder">🍪</div>`

  const variacoesHtml = temVars
    ? `<div class="variacoes" data-prod-id="${produto.id}">
         ${vars.map((v, i) =>
           `<button class="var-pill ${i === idx ? 'active' : ''}"
                    onclick="selecionarVariacao(${produto.id}, ${i}, event)">
              ${escHtml(v.nome)}
            </button>`
         ).join('')}
       </div>`
    : ''

  return `
    <article class="produto-card" id="produto-${produto.id}">
      <div class="foto-wrap">
        ${fotoHtml}
        <button class="btn-mais"
                onclick="adicionarAoCarrinho(${produto.id})"
                title="Adicionar ao carrinho"
                aria-label="Adicionar ${escHtml(produto.nome)} ao carrinho">+</button>
      </div>
      <div class="card-corpo">
        <h3 class="produto-nome">${escHtml(produto.nome)}</h3>
        ${produto.descricao
          ? `<p class="produto-desc">${escHtml(produto.descricao)}</p>`
          : ''}
        ${variacoesHtml}
        <div class="card-rodape">
          <span class="preco" id="preco-${produto.id}">R$ ${fmtPreco(atual.preco)}</span>
          <button class="btn-pedir" onclick="pedirWhatsApp(${produto.id})">
            Pedir pelo WhatsApp
          </button>
        </div>
      </div>
    </article>`
}

/* ─── Seleção de variação ────────────────────────────────────────────────── */
function selecionarVariacao(prodId, idx, event) {
  estado.variacoes[prodId] = idx

  // Atualiza pills
  const wrap = event.target.closest('.variacoes')
  if (wrap) {
    wrap.querySelectorAll('.var-pill').forEach((p, i) => {
      p.classList.toggle('active', i === idx)
    })
  }

  // Atualiza preço exibido no card
  const produto = encontrarProduto(prodId)
  if (produto && produto.variacoes?.[idx]) {
    const el = document.getElementById(`preco-${prodId}`)
    if (el) el.textContent = `R$ ${fmtPreco(produto.variacoes[idx].preco)}`
  }
}

/* ─── Carrinho ───────────────────────────────────────────────────────────── */
function adicionarAoCarrinho(prodId) {
  const produto = encontrarProduto(prodId)
  if (!produto) return

  const idx    = estado.variacoes[prodId] || 0
  const vars   = produto.variacoes || []
  const atual  = vars[idx] || { nome: 'Unitário', preco: produto.preco_base }

  const existente = estado.carrinho.find(
    (i) => i.prodId === prodId && i.varIdx === idx
  )

  if (existente) {
    existente.quantidade++
  } else {
    estado.carrinho.push({
      prodId,
      varIdx:    idx,
      nome:      produto.nome,
      variacao:  atual.nome,
      preco:     atual.preco,
      quantidade: 1,
    })
  }

  atualizarCarrinho()
  animarBotaoCarrinho()
}

function atualizarCarrinho() {
  const qtd = estado.carrinho.reduce((s, i) => s + i.quantidade, 0)
  const btn = document.getElementById('carrinho-float')
  const txt = document.getElementById('carrinho-texto')

  if (qtd > 0) {
    txt.textContent = `${qtd} item${qtd !== 1 ? 's' : ''} — Enviar pedido`
    btn.classList.remove('hidden')
  } else {
    btn.classList.add('hidden')
  }
}

function animarBotaoCarrinho() {
  const btn = document.getElementById('carrinho-float')
  btn.classList.remove('bounce')
  void btn.offsetWidth  // reflow para reiniciar animação
  btn.classList.add('bounce')
  btn.addEventListener('animationend', () => btn.classList.remove('bounce'), { once: true })
}

/* ─── Modal do carrinho ──────────────────────────────────────────────────── */
function abrirCarrinho() {
  renderizarListaCarrinho()
  document.getElementById('modal-carrinho').classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function fecharCarrinho() {
  document.getElementById('modal-carrinho').classList.add('hidden')
  document.body.style.overflow = ''
}

function fecharCarrinhoOverlay(event) {
  if (event.target === event.currentTarget) fecharCarrinho()
}

// Fecha com Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharCarrinho()
})

function renderizarListaCarrinho() {
  const lista = document.getElementById('lista-carrinho')
  const totalEl = document.getElementById('total-valor')

  if (estado.carrinho.length === 0) {
    lista.innerHTML = '<p class="carrinho-vazio">Nenhum item adicionado ainda. 🛒</p>'
    totalEl.textContent = 'R$ 0,00'
    return
  }

  lista.innerHTML = estado.carrinho.map((item, i) =>
    `<div class="carrinho-item" role="listitem">
       <div class="item-info">
         <span class="item-nome">${escHtml(item.nome)}</span>
         ${item.variacao ? `<span class="item-var">${escHtml(item.variacao)}</span>` : ''}
       </div>
       <div class="item-controles">
         <button class="ctrl-qtd" onclick="alterarQtd(${i}, -1)" aria-label="Diminuir">−</button>
         <span class="item-qtd">${item.quantidade}</span>
         <button class="ctrl-qtd" onclick="alterarQtd(${i}, 1)"  aria-label="Aumentar">+</button>
         <span class="item-preco">R$ ${fmtPreco(item.preco * item.quantidade)}</span>
       </div>
     </div>`
  ).join('')

  const total = estado.carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)
  totalEl.textContent = `R$ ${fmtPreco(total)}`
}

function alterarQtd(idx, delta) {
  const item = estado.carrinho[idx]
  if (!item) return
  item.quantidade += delta
  if (item.quantidade <= 0) estado.carrinho.splice(idx, 1)
  atualizarCarrinho()
  renderizarListaCarrinho()
}

function limparCarrinho() {
  if (!confirm('Limpar todos os itens do carrinho?')) return
  estado.carrinho = []
  atualizarCarrinho()
  fecharCarrinho()
}

/* ─── Envio pelo WhatsApp ────────────────────────────────────────────────── */
function pedirWhatsApp(prodId) {
  const produto = encontrarProduto(prodId)
  if (!produto) return

  const idx   = estado.variacoes[prodId] || 0
  const vars  = produto.variacoes || []
  const atual = vars[idx] || { nome: '', preco: produto.preco_base }

  const varStr = atual.nome ? ` - ${atual.nome}` : ''
  const msg = `Olá! Quero pedir na Turbo Cookies:\n\n• ${produto.nome}${varStr} - R$ ${fmtPreco(atual.preco)}\n\nAguardo o atendimento! 🍪`
  abrirWhatsApp(msg)
}

function enviarPedido() {
  if (estado.carrinho.length === 0) return

  const itens = estado.carrinho.map((i) => {
    const varStr = i.variacao ? ` - ${i.variacao}` : ''
    return `• ${i.nome}${varStr} (${i.quantidade}x) - R$ ${fmtPreco(i.preco * i.quantidade)}`
  }).join('\n')

  const total = estado.carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const msg = `Olá! Gostaria de fazer um pedido na Turbo Cookies:\n\n${itens}\n\nTotal: R$ ${fmtPreco(total)}\n\nAguardo o atendimento! 🍪`
  abrirWhatsApp(msg)
}

function abrirWhatsApp(msg) {
  const num = estado.whatsapp.replace(/\D/g, '')
  const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/* ─── IntersectionObserver — pill ativa ao rolar ────────────────────────── */
function iniciarObservador() {
  const sections = document.querySelectorAll('.cat-secao')
  if (!sections.length) return

  const navH = document.getElementById('nav-categorias')?.offsetHeight || 60

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          ativarPill(entry.target.dataset.catId)
        }
      })
    },
    {
      threshold: 0,
      rootMargin: `-${navH + 10}px 0px -55% 0px`,
    }
  )

  sections.forEach((s) => observer.observe(s))
}

/* ─── Utilitários ────────────────────────────────────────────────────────── */
function encontrarProduto(id) {
  for (const cat of estado.dados?.categorias || []) {
    const p = cat.produtos.find((p) => p.id === id)
    if (p) return p
  }
  return null
}

function fmtPreco(valor) {
  return Number(valor || 0).toFixed(2).replace('.', ',')
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function mostrarErro(msg) {
  document.getElementById('loading').innerHTML =
    `<div class="erro-estado">
       <p>🍪</p>
       <p>Não foi possível carregar o cardápio.</p>
       <p style="font-size:0.78rem;opacity:0.55;max-width:260px;text-align:center">${escHtml(msg)}</p>
       <button onclick="location.reload()">Tentar novamente</button>
     </div>`
}
