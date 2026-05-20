# 🍪 Turbo Cookies — Cardápio Digital

Site público estático do cardápio da Turbo Cookies.  
Hospedado no GitHub Pages em `turbocookies.com.br`.

**Zero dependências · Mobile-first · Funciona offline**

---

## Como visualizar localmente

Abra o arquivo `index.html` direto no navegador:

```
Duplo clique em index.html
```

> **Nota:** Alguns navegadores bloqueiam `fetch()` no protocolo `file://`.  
> Se o cardápio não carregar, use o VS Code com a extensão *Live Server* ou rode:
> ```bash
> npx serve .
> ```

---

## Como hospedar no GitHub Pages

### Passo a passo

1. Crie um repositório público no GitHub chamado `turbo-cookies-cardapio`

2. Faça upload de todos os arquivos para a branch `main`:
   ```bash
   git init
   git add .
   git commit -m "Cardápio digital inicial"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/turbo-cookies-cardapio.git
   git push -u origin main
   ```

3. Ative o GitHub Pages:
   - Vá em **Settings → Pages**
   - Em **Source**, selecione `Deploy from a branch`
   - Branch: `main` / Folder: `/ (root)`
   - Clique **Save**

4. Aguarde 1-2 minutos. O site estará em:
   ```
   https://SEU_USUARIO.github.io/turbo-cookies-cardapio/
   ```

### Configurar domínio personalizado (turbocookies.com.br)

1. Crie um arquivo `CNAME` na raiz com o conteúdo:
   ```
   turbocookies.com.br
   ```

2. No painel do seu registrador de domínio, adicione os registros DNS:
   ```
   CNAME  www              SEU_USUARIO.github.io
   A      @                185.199.108.153
   A      @                185.199.109.153
   A      @                185.199.110.153
   A      @                185.199.111.153
   ```

3. No GitHub Pages, insira o domínio personalizado em **Custom domain**

---

## Atualizar o cardápio.json manualmente

O arquivo `cardapio.json` é o único que precisa ser editado para mudar produtos.  
Abra-o em qualquer editor de texto e siga a estrutura:

```json
{
  "loja": {
    "nome": "Turbo Cookies",
    "slogan": "Cookies artesanais feitos com amor",
    "whatsapp": "5554999999999",
    "cidade": "Guaporé/RS",
    "instagram": "@turbocookies",
    "horario": "Ter a Dom, 14h às 21h"
  },
  "categorias": [
    {
      "id": 1,
      "nome": "Cookies Clássicos",
      "ordem": 1,
      "produtos": [...]
    }
  ],
  "atualizado_em": "2026-05-20T00:00:00"
}
```

### Estrutura de um produto

```json
{
  "id": 1,
  "nome": "Cookie Chocolate",
  "descricao": "Cookie recheado com gotas de chocolate belga.",
  "preco_base": 8.90,
  "foto": null,
  "variacoes": [
    { "nome": "Unitário", "preco": 8.90 },
    { "nome": "Caixa 6",  "preco": 48.00 },
    { "nome": "Caixa 12", "preco": 90.00 }
  ]
}
```

| Campo       | Tipo    | Descrição                                           |
|-------------|---------|-----------------------------------------------------|
| `id`        | número  | ID único do produto (não repetir)                   |
| `nome`      | texto   | Nome exibido no cardápio                            |
| `descricao` | texto   | Descrição curta (opcional)                          |
| `preco_base`| número  | Preço padrão (sem variações)                        |
| `foto`      | texto   | Caminho relativo da foto ex: `"assets/foto.jpg"` ou `null` |
| `variacoes` | array   | Lista de variações com nome e preço                 |

### Adicionar fotos de produtos

1. Coloque a foto na pasta `assets/` (JPG ou WebP recomendado, máx 500KB)
2. No produto, altere `"foto": null` para `"foto": "assets/nome-da-foto.jpg"`

---

## Configurar o número de WhatsApp

No arquivo `cardapio.json`, altere o campo `whatsapp` em `loja`:

```json
"whatsapp": "5554999999999"
```

- **Formato:** código do país + DDD + número, sem espaços ou traços
- **Brasil:** `55` + DDD (2 dígitos) + número (9 dígitos)
- **Exemplo Guaporé/RS:** `5554999999999`

---

## Estrutura de arquivos

```
turbo-cookies-cardapio/
├── index.html          ← Página principal
├── style.css           ← Todos os estilos
├── script.js           ← Toda a lógica JS
├── cardapio.json       ← DADOS DO CARDÁPIO (edite aqui)
├── assets/
│   ├── logo.svg        ← Logo da loja (substitua por PNG se preferir)
│   └── foto-*.jpg      ← Fotos dos produtos (opcional)
└── README.md           ← Esta documentação
```

---

## Integração com o sistema de gestão

Este repositório é atualizado automaticamente pelo sistema de gestão desktop (**Fase 12**).  
O sistema exporta o `cardapio.json` com todos os produtos ativos e faz push para este repositório via GitHub API.

Para publicar manualmente, use o botão **"Publicar Cardápio"** no sistema de gestão (em desenvolvimento).

---

*🍪 Que os cookies sejam sempre quentinhos!*
