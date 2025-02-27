const React = require('react')
const { renderToString } = require('react-dom/server')
const devalue = require('devalue')
const { Helmet } = require('react-helmet')
const { ContextProvider } = require('./context')

function createRenderFunction (createApp) {
  return async function render (req, url, options) {
    const { entry, hydration } = options
    const { App, router, context } = createApp({
      req,
      $payloadPath: () => `/-/data${req.routerPath}`,
      [hydration.global]: req[hydration.global],
      [hydration.payload]: req[hydration.payload],
      [hydration.data]: req[hydration.data],
      $api: req.api && req.api.client,
    })

    const app = App()
    const element = renderElement(req.url, app, context, router)
    const hydrationScript = getHydrationScript(req, context, hydration)

    return {
      entry: entry.client,
      hydration: hydrationScript,
      element,
      helmet: Helmet.renderStatic(),
    }
  }
}

module.exports = { createRenderFunction }

function getHydrationScript (req, context, hydration) {
  const globalData = req.$global
  const data = req.$data
  const payload = req.$payload
  const api = req.api ? req.api.meta : null

  let hydrationScript = ''

  if (globalData || data || payload || api) {
    hydrationScript += '<script>'
    if (globalData) {
      hydrationScript += `window[Symbol.for('kGlobal')] = ${devalue(globalData)}\n`
    }
    if (data) {
      hydrationScript += `window[Symbol.for('kData')] = ${devalue(data)}\n`
    }
    if (payload) {
      hydrationScript += `window[Symbol.for('kPayload')] = ${devalue(payload)}\n`
    }
    if (api) {
      hydrationScript += `window[Symbol.for('kAPI')] = ${devalue(api)}\n`
    }
    hydrationScript += '</script>'
  }

  return hydrationScript
}

function renderElement (url, app, context, router) {
  if (router) {
    return renderToString(
      React.createElement(router, {
        location: url,
      }, React.createElement(ContextProvider, {
        children: app,
        context,
      })),
    )
  } else {
    return renderToString(
      React.createElement(ContextProvider, { context, children: app }),
    )
  }
}
