console.log('Hello!')

// Get dependencies
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as bodyParser from 'body-parser'

// Get our API routes
import * as api from './api'
import * as downloads from './downloads'

// bootstrap plugins
import { PluginProvider, registerPlugin } from './plugins'
import { PerformanceIntegration } from './types'

import { ClimbappPlugin } from './plugin-climbapp'
registerPlugin('climbapp', (perfint:PerformanceIntegration) => new ClimbappPlugin(perfint))

const app = express()

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Point static path to dist
app.use(express.static(path.join(__dirname, '..', '..', 'hub-app', 'dist')));

// Set our api routes
app.use('/api/1', api);
app.use('/downloads', downloads);

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'hub-app', 'dist', 'index.html'));
})

/**
 * Get port from environment and store in Express.
 */
const port = process.env.PORT || '8000'
app.set('port', port)

/**
 * Create HTTP server.
 */
const server = http.createServer(app)

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`))
