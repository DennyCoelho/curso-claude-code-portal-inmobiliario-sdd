import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import PropertiesPage from '../src/app/properties/page'
import { PropertyCatalog } from '../src/components/properties/property-catalog'
import { PropertyCatalogResults } from '../src/components/properties/property-catalog-results'
import { fetchPublicProperties } from '../src/lib/api/properties'
import type { PropertyListItem } from '../src/lib/property'
import { buildCatalogSearchUrl, buildPublicPropertiesUrl, parseCatalogSearch, propertySearchSchema } from '../src/lib/property-search'

const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: 'catalog-test',
}

const property: PropertyListItem = {
  id: 'a2050000-0000-4000-8000-000000000001',
  title: 'Casa com jardim em São Paulo',
  operation: 'SALE',
  type: 'HOUSE',
  price: '450000.10',
  neighborhood: 'Pinheiros',
  city: 'São Paulo',
  state: 'SP',
  isFeatured: false,
  bedrooms: 3,
  bathrooms: 2,
  usableArea: '85.50',
  totalArea: '120.00',
  images: [],
}

afterEach(() => mock.restoreAll())

function renderResults(
  properties: PropertyListItem[],
  status: 'loading' | 'error' | 'ready' = 'ready',
) {
  return renderToStaticMarkup(
    <PropertyCatalogResults
      properties={properties}
      status={status}
      onRetry={() => {}}
    />,
  )
}

test('o catálogo exibe a listagem REST completa na ordem recebida, incluindo imóveis sem destaque', async () => {
  const properties = Array.from({ length: 14 }, (_, index) => ({
    ...property,
    id: `a2050000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    title: `Imóvel ${String(index + 1).padStart(2, '0')}`,
    operation: index % 2 === 0 ? ('SALE' as const) : ('RENT' as const),
    isFeatured: index < 3,
  }))
  const snapshot = structuredClone(properties)
  const fetchMock = mock.method(globalThis, 'fetch', async () =>
    Response.json(properties),
  )
  const markup = renderResults(await fetchPublicProperties('/api/properties'))

  assert.equal(fetchMock.mock.callCount(), 1)
  assert.equal(markup.match(/<article /g)?.length, 14)
  assert.match(markup, /14 imóveis disponíveis/)
  assert.match(markup, /À venda/)
  assert.match(markup, /Aluguel/)
  assert.match(markup, /\/mês/)
  let previousPosition = -1
  for (const item of properties) {
    const position = markup.indexOf(item.title)
    assert.ok(position > previousPosition, item.title)
    previousPosition = position
  }
  assert.deepEqual(properties, snapshot)
})

test('o catálogo anuncia a quantidade no singular e mantém semântica de seção e lista', () => {
  const markup = renderResults([property])
  assert.match(
    markup,
    /<section aria-labelledby="catalog-results-title" aria-busy="false"/,
  )
  assert.match(markup, /<h2 id="catalog-results-title"/)
  assert.match(markup, /role="status"[^>]*>1 imóvel disponível/)
  assert.match(markup, /<ul/)
  assert.match(markup, /<li /)
  assert.match(markup, /Pinheiros, São Paulo — SP/)
})

test('o catálogo vazio informa a ausência de imóveis sem renderizar cards nem oferecer nova tentativa', () => {
  const markup = renderResults([])
  assert.match(markup, /role="status"/)
  assert.match(markup, /Nenhum imóvel disponível no momento/)
  assert.doesNotMatch(markup, /<article|<ul|<button|Carregando|role="alert"/)
})

test('o carregamento é anunciado e o erro oferece nova tentativa sem mostrar dados anteriores', () => {
  const loading = renderResults([property], 'loading')
  assert.match(loading, /aria-busy="true"/)
  assert.match(loading, /role="status"/)
  assert.match(loading, /Carregando imóveis…/)
  assert.doesNotMatch(loading, /<article|<button/)

  const error = renderResults([property], 'error')
  assert.match(error, /aria-busy="false"/)
  assert.match(error, /role="alert"/)
  assert.match(error, /Não foi possível carregar os imóveis/)
  assert.match(error, /<button type="button"/)
  assert.match(error, /Tentar novamente/)
  assert.doesNotMatch(error, /<article|Carregando/)
})

test('o componente conectado usa a resposta pública da mesma chave SWR da landing', () => {
  const markup = renderToStaticMarkup(
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnMount: false,
        fallback: { '/api/properties': [property] },
      }}
    >
      <PropertyCatalog />
    </SWRConfig>,
  )
  assert.match(markup, /1 imóvel disponível/)
  assert.ok(markup.includes(property.title))
})

test('a rota apresenta título e introdução em português enquanto aguarda a API', async () => {
  const page = await PropertiesPage({ searchParams: Promise.resolve({}) })
  const markup = renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <SWRConfig value={{ provider: () => new Map() }}>{page}</SWRConfig>
    </AppRouterContext.Provider>,
  )
  assert.match(markup, /<h1[^>]*>Imóveis<\/h1>/)
  assert.match(markup, /imóveis à venda e para alugar/)
  assert.match(markup, /Carregando imóveis…/)
  assert.doesNotMatch(markup, /catálogo.*disponível em breve/)
})

test('a busca normaliza o termo, valida o limite e rejeita parâmetros repetidos', () => {
  assert.deepEqual(parseCatalogSearch('search=+S%C3%A3o+Paulo+'), { success: true, search: 'São Paulo' })
  assert.deepEqual(parseCatalogSearch('search=+++'), { success: true, search: '' })
  assert.deepEqual(parseCatalogSearch('operation=SALE'), { success: true, search: '' })
  assert.ok(propertySearchSchema.safeParse('a'.repeat(200)).success)
  assert.equal(parseCatalogSearch(`search=${'a'.repeat(201)}`).success, false)
  assert.equal(parseCatalogSearch('search=SP&search=PR').success, false)
})

test('buscar e limpar preservam os demais parâmetros e codificam o texto sem criar novos parâmetros', () => {
  const search = ' São José & jardim? <casa> %_\\ '
  const url = new URL(buildCatalogSearchUrl(search, 'operation=SALE&search=antigo&city=Recife'), 'http://localhost')
  assert.equal(url.pathname, '/properties')
  assert.equal(url.searchParams.get('search'), search.trim())
  assert.equal(url.searchParams.get('operation'), 'SALE')
  assert.equal(url.searchParams.get('city'), 'Recife')
  assert.equal(url.searchParams.size, 3)
  assert.equal(buildCatalogSearchUrl('   '), '/properties')
  assert.equal(buildCatalogSearchUrl('', 'operation=RENT&search=SP'), '/properties?operation=RENT')
  assert.equal(buildPublicPropertiesUrl('   '), '/api/properties')
  assert.equal(buildPublicPropertiesUrl(' São Paulo '), '/api/properties?search=S%C3%A3o+Paulo')
})

test('o catálogo usa a chave SWR do termo e não reutiliza a listagem geral ou de outra busca', () => {
  const fallback = { '/api/properties': [property], '/api/properties?search=Curitiba': [{ ...property, title: 'Casa em Curitiba' }] }
  const render = (parameters: string) => renderToStaticMarkup(
    <SWRConfig value={{ provider: () => new Map(), revalidateOnMount: false, fallback }}>
      <PropertyCatalog parameters={parameters} />
    </SWRConfig>,
  )
  const matches = render('search=+Curitiba+&operation=SALE')
  assert.match(matches, /1 imóvel encontrado/)
  assert.match(matches, /Casa em Curitiba/)
  assert.doesNotMatch(matches, /Casa com jardim em São Paulo/)
  const pending = render('search=Recife')
  assert.doesNotMatch(pending, /<article/)
  assert.match(pending, /Resultados para:/)
  const invalid = render('search=SP&search=PR')
  assert.match(invalid, /role="alert"/)
  assert.match(invalid, /Informe apenas um termo de busca/)
  assert.doesNotMatch(invalid, /<article|Carregando imóveis/)
})

test('a busca sem resultados orienta a corrigir ou limpar e escapa o termo pesquisado', () => {
  const markup = renderToStaticMarkup(
    <PropertyCatalogResults properties={[]} status="ready" onRetry={() => {}} search="<script>teste</script>" />,
  )
  assert.match(markup, /Nenhum imóvel encontrado para esta busca/)
  assert.match(markup, /Tente outras palavras ou limpe a busca/)
  assert.match(markup, /role="status"/)
  assert.match(markup, /&lt;script&gt;teste&lt;\/script&gt;/)
  assert.doesNotMatch(markup, /<script>|<article/)
})

test('a rota preenche o formulário GET pela URL e preserva os parâmetros ao limpar', async () => {
  const page = await PropertiesPage({ searchParams: Promise.resolve({ search: 'São Paulo', operation: 'RENT' }) })
  const markup = renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <SWRConfig value={{ provider: () => new Map() }}>{page}</SWRConfig>
    </AppRouterContext.Provider>,
  )
  assert.match(markup, /<form[^>]*role="search"[^>]*aria-label="Buscar no catálogo"[^>]*action="\/properties"[^>]*method="get"/)
  assert.match(markup, /<label for="catalog-search"/)
  assert.match(markup, /value="São Paulo"/)
  assert.match(markup, /type="hidden" name="operation" value="RENT"/)
  assert.match(markup, /href="\/properties\?operation=RENT"/)
  assert.match(markup, /Limpar busca/)
})
