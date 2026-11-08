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
import { buildCatalogFiltersUrl, catalogFiltersSchema, getCatalogFilterValues, parseCatalogFilters } from '../src/lib/property-filters'
import { adjacentPriceSliderIndex, centsAsPrice, formatPriceInput, getPriceSliderValues, maximumPriceSliderIndex, normalizePriceInput, priceInCents, priceToSliderIndex, sliderIndexToPrice } from '../src/lib/property-price-range'

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
  const fallback = { '/api/properties': [property], '/api/properties?search=Curitiba&operation=SALE': [{ ...property, title: 'Casa em Curitiba' }] }
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

test('os filtros normalizam BRL com vírgula, contagens e UF e preservam busca ao aplicar e limpar', () => {
  const raw = 'operation=SALE&type=HOUSE&type=APARTMENT&minPrice=000250000%2C1&maxPrice=10000000.00&bedrooms=3&bathrooms=4%2B&minUsableArea=85.5&city=+São+Paulo+&state=sp'
  const result = parseCatalogFilters(raw)
  assert.deepEqual(result, { success: true, filters: { operation: 'SALE', type: ['APARTMENT', 'HOUSE'], minPrice: '250000.10', maxPrice: '10000000.00', bedrooms: 3, bathrooms: '4+', minUsableArea: '85.50', city: 'São Paulo', state: 'SP' } })
  const url = new URL(buildCatalogFiltersUrl(getCatalogFilterValues(raw), 'search=jardim&operation=RENT&operation=SALE&sort=recent'), 'http://localhost')
  assert.equal(url.searchParams.get('search'), 'jardim')
  assert.equal(url.searchParams.getAll('operation').length, 1)
  assert.equal(url.searchParams.get('minPrice'), '250000.10')
  assert.equal(url.searchParams.get('state'), 'SP')
  assert.deepEqual(url.searchParams.getAll('type'), ['APARTMENT', 'HOUSE'])
  assert.equal(url.searchParams.get('sort'), 'recent')
  assert.equal(buildCatalogFiltersUrl(null, url.search.slice(1)), '/properties?search=jardim&sort=recent')
  assert.equal(buildCatalogFiltersUrl(null, 'operation=RENT'), '/properties')
  assert.deepEqual(parseCatalogFilters('city=+++&minPrice=&bedrooms='), { success: true, filters: {} })
})

test('filtros inválidos não disparam listagens e o formulário valida a faixa e limites', () => {
  for (const query of ['operation=BUY', 'type=FLAT', 'state=XX', 'minPrice=-1', 'maxPrice=1e3', 'minPrice=1.0000', 'minPrice=1.00,00', 'bedrooms=1.5', 'bathrooms=-1', 'bedrooms=2147483648', 'minPrice=1000000000000', 'minUsableArea=10000000000', 'minPrice=100.01&maxPrice=100', `city=${'a'.repeat(201)}`, 'operation=SALE&operation=RENT']) {
    assert.equal(parseCatalogFilters(query).success, false, query)
    const markup = renderToStaticMarkup(<SWRConfig value={{ provider: () => new Map(), fallback: { '/api/properties': [property] } }}><PropertyCatalog parameters={query} /></SWRConfig>)
    assert.match(markup, /role="alert"/)
    assert.doesNotMatch(markup, /<article|Carregando imóveis/)
  }
  assert.ok(catalogFiltersSchema.safeParse(getCatalogFilterValues('minPrice=0&maxPrice=0&bedrooms=4%2B')).success)
  for (const query of ['bedrooms=0', 'bedrooms=4', 'bedrooms=5', 'bathrooms=0', 'bathrooms=4', 'bathrooms=5', 'bathrooms=2147483647', 'minPrice=10000000.01', 'maxPrice=10000000.01', 'type=HOUSE&type=FLAT', Array(7).fill('type=HOUSE').join('&')]) assert.equal(parseCatalogFilters(query).success, false)
})

test('cada combinação tem chave SWR própria e a ordem dos parâmetros não muda o cache', () => {
  const first = parseCatalogFilters('operation=RENT&city=Recife&minPrice=2500&bedrooms=3&type=HOUSE&type=APARTMENT')
  const second = parseCatalogFilters('bedrooms=3&minPrice=02500.00&city=Recife&operation=RENT&type=APARTMENT&type=HOUSE&type=HOUSE')
  assert.ok(first.success && second.success)
  if (!first.success || !second.success) return
  const key = buildPublicPropertiesUrl('', first.filters)
  assert.equal(key, buildPublicPropertiesUrl('', second.filters))
  assert.equal(key, '/api/properties?bedrooms=3&city=Recife&minPrice=2500.00&operation=RENT&type=APARTMENT&type=HOUSE')
  const render = (parameters: string) => renderToStaticMarkup(<SWRConfig value={{ provider: () => new Map(), revalidateOnMount: false, fallback: { [key]: [property], '/api/properties': [{ ...property, title: 'Catálogo sem filtro' }] } }}><PropertyCatalog parameters={parameters} /></SWRConfig>)
  assert.match(render('operation=RENT&city=Recife&minPrice=2500&bedrooms=3&type=HOUSE&type=APARTMENT'), /1 imóvel encontrado/)
  assert.doesNotMatch(render('operation=SALE'), /<article|Catálogo sem filtro/)
})

test('o formulário GET preenche todos os filtros e preserva a busca ao limpar', async () => {
  const parameters = { search: 'jardim', operation: 'RENT', type: ['HOUSE', 'APARTMENT'], minPrice: '2500.10', maxPrice: '5000', bedrooms: '3', bathrooms: '2', minUsableArea: '85.50', neighborhood: 'Boa Viagem', city: 'Recife', state: 'PE' }
  const page = await PropertiesPage({ searchParams: Promise.resolve(parameters) })
  const markup = renderToStaticMarkup(<AppRouterContext.Provider value={router}><SWRConfig value={{ provider: () => new Map() }}>{page}</SWRConfig></AppRouterContext.Provider>)
  assert.match(markup, /<form(?=[^>]*aria-labelledby="catalog-filters-title")(?=[^>]*action="\/properties")(?=[^>]*method="get")/)
  assert.match(markup, /type="hidden" name="search" value="jardim"/)
  for (const name of Object.keys(parameters).filter((name) => !['search', 'type', 'bedrooms', 'bathrooms'].includes(name))) {
    assert.ok(markup.includes(`id="filter-${name}"`), name)
    assert.ok(markup.includes(`for="filter-${name}"`), name)
  }
  assert.match(markup, /value="RENT" selected=""/)
  assert.match(markup, /value="PE" selected=""/)
  assert.match(markup, /4 ou mais quartos/)
  assert.match(markup, /Faixa de preço mensal/)
  assert.match(markup, /aria-expanded="true" aria-controls="catalog-filter-sidebar"/)
  assert.match(markup, /<aside id="catalog-filter-sidebar" aria-label="Filtros de imóveis"/)
  assert.equal(markup.match(/type="checkbox"/g)?.length, 6)
  assert.equal(markup.match(/type="radio"/g)?.length, 10)
  assert.equal(markup.match(/type="range"/g)?.length, 2)
  assert.match(markup, /id="filter-type-HOUSE"[^>]*checked=""/)
  assert.match(markup, /id="filter-type-APARTMENT"[^>]*checked=""/)
  assert.match(markup, /id="filter-bedrooms-3"[^>]*checked=""/)
  assert.match(markup, /id="filter-bathrooms-2"[^>]*checked=""/)
  assert.match(markup, /4 ou mais banheiros/)
  assert.match(markup, /<input(?=[^>]*id="filter-minPrice-value")(?=[^>]*name="minPrice")(?=[^>]*type="text")(?=[^>]*inputMode="decimal")(?=[^>]*value="2.500,10")/)
  assert.match(markup, /<input(?=[^>]*id="filter-maxPrice-value")(?=[^>]*name="maxPrice")(?=[^>]*type="text")(?=[^>]*inputMode="decimal")(?=[^>]*value="5.000,00")/)
  assert.match(markup, /for="filter-minPrice-value"/)
  assert.match(markup, /for="filter-maxPrice-value"/)
  const priceForm = markup.match(/<form(?=[^>]*aria-labelledby="catalog-filters-title")[\s\S]*?<\/form>/)![0]
  assert.equal(priceForm.match(/name="minPrice"/g)?.length, 1)
  assert.equal(priceForm.match(/name="maxPrice"/g)?.length, 1)
  assert.doesNotMatch(priceForm, /Passos de|R\$ 50 até|R\$ 100 até|R\$ 500 até/)
  const fieldsInOrder = ['minUsableArea', 'state', 'city', 'neighborhood'].map((name) => markup.indexOf(`id="filter-${name}"`))
  assert.deepEqual(fieldsInOrder, [...fieldsInOrder].sort((first, second) => first - second))
  assert.match(markup, /href="\/properties\?search=jardim"/)
  assert.match(markup, /Limpar filtros/)
})

test('a barra usa limites fixos e preserva preços exatos de URLs anteriores dentro da faixa', () => {
  for (const price of ['0.01', '2500.10', '999999999999.99']) assert.equal(centsAsPrice(priceInCents(price)), price)
  assert.deepEqual(getPriceSliderValues('0.01', '8000.50'), { minimum: 0.01, maximum: 8000.5 })
  assert.deepEqual(getPriceSliderValues('', ''), { minimum: 0, maximum: 10_000_000 })
  assert.equal(sliderIndexToPrice(0), 0)
  assert.equal(sliderIndexToPrice(maximumPriceSliderIndex), 10_000_000)
})

test('os preços digitados aceitam BRL, milhar e centavos sem arredondar aos passos da barra', () => {
  for (const [input, expected] of [
    ['', ''], ['  ', ''], ['0', '0.00'], ['2500.1', '2500.10'], ['2500,10', '2500.10'], ['1.234', '1234.00'],
    ['1.234,56', '1234.56'], [' R$ 1.234,56 ', '1234.56'], ['10.000.000,00', '10000000.00'],
  ]) assert.equal(normalizePriceInput(input), expected, input)
  for (const input of ['-1', 'R$ -1', 'NaN', '1e3', '1,234', '1.00,00', '1.2345']) assert.equal(normalizePriceInput(input), null, input)
  assert.equal(formatPriceInput('1234.56'), '1.234,56')
  assert.equal(formatPriceInput('10000000'), '10.000.000,00')
  assert.equal(formatPriceInput(''), '')
  assert.equal(formatPriceInput('inválido'), 'inválido')
  assert.deepEqual(getPriceSliderValues('R$ 1.234,56', '9.876,54'), { minimum: 1234.56, maximum: 9876.54 })
  const values = getCatalogFilterValues('search=jardim&minPrice=1.234%2C56&maxPrice=9.876%2C54')
  const url = new URL(buildCatalogFiltersUrl(values, 'search=jardim'), 'http://localhost')
  assert.equal(url.searchParams.get('minPrice'), '1234.56')
  assert.equal(url.searchParams.get('maxPrice'), '9876.54')
  assert.equal(url.searchParams.get('search'), 'jardim')
  assert.equal(catalogFiltersSchema.safeParse({ ...values, minPrice: '9.000,00', maxPrice: '1.000,00' }).success, false)
  assert.equal(catalogFiltersSchema.safeParse({ ...values, maxPrice: '10.000.000,01' }).success, false)
})

test('todos os passos respeitam os incrementos e as transições de 10 mil, 100 mil e 1 milhão', () => {
  let previous = 0
  for (let index = 1; index <= maximumPriceSliderIndex; index++) {
    const price = sliderIndexToPrice(index)
    const increment = previous < 10_000 ? 50 : previous < 100_000 ? 100 : previous < 1_000_000 ? 500 : 1_000
    assert.equal(price - previous, increment, `passo ${index}`)
    assert.equal(priceToSliderIndex(price), index)
    previous = price
  }
  assert.equal(previous, 10_000_000)
})

test('as setas avançam e retrocedem um passo válido em cada limite, inclusive com preços antigos', () => {
  const cases: [number, -1 | 1, number][] = [
    [0, -1, 0], [0, 1, 50], [9950, 1, 10_000], [10_000, 1, 10_100], [10_000, -1, 9950], [10_100, -1, 10_000],
    [99_900, 1, 100_000], [100_000, 1, 100_500], [100_000, -1, 99_900], [100_500, -1, 100_000],
    [999_500, 1, 1_000_000], [1_000_000, 1, 1_001_000], [1_000_000, -1, 999_500], [1_001_000, -1, 1_000_000],
    [10_000_000, 1, 10_000_000], [10_000_000, -1, 9_999_000], [3220.72, 1, 3250], [3220.72, -1, 3200],
  ]
  for (const [price, direction, expected] of cases) assert.equal(sliderIndexToPrice(adjacentPriceSliderIndex(price, direction)), expected)
})

test('a combinação sem resultados orienta a ajustar os filtros', () => {
  const markup = renderToStaticMarkup(<PropertyCatalogResults properties={[]} status="ready" onRetry={() => {}} filtered />)
  assert.match(markup, /Nenhum imóvel encontrado com estes filtros/)
  assert.match(markup, /Ajuste ou limpe os filtros/)
  assert.doesNotMatch(markup, /<article/)
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
