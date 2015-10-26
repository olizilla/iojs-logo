const fs = require('fs')
const http = require('http')
const ecstatic = require('ecstatic')({ root: __dirname + '/public' })
const github = require('octonode')
const winston = require('winston')

winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, { timestamp: true })
if (!process.env.GH_KEY) winston.warn('No GH_KEY found in ENV. You may be throttled')

const client = github.client(process.env.GH_KEY)
const issue = client.issue('nodejs/evangelism', 179)
const isMarkdownImg = /!\[.*\]\((http.+)\)/g
const isHtmlImg = /<\s*img\s+.*src="(http.+)"/g
const excludedImages = []

var logos = []

init()

function init () {
  initServer()
  winston.info('Fetching logos from GitHub')
  getLogos(storeLogos)
  setInterval(function () {
    winston.debug('Checking for moar...')
    getLogos(storeLogos)
  }, 60000)
  function storeLogos (err, res) {
    if (err) return winston.error(err)
    // rebuild the list. Keep the first one, as it's not in the commments but the issue.
    logos = res
    fs.writeFile(__dirname + '/public/logos.json', JSON.stringify(logos))
  }
}

function initServer () {
  var port = process.env.PORT || 8080
  http.createServer(function (req, res) {
    winston.info(req.method, req.url, req.headers.referer, req.headers['user-agent'])
    ecstatic(req, res)
  }).listen(port)
  winston.info('Server ready, listening on :' + port)
}

function getLogos (done) { getLogosByPage(1, [], done) }

// pluck all the logos from all the comments on the issue
function getLogosByPage (page, logos, done) {
  page = page || 1
  issue.comments({ page: page, per_page: 100 }, function (err, comments) {
    if (err) return done(err, logos)
    if (!comments.length) return done(null, logos)
    var res = comments.map(extractLogos).reduce(flatten, [])
    winston.debug('Got ' + res.length + ' logos from page ' + page)
    logos = logos.concat(res)
    getLogosByPage(page + 1, logos, done)
  })
}

function flatten (a, b) { return a.concat(b) }

function extractLogos (comment) {
  var res = []
  pullImageUrlsFromMarkdown(comment.body).forEach(function (url) {
    res.push({
      url: url,
      comment: {
        body: comment.body,
        url: comment.html_url
      },
      user: {
        login: comment.user.login,
        avatar_url: comment.user.avatar_url,
        html_url: comment.user.html_url
      }
    })
  })
  return res
}

function pullImageUrlsFromMarkdown (md) {
  var mdImages = matchAll(md, isMarkdownImg)
  var htmlImages = matchAll(md, isHtmlImg)
  var urls = mdImages.concat(htmlImages)
  return urls.filter(notExcluded)
}

function notExcluded (url) {
  return excludedImages.indexOf(url) === -1
}

// SO! http://stackoverflow.com/questions/6323417/how-do-i-retrieve-all-matches-for-a-regular-expression-in-javascript
function matchAll (str, regex) {
  var res = []
  var m
  if (regex.global) {
    while (m = regex.exec(str)) {
      res.push(m[1])
    }
  } else {
    if (m = regex.exec(str)) {
      res.push(m[1])
    }
  }
  return res
}
