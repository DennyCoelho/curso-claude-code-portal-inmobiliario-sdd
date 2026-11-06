import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'

import PropertiesPage from '../src/app/properties/page'
import { PropertyCatalog } from '../src/components/properties/property-catalog'
import { PropertyCatalogResults } from '../src/components/properties/property-catalog-results'
import { fetchPublicProperties } from '../src/lib/api/properties'
import type { PropertyListItem } from '../src/lib/property'

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

test('a rota apresenta título e introdução em português enquanto aguarda a API', () => {
  const markup = renderToStaticMarkup(
    <SWRConfig value={{ provider: () => new Map() }}>
      <PropertiesPage />
    </SWRConfig>,
  )
  assert.match(markup, /<h1[^>]*>Imóveis<\/h1>/)
  assert.match(markup, /imóveis à venda e para alugar/)
  assert.match(markup, /Carregando imóveis…/)
  assert.doesNotMatch(markup, /catálogo.*disponível em breve/)
})
